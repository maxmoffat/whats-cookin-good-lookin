"use client";

import { createContext, useContext, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Context ────────────────────────────────────────────────────────────────

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useAddRecipeModal = () => useContext(Ctx);

// ─── Storage helper ─────────────────────────────────────────────────────────

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

// ─── Icons ──────────────────────────────────────────────────────────────────

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

// ─── Modal ───────────────────────────────────────────────────────────────────

type Mode = "photo" | "url";

function Modal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("photo");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid =
    mode === "photo"
      ? !!photo
      : url.trim().length > 0 && /^https?:\/\/.+/.test(url.trim());

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPhoto(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleExtract() {
    if (!isValid || extracting) return;
    setExtracting(true);
    setError(null);

    try {
      if (mode === "photo" && photo) {
        // Read file
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target!.result as string);
          reader.readAsDataURL(photo);
        });

        // Resize to stay under Claude's limit
        const resizedDataUrl = await new Promise<string>((resolve) => {
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

        const [header, base64] = resizedDataUrl.split(",");
        const mediaType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";

        const [res, imageUrl] = await Promise.all([
          fetch("/api/extract/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mediaType }),
          }),
          uploadBase64ToStorage(base64, mediaType),
        ]);

        if (!res.ok) {
          setError(
            "Something went wrong scanning the image. Check your API key and try again."
          );
          setExtracting(false);
          return;
        }

        const data = await res.json();
        if (data.error) {
          setError("Couldn't read that image as a recipe. Try a clearer photo.");
          setExtracting(false);
          return;
        }

        sessionStorage.setItem(
          "wcgl_prefill",
          JSON.stringify({ ...data, image_url: imageUrl ?? null })
        );
        onClose();
        router.push("/recipes/new");
      } else {
        // URL mode
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
            onClick={() => {
              setMode("photo");
              setError(null);
            }}
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
              Attach a cookbook photo, recipe card or screenshot below in JPG or
              PNG format
            </p>
          </button>

          {/* URL card */}
          <button
            onClick={() => {
              setMode("url");
              setError(null);
            }}
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
            <p className="text-sm text-[#3e260f]">Extracting recipe…</p>
          </div>
        ) : mode === "photo" ? (
          <label className="block cursor-pointer">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`h-[200px] rounded-[8px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                dragging
                  ? "border-[#b9732c] bg-[rgba(185,115,44,0.05)]"
                  : photo
                  ? "border-[#b9732c]"
                  : "border-[rgba(62,38,15,0.25)] hover:border-[rgba(62,38,15,0.4)]"
              }`}
            >
              {photo && photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    className="h-20 w-auto rounded object-contain"
                    alt="preview"
                  />
                  <p className="text-sm font-medium text-[#3e260f]">
                    {photo.name}
                  </p>
                  <p className="text-xs text-[rgba(62,38,15,0.5)]">
                    Click to change
                  </p>
                </>
              ) : (
                <>
                  <ImagePlaceholderIcon />
                  <p className="text-sm text-[#3e260f]">
                    Drag and drop your recipe photo here or{" "}
                    <span className="text-[#b9732c] underline underline-offset-2">
                      browse your computer
                    </span>
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </label>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#3e260f]">
              Paste Recipe URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) handleExtract();
              }}
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

// ─── Provider ────────────────────────────────────────────────────────────────

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
