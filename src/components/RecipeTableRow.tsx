"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/lib/supabase/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HeartFillPrimary() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" className="flex-shrink-0">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.59878 0.0106455C5.71934 0.091842 6.88696 0.638082 8.00467 1.7436C9.1221 0.63839 10.2887 0.0931906 11.4082 0.0137997C12.6717 -0.075808 13.7887 0.434856 14.5969 1.24055C16.1857 2.82464 16.6847 5.69106 14.7131 7.66268C14.7065 7.66933 14.6996 7.67582 14.6926 7.68213L8.38827 13.3927C8.17055 13.5898 7.83878 13.5898 7.62107 13.3927L1.31667 7.68213C1.3097 7.67582 1.30289 7.66933 1.29624 7.66268C-0.685657 5.68078 -0.189367 2.81404 1.40473 1.23118C2.21486 0.426754 3.33412 -0.0809849 4.59878 0.0106455Z"
        fill="#B9732C"
      />
    </svg>
  );
}

// ─── Tooltips (portal-rendered so they escape table overflow) ─────────────────

type TooltipPos = { top: number; left: number };

function computePos(
  anchorEl: HTMLElement,
  tooltipW: number,
  tooltipH: number
): TooltipPos {
  const rect = anchorEl.getBoundingClientRect();
  const MARGIN = 8;
  const spaceBelow = window.innerHeight - rect.bottom;
  const top =
    spaceBelow > tooltipH + MARGIN
      ? rect.bottom + MARGIN
      : rect.top - tooltipH - MARGIN;
  let left = rect.left;
  if (left + tooltipW > window.innerWidth - 16) {
    left = window.innerWidth - tooltipW - 16;
  }
  return { top, left };
}

function ImageTooltip({
  imageUrl,
  visible,
  anchorEl,
}: {
  imageUrl: string | null;
  visible: boolean;
  anchorEl: HTMLElement | null;
}) {
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible && anchorEl && imageUrl) {
      setPos(computePos(anchorEl, 220, 160));
    } else {
      setPos(null);
    }
  }, [visible, anchorEl, imageUrl]);

  if (!mounted || !visible || !pos || !imageUrl) return null;

  return createPortal(
    <div
      className="fixed z-[200] w-[220px] rounded-xl overflow-hidden shadow-xl border border-[rgba(62,38,15,0.1)] pointer-events-none"
      style={{ top: pos.top, left: pos.left }}
    >
      <img src={imageUrl} alt="" className="w-full h-[150px] object-cover" />
    </div>,
    document.body
  );
}

