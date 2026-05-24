"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAddMealModal } from "@/components/AddMealModal";

function HeartOutline() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <path d="M4.5625 0.509766C5.53977 0.580579 6.60119 1.05801 7.65332 2.09863L8.00488 2.44727L8.35645 2.09863C9.40814 1.05855 10.4678 0.581942 11.4434 0.512695C12.5434 0.434679 13.524 0.876775 14.2441 1.59473C15.6373 2.98388 16.0668 5.41741 14.5156 7.14453L14.3594 7.30957L14.3574 7.31152L8.05273 13.0225C8.02564 13.0468 7.98421 13.0467 7.95703 13.0225L1.65234 7.31152C1.65176 7.31099 1.65038 7.31053 1.64941 7.30957C-0.0958561 5.5643 0.315591 3.0171 1.75684 1.58594C2.47843 0.869426 3.46075 0.429976 4.5625 0.509766Z" stroke="#B9732C"/>
    </svg>
  );
}


export default function RecipeActions({
  recipeId,
  initialIsFavorite,
}: {
  recipeId: string;
  initialIsFavorite: boolean;
}) {
  const router = useRouter();
  const { open: openAddMeal } = useAddMealModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [togglingFav, setTogglingFav] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipeId);
    router.push("/recipes");
    router.refresh();
  }

  async function handleToggleFavorite() {
    if (togglingFav) return;
    setTogglingFav(true);
    const next = !isFavorite;
    setIsFavorite(next);
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.from("recipes").update({ is_favorite: next }).eq("id", recipeId);
    setTogglingFav(false);
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFav}
          className={`flex items-center gap-2 h-10 px-4 rounded-[6.667px] border border-[#b9732c] text-[#b9732c] text-sm transition-colors disabled:opacity-50 whitespace-nowrap ${
            isFavorite
              ? "bg-[rgba(185,115,44,0.15)] hover:bg-[rgba(185,115,44,0.22)]"
              : "bg-transparent hover:bg-[rgba(185,115,44,0.05)]"
          }`}
        >
          <HeartOutline />
          {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        </button>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-10 h-10 rounded-[6.667px] border border-[#3e260f] flex items-center justify-center hover:bg-[rgba(62,38,15,0.05)] transition-colors"
            aria-label="Recipe options"
          >
            <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
              <circle cx="2" cy="2" r="1.5" fill="#3e260f" />
              <circle cx="8" cy="2" r="1.5" fill="#3e260f" />
              <circle cx="14" cy="2" r="1.5" fill="#3e260f" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg z-20 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openAddMeal({ recipeId });
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
              >
                Add to Meal Plan
              </button>
              <Link
                href={`/recipes/${recipeId}/edit`}
                className="block px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Edit
              </Link>
              <button
                onClick={() => { setMenuOpen(false); setShowModal(true); }}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !deleting && setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#3e260f] mb-2">Delete recipe?</h2>
            <p className="text-sm text-[rgba(62,38,15,0.5)] mb-6">
              This can&apos;t be undone. The recipe will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#3e260f] border border-[rgba(62,38,15,0.2)] hover:border-[#3e260f] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
