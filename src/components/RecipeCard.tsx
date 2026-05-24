"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/lib/supabase/types";
import { useAddMealModal } from "@/components/AddMealModal";

function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function HeartWhiteFill() {
  return (
    <svg width="12" height="11" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <path fillRule="evenodd" clipRule="evenodd" d="M4.59878 0.0106455C5.71934 0.091842 6.88696 0.638082 8.00467 1.7436C9.1221 0.63839 10.2887 0.0931906 11.4082 0.0137997C12.6717 -0.075808 13.7887 0.434856 14.5969 1.24055C16.1857 2.82464 16.6847 5.69106 14.7131 7.66268C14.7065 7.66933 14.6996 7.67582 14.6926 7.68213L8.38827 13.3927C8.17055 13.5898 7.83878 13.5898 7.62107 13.3927L1.31667 7.68213C1.3097 7.67582 1.30289 7.66933 1.29624 7.66268C-0.685657 5.68078 -0.189367 2.81404 1.40473 1.23118C2.21486 0.426754 3.33412 -0.0809849 4.59878 0.0106455Z" fill="white"/>
    </svg>
  );
}

export default function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const router = useRouter();
  const { open: openAddMeal } = useAddMealModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
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
    await supabase.from("recipes").delete().eq("id", recipe.id);
    setShowModal(false);
    setDeleting(false);
    router.refresh();
  }

  async function handleToggleFavorite() {
    if (togglingFav) return;
    setTogglingFav(true);
    const next = !isFavorite;
    setIsFavorite(next);
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.from("recipes").update({ is_favorite: next }).eq("id", recipe.id);
    setTogglingFav(false);
  }

  function navigateToRecipe() {
    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <>
      {/*
        Outer card is `relative` but NOT `overflow-hidden` so the 3-dot dropdown
        can extend below the image area without being clipped.
      */}
      <div
        onClick={navigateToRecipe}
        className={`rounded-xl cursor-pointer group relative ${
          isFavorite
            ? "bg-[#f9f1eb] border border-[#b9732c]"
            : "bg-white"
        }`}
      >
        {/* Cover image — overflow-hidden + rounded-t-xl kept here for image clipping only */}
        <div className="relative h-[160px] bg-stone-100 overflow-hidden rounded-t-xl">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-stone-300">
              🍽️
            </div>
          )}

          {/* Favorite corner badge — inside image container so rounded corner clips it */}
          {isFavorite && (
            <div className="absolute top-0 left-0 pointer-events-none">
              <div
                className="w-0 h-0"
                style={{
                  borderTop: "56px solid #b9732c",
                  borderRight: "56px solid transparent",
                }}
              />
              <div className="absolute top-3 left-2.5">
                <HeartWhiteFill />
              </div>
            </div>
          )}
        </div>

        {/*
          3-dot menu is a sibling of the image container, positioned absolute
          over the card. This means the dropdown is NOT inside overflow-hidden
          and can extend into the card body without being clipped.
        */}
        <div
          ref={menuRef}
          className="absolute top-2 right-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-[28px] h-[28px] bg-white rounded flex items-center justify-center text-[#3e260f] text-xs font-bold leading-none"
            aria-label="Recipe options"
          >
            ···
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg py-1 z-20">
              <button
                onClick={handleToggleFavorite}
                className="w-full text-left px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
              >
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openAddMeal({ recipeId: recipe.id });
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
              >
                Add to Meal Plan
              </button>
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="block px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-[24px]">
          <h3 className="font-bold text-[#3e260f] text-base leading-tight line-clamp-2 mb-[24px]">
            {recipe.name}
          </h3>

          <div className={`grid grid-cols-2 gap-y-6 ${recipe.tags.length > 0 ? "mb-[24px]" : ""}`}>
            <div className="flex items-center gap-1.5 text-xs text-[#3e260f]">
              <img src="/icons/ingredients.svg" alt="" width={15} height={15} />
              <span>Ingredients: <span className="font-semibold">{recipe.ingredients.length}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#3e260f]">
              <img src="/icons/prep-time.svg" alt="" width={16} height={16} />
              <span>Prep Time: <span className="font-semibold">{formatTime(recipe.prep_time)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#3e260f]">
              <img src="/icons/cook-time.svg" alt="" width={15} height={14} />
              <span>Cook Time: <span className="font-semibold">{formatTime(recipe.cook_time)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#3e260f]">
              <img src="/icons/serves.svg" alt="" width={12} height={15} />
              <span>Serves: <span className="font-semibold">{recipe.servings ?? "—"}</span></span>
            </div>
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded text-xs text-[#905823] bg-[rgba(185,115,44,0.2)]"
                >
                  {tag.name}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-xs text-[#b9732c]">+{recipe.tags.length - 3}</span>
              )}
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
