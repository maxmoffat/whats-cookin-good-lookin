"use client";

import { createContext, useContext, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5;

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useAddRecipeModal = () => useContext(Ctx);

// ─── Storage helper ──────────────────────────────────────────────────────────

async function uploadBase64ToStorage(
  base64: string,
  mediaType: string
): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++)
      bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mediaType });
    const ext = mediaType === "image/png" ? "png" : "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(path, blob);
    if (error) return null;
    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─── Image processing helpers ─────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function CameraIcon() {
  return <img src="/icons/upload-photo.svg" alt="" width={25} height={25} />;
}

function LinkIcon() {
  return <img src="/icons/paste-url.svg" alt="" width={21} height={21} />;
}

function ImagePlaceholderIcon() {
  return (
    <svg width="29" height="24" viewBox="0 0 29 24" fill="none">
      <rect x="1" y="1" width="27" height="22" rx="3" stroke="#b9732c" strokeWidth="1.5" />
      <circle cx="9" cy="8" r="2.5" stroke="#b9732c" strokeWidth="1.5" />
      <path
        d="M1 16L8 10L13 15L18 11L28 18"
        stroke="#b9732c"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type Mode = "photo" | "url";

function Modal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("photo");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const isValid =
    mode === "photo"
      ? photos.length > 0
      : url.trim().length > 0 && /^https?:\/\/.+/.test(url.trim());

  // ─── Photo management ───────────────────────────────────────────────────────

  function addPhotos(incoming: FileList | File[]) {
    const validFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    if (validFiles.length === 0) return;

    setPhotos((prev) => {
      const slots = MAX_PHOTOS - prev.length;
      if (slots <= 0) return prev;
      const toAdd = validFiles.slice(0, slots);
      const startIdx = prev.length;

      toAdd.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((p) => {
            const next = [...p];
            next[startIdx + i] = e.target?.result as string;
            return next;
          });
        };
        reader.readAsDataURL(file);
      });

      setError(null);
      return [...prev, ...toAdd];
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (photos.length >= MAX_PHOTOS) return;
    addPhotos(e.dataTransfer.files);
  }

  // ─── Extraction ─────────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!isValid || extracting) return;
    setExtracting(true);
    setError(null);

    try {
      if (mode === "photo" && photos.length > 0) {
        // 1. Resize all photos in parallel
        const processedImages = await Promise.all(
          photos.map(async (photo) => {
            const dataUrl = await readFileAsDataUrl(photo);
            const resized = await resizeImageDataUrl(dataUrl);
            const [header, base64] = resized.split(",");
            const mediaType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
            return { base64, mediaType };
          })
        );

        // 2. Extract recipe + upload all images in parallel
        const [res, ...imageUrls] = await Promise.all([
          fetch("/api/extract/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: processedImages }),
          }),
          ...processedImages.map((img) =>
            uploadBase64ToStorage(img.base64, img.mediaType)
          ),
        ]);

        if (!res.ok) {
          setError(
            "Something went wrong scanning the images. Check your API key and try again."
          );
          setExtracting(false);
          return;
        }

        const data = await res.json();
        if (data.error) {
          setError(
            "Couldn't read those images as a recipe. Try clearer or higher-contrast photos."
          );
          setExtracting(false);
          return;
        }

        // 3. Use Claude's chosen cover image, falling back to first
        const coverIdx =
          typeof data.cover_image_index === "number" &&
          data.cover_image_index >= 0 &&
          data.cover_image_index < imageUrls.length
            ? data.cover_image_index
            : 0;

        sessionStorage.setItem(
          "wcgl_prefill",
          JSON.stringify({ ...data, image_url: imageUrls[coverIdx] ?? null })
        );
        onClose();
        router.push("/recipes/new");
      } else {
        // URL mode (unchanged)
        const res = await fetch("/api/extract/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          if (data.error === "fetch_failed") {
            setError(
              "Couldn't reach that page. It may be paywalled or blocking automated requests."
            );
          } else if (data.error === "ai_failed") {
            setError(
              "Something went wrong calling the AI. Check your API key and try again."
            );
          } else {
            setError(
              "Couldn't extract a recipe from that page. Try a different URL."
            );
          }
          setExtracting(false);
          return;
        }

        sessionStorage.setItem(
          "wcgl_prefill",
          JSON.stringify({
            ...data,
            source_url: url.trim(),
            image_url: data.image_url ?? null,
          })
        );
        onClose();
        router.push("/recipes/new");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setExtracting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => !extracting && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[24px] w-full max-w-[953px] p-[50px] shadow-2xl">
        {/* Close */}
        <button
          onClick={() => !extracting && onClose()}
          disabled={extracting}
          aria-label="Close"
          className="absolute top-[30px] right-[30px] w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity disabled:pointer-events-none"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="#3e260f"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[24px] font-bold text-[#3e260f] mb-2">
            Add a recipe
          </h2>
          <p className="text-base text-[#3e260f]">
            Get started by uploading a photo or adding a URL for a recipe!
          </p>
        </div>

        {/* Card selectors */}
        <div className="grid grid-cols-2 gap-5 mb-8">
          {/* Photo card */}
          <button
            onClick={() => { setMode("photo"); setError(null); }}
            className={`text-left rounded-[8px] px-6 py-5 border transition-colors ${
              mode === "photo"
                ? "bg-[rgba(185,115,44,0.1)] border-[#b9732c]"
                : "bg-white border-[rgba(62,38,15,0.1)] hover:border-[rgba(62,38,15,0.3)]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <CameraIcon />
              <span className="text-base font-bold text-[#3e260f]">
                Upload Photo
              </span>
            </div>
            <p className="text-xs text-[#3e260f] leading-[20px] max-w-[310px]">
              Upload up to 5 cookbook pages, recipe cards or screenshots in JPG,
              PNG or WEBP format
            </p>
          </button>

          {/* URL card */}
          <button
            onClick={() => { setMode("url"); setError(null); }}
            className={`text-left rounded-[8px] px-6 py-5 border transition-colors ${
              mode === "url"
                ? "bg-[rgba(185,115,44,0.1)] border-[#b9732c]"
                : "bg-white border-[rgba(62,38,15,0.1)] hover:border-[rgba(62,38,15,0.3)]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon />
              <span className="text-base font-bold text-[#3e260f]">
                Paste Recipe URL
              </span>
            </div>
            <p className="text-xs text-[#3e260f] leading-[20px] max-w-[310px]">
              Works best on AllRecipes, Serious Eats, NYT Cooking (public), and
              most recipe blogs
            </p>
          </button>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(62,38,15,0.1)] mb-8" />

        {/* Content area */}
        {extracting ? (
          <div className="h-[200px] rounded-[8px] border border-[rgba(62,38,15,0.1)] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-[3px] border-[#b9732c] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#3e260f]">
              Extracting recipe{photos.length > 1 ? " from all pages" : ""}…
            </p>
          </div>
        ) : mode === "photo" ? (
          <div>
            {photos.length === 0 ? (
              /* ── Empty drop zone ── */
              <label className="block cursor-pointer">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`h-[200px] rounded-[8px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                    dragging
                      ? "border-[#b9732c] bg-[rgba(185,115,44,0.05)]"
                      : "border-[rgba(62,38,15,0.25)] hover:border-[rgba(62,38,15,0.4)]"
                  }`}
                >
                  <ImagePlaceholderIcon />
                  <p className="text-sm text-[#3e260f] text-center">
                    Drag and drop your recipe photos here or{" "}
                    <span className="text-[#b9732c] underline underline-offset-2">
                      browse your computer
                    </span>
                  </p>
                  <p className="text-xs text-[rgba(62,38,15,0.4)]">
                    Up to {MAX_PHOTOS} photos — JPG, PNG, WEBP
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files) addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              /* ── Thumbnail grid ── */
              <div
                onDragOver={(e) => {
                  if (photos.length < MAX_PHOTOS) { e.preventDefault(); setDragging(true); }
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-[8px] border-2 border-dashed p-4 transition-colors ${
                  dragging && photos.length < MAX_PHOTOS
                    ? "border-[#b9732c] bg-[rgba(185,115,44,0.05)]"
                    : "border-[rgba(62,38,15,0.15)]"
                }`}
              >
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((photo, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] group/thumb rounded-[6px] overflow-hidden bg-[rgba(62,38,15,0.04)]"
                    >
                      {previews[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[i]}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-[#b9732c] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                          <path d="M1 1l5 5M6 1L1 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>

                      {/* Page label */}
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded leading-none">
                        {i + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more slot */}
                  {photos.length < MAX_PHOTOS && (
                    <label className="aspect-[4/3] rounded-[6px] border-2 border-dashed border-[rgba(62,38,15,0.2)] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#b9732c] hover:bg-[rgba(185,115,44,0.04)] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v14M1 8h14" stroke="#b9732c" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="text-[10px] text-[rgba(62,38,15,0.5)]">Add</span>
                      <input
                        ref={addMoreInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files) addPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>

                <p className="text-xs text-[rgba(62,38,15,0.4)] mt-3">
                  {photos.length}/{MAX_PHOTOS} photo{photos.length !== 1 ? "s" : ""}
                  {photos.length < MAX_PHOTOS
                    ? " — drag more here or click + to add"
                    : " — maximum reached"}
                  {photos.length > 1 ? " · Best photo automatically selected as cover" : ""}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── URL mode ── */
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#3e260f]">
              Paste Recipe URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleExtract(); }}
              placeholder="https://www.example-recipe.com/grilled-chicken-salad"
              className="w-full h-10 rounded-[8px] border border-[rgba(62,38,15,0.2)] bg-white px-4 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.3)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
            />
            <p className="text-xs text-[rgba(62,38,15,0.5)] pt-1 leading-[20px]">
              Note: URL extraction works best on public websites and most recipe
              blogs. Pay-walled or ad-heavy sites may not work or extract
              correctly.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleExtract}
            disabled={!isValid || extracting}
            className="h-10 px-8 rounded-[8px] bg-[#b9732c] text-white text-base font-bold transition-opacity"
            style={{ opacity: !isValid || extracting ? 0.25 : 1 }}
          >
            Extract Recipe
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AddRecipeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
    </Ctx.Provider>
  );
}