function IngredientsTooltip({
  ingredients,
  visible,
  anchorEl,
}: {
  ingredients: Array<{ name: string }>;
  visible: boolean;
  anchorEl: HTMLElement | null;
}) {
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const display = ingredients.slice(0, 12);
  const extra = ingredients.length - display.length;

  useEffect(() => {
    if (visible && anchorEl && ingredients.length > 0) {
      const h = display.length * 22 + 20 + (extra > 0 ? 20 : 0);
      setPos(computePos(anchorEl, 200, h));
    } else {
      setPos(null);
    }
  }, [visible, anchorEl, ingredients.length, display.length, extra]);

  if (!mounted || !visible || !pos || ingredients.length === 0) return null;

  return createPortal(
    <div
      className="fixed z-[200] w-[200px] bg-white rounded-xl shadow-xl border border-[rgba(62,38,15,0.1)] px-3 py-2.5 pointer-events-none"
      style={{ top: pos.top, left: pos.left }}
    >
      <ul className="space-y-1.5">
        {display.map((ing, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-[#3e260f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b9732c] flex-shrink-0" />
            {ing.name}
          </li>
        ))}
        {extra > 0 && (
          <li className="text-xs text-[rgba(62,38,15,0.4)] pl-3.5">
            +{extra} more
          </li>
        )}
      </ul>
    </div>,
    document.body
  );
}

// ─── Row 3-dot menu ──────────────────────────────────────────────────────────

function RowMenu({
  recipeId,
  isFavorite,
  onToggleFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipeId);
    setShowModal(false);
    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <div
        ref={menuRef}
        className="relative flex justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-7 h-7 flex items-center justify-center rounded text-[#3e260f] text-xs font-bold hover:bg-[rgba(62,38,15,0.08)] transition-colors"
          aria-label="Recipe options"
        >
          ···
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg py-1 z-30">
            <button
              onClick={() => {
                onToggleFavorite();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
            >
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
            <Link
              href={`/recipes/${recipeId}/edit`}
              className="block px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
              onClick={() => setOpen(false)}
            >
              Edit
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                setShowModal(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !deleting && setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#3e260f] mb-2">
              Delete recipe?
            </h2>
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

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RecipeTableRow({
  recipe,
}: {
  recipe: RecipeWithDetails;
}) {
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
  const [togglingFav, setTogglingFav] = useState(false);
  const [showImageTip, setShowImageTip] = useState(false);
  const [showIngTip, setShowIngTip] = useState(false);
  const nameRef = useRef<HTMLAnchorElement>(null);
  const ingRef = useRef<HTMLSpanElement>(null);

  async function handleToggleFavorite() {
    if (togglingFav) return;
    setTogglingFav(true);
    const next = !isFavorite;
    setIsFavorite(next);
    const supabase = createClient();
    await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipe.id);
    setTogglingFav(false);
  }

  return (
    <>
      <tr
        className={`border-t border-[rgba(34,34,34,0.08)] transition-colors ${
          isFavorite ? "bg-[#f9f1eb]" : "hover:bg-[rgba(62,38,15,0.02)]"
        }`}
      >
        {/* Favorite heart */}
        <td className="w-12 py-5">
          <div className="flex items-center justify-center h-full">
            {isFavorite && <HeartFillPrimary />}
          </div>
        </td>

        {/* Recipe name — hover shows cover image tooltip */}
        <td className="py-5 pr-6">
          <Link
            ref={nameRef}
            href={`/recipes/${recipe.id}`}
            className="font-bold text-[#b9732c] underline underline-offset-2 text-sm leading-snug hover:opacity-70 transition-opacity"
            onMouseEnter={() => setShowImageTip(true)}
            onMouseLeave={() => setShowImageTip(false)}
          >
            {recipe.name}
          </Link>
        </td>

        {/* Ingredients count — hover shows ingredient list tooltip */}
        <td className="py-5 pr-6 text-sm text-[#222]">
          <span
            ref={ingRef}
            className="cursor-default"
            onMouseEnter={() => setShowIngTip(true)}
            onMouseLeave={() => setShowIngTip(false)}
          >
            {recipe.ingredients.length}
          </span>
        </td>

        {/* Prep time */}
        <td className="py-5 pr-6 text-sm text-[#222]">
          {formatTime(recipe.prep_time)}
        </td>

        {/* Cook time */}
        <td className="py-5 pr-6 text-sm text-[#222]">
          {formatTime(recipe.cook_time)}
        </td>

        {/* Serves */}
        <td className="py-5 pr-6 text-sm text-[#222]">
          {recipe.servings ?? "—"}
        </td>

        {/* Tags */}
        <td className="py-5 pr-4">
          {recipe.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded text-xs text-[#905823] bg-[rgba(185,115,44,0.2)] whitespace-nowrap"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-[rgba(62,38,15,0.35)]">—</span>
          )}
        </td>

        {/* 3-dot menu */}
        <td className="py-5 pl-2 pr-4 w-10">
          <RowMenu
            recipeId={recipe.id}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
          />
        </td>
      </tr>

      {/* Portal tooltips — escape the table DOM so they can render above everything */}
      <ImageTooltip
        imageUrl={recipe.image_url}
        visible={showImageTip}
        anchorEl={nameRef.current}
      />
      <IngredientsTooltip
        ingredients={recipe.ingredients}
        visible={showIngTip}
        anchorEl={ingRef.current}
      />
    </>
  );
}
