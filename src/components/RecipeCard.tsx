"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/lib/supabase/types";

function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  function navigateToRecipe() {
    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <>
      <div
        onClick={navigateToRecipe}
        className="rounded-xl bg-white overflow-hidden cursor-pointer group"
      >
        {/* Cover image */}
        <div className="relative h-[160px] bg-stone-100 overflow-hidden">
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

          {/* Three-dot menu */}
          <div
            ref={menuRef}
            className="absolute top-2 right-2 z-10"
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
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg py-1 z-20">
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
        </div>

        {/* Card body */}
        <div className="p-[24px]">
          {/* Title */}
          <h3 className="font-bold text-[#3e260f] text-base leading-tight line-clamp-2 mb-[24px]">
            {recipe.name}
          </h3>

          {/* Details */}
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

          {/* Tags */}
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
