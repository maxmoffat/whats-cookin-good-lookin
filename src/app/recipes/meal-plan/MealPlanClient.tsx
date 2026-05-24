"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddMealModal, MEAL_COLOR_OPTIONS } from "@/components/AddMealModal";
import type { MealPlanWithRecipe, MealTime } from "@/lib/supabase/types";

// ─── Date utilities ───────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isPast(date: Date): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const s = `Mon, ${SHORT_MONTHS[weekStart.getMonth()]} ${ordinal(weekStart.getDate())}`;
  const e = `Sun, ${SHORT_MONTHS[weekEnd.getMonth()]} ${ordinal(weekEnd.getDate())}`;
  return `${s} – ${e}`;
}

function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Tooltip recipe data type ─────────────────────────────────────────────────

type TooltipRecipe = {
  name: string;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  ingredients: { id: string }[];
  tags: { id: string; name: string }[];
};

// ─── Meal card tooltip (portal) ───────────────────────────────────────────────

function MealCardTooltip({
  entry,
  anchorRect,
  onEdit,
  onRemove,
  onClose,
}: {
  entry: MealPlanWithRecipe;
  anchorRect: DOMRect;
  onEdit: (entry: MealPlanWithRecipe) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<TooltipRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const TOOLTIP_W = 400;
  const TOOLTIP_H = 360;
  const GAP = 10;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  // Prefer right of card, fall back to left
  let x = anchorRect.right + GAP;
  if (x + TOOLTIP_W > vw - 8) {
    x = anchorRect.left - TOOLTIP_W - GAP;
  }
  x = Math.max(8, x);

  // Align top with card, clamp to viewport
  let y = anchorRect.top;
  if (y + TOOLTIP_H > vh - 8) {
    y = vh - TOOLTIP_H - 8;
  }
  y = Math.max(8, y);

  const isCustom = !entry.recipe_id;

  // Only fetch details for saved recipes
  useEffect(() => {
    if (isCustom) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("name, prep_time, cook_time, servings, ingredients(id), tags(id, name)")
      .eq("id", entry.recipe_id!)
      .single()
      .then(({ data }) => {
        setRecipe(data as TooltipRecipe | null);
        setLoading(false);
      });
  }, [entry.recipe_id, isCustom]);

  // Close on outside click — delay so the opening click doesn't immediately close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[200] bg-white rounded-[24px] border border-[rgba(62,38,15,0.1)] shadow-[0px_4px_24px_0px_rgba(12,12,13,0.1)] p-6 w-[400px]"
      style={{ left: x, top: y }}
    >
      {/* Shared action icons — shown in all states except loading */}
      {!loading && (
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[16px] font-bold text-[#3e260f] leading-snug pr-3 flex-1">
            {isCustom
              ? (entry.custom_recipe_name ?? "Custom recipe")
              : (recipe?.name ?? entry.recipes?.name ?? "")}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              onClick={() => { onClose(); onEdit(entry); }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(62,38,15,0.06)] transition-colors"
              aria-label="Edit meal"
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path
                  d="M10.4735 2.47346L11.8872 1.05962C12.6335 0.313459 13.8432 0.313459 14.5894 1.05962L15.9404 2.41068C16.6865 3.15677 16.6865 4.36656 15.9404 5.11272L14.5266 6.52656M10.4735 2.47346L1.28732 11.6596C0.970088 11.9768 0.774559 12.3955 0.735053 12.8425L0.503798 15.4605C0.451469 16.0528 0.947185 16.5485 1.53948 16.4962L4.15748 16.2649C4.60442 16.2254 5.0232 16.0299 5.34043 15.7128L14.5266 6.52656M10.4735 2.47346L14.5266 6.52656"
                  stroke="#3E260F"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() => { onClose(); onRemove(entry.id); }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
              aria-label="Remove meal"
            >
              <svg width="15" height="18" viewBox="0 0 15 18" fill="none">
                <path
                  d="M13.0375 6.0375L12.2535 13.8756C12.135 15.0638 12.0762 15.6574 11.8055 16.1063C11.5681 16.5015 11.219 16.8175 10.8022 17.0144C10.329 17.2375 9.7335 17.2375 8.53883 17.2375H6.33617C5.14243 17.2375 4.54603 17.2375 4.07283 17.0135C3.65568 16.8167 3.30621 16.5007 3.06857 16.1054C2.79977 15.6574 2.74003 15.0638 2.62057 13.8756L1.8375 6.0375M8.8375 12.1042V7.4375M6.0375 12.1042V7.4375M0.4375 3.70417H4.74483M4.74483 3.70417L5.1051 1.2103C5.20963 0.7567 5.5867 0.4375 6.01977 0.4375H8.85523C9.2883 0.4375 9.66443 0.7567 9.7699 1.2103L10.1302 3.70417M4.74483 3.70417H10.1302M10.1302 3.70417H14.4375"
                  stroke="#D11A1A"
                  strokeWidth="0.875"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-[160px]">
          <div className="w-8 h-8 border-2 border-[rgba(62,38,15,0.08)] border-t-[#b9732c] rounded-full animate-spin" />
        </div>
      ) : isCustom ? (
        /* Manually-added recipe — no details or View Recipe */
        <p className="text-[14px] text-[rgba(62,38,15,0.5)] mt-2">
          Manually added recipe
        </p>
      ) : recipe ? (
        <>
          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded text-[12px] text-[#905823] bg-[rgba(185,115,44,0.2)]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-col gap-[14px] mb-6">
            <div className="flex items-center gap-2.5 text-[12px] text-[#3e260f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ingredients.svg" alt="" width={15} height={15} className="flex-shrink-0" />
              <span>Ingredients: <span className="font-semibold">{recipe.ingredients.length}</span></span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-[#3e260f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/prep-time.svg" alt="" width={16} height={16} className="flex-shrink-0" />
              <span>Prep Time: <span className="font-semibold">{formatTime(recipe.prep_time)}</span></span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-[#3e260f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/cook-time.svg" alt="" width={15} height={14} className="flex-shrink-0" />
              <span>Cook Time: <span className="font-semibold">{formatTime(recipe.cook_time)}</span></span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-[#3e260f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/serves.svg" alt="" width={12} height={15} className="flex-shrink-0" />
              <span>Serves: <span className="font-semibold">{recipe.servings ?? "—"}</span></span>
            </div>
          </div>

          {/* View Recipe button */}
          <button
            onClick={() => router.push(`/recipes/${entry.recipe_id}`)}
            className="w-full h-[40px] rounded-[8px] border border-[#b9732c] text-[#b9732c] text-[16px] flex items-center justify-center gap-2 hover:bg-[rgba(185,115,44,0.05)] transition-colors"
          >
            View Recipe
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 5h14M10 1l5 4-5 4" stroke="#b9732c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      ) : (
        <p className="text-sm text-[rgba(62,38,15,0.4)] text-center py-8">
          Failed to load recipe details.
        </p>
      )}
    </div>,
    document.body
  );
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({
  entry,
  past,
  onOpenTooltip,
}: {
  entry: MealPlanWithRecipe;
  past: boolean;
  onOpenTooltip: (entry: MealPlanWithRecipe, rect: DOMRect) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const colorOpt =
    MEAL_COLOR_OPTIONS.find((c) => c.value === (entry.color ?? "green")) ??
    MEAL_COLOR_OPTIONS[0];

  function handleOpen() {
    if (cardRef.current) {
      onOpenTooltip(entry, cardRef.current.getBoundingClientRect());
    }
  }

  return (
    <div className={past ? "opacity-25" : ""}>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="rounded-[8px] px-[12px] py-[8px] transition-colors cursor-pointer"
        style={{ backgroundColor: hovered ? colorOpt.bgHover : colorOpt.bg }}
      >
        <p className="text-[10px] text-black leading-[16px] break-words">
          {entry.custom_recipe_name ?? entry.recipes?.name ?? "Unknown recipe"}
        </p>
      </div>
    </div>
  );
}

// ─── Meal section ─────────────────────────────────────────────────────────────

function MealSection({
  mealTime,
  weekDays,
  entries,
  onOpenTooltip,
}: {
  mealTime: MealTime;
  weekDays: Date[];
  entries: MealPlanWithRecipe[];
  onOpenTooltip: (entry: MealPlanWithRecipe, rect: DOMRect) => void;
}) {
  return (
    <div
      className="grid border-t border-[rgba(62,38,15,0.1)]"
      style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
    >
      {/* Rotated label */}
      <div className="flex items-center justify-center py-6">
        <span
          className="text-[10px] font-normal tracking-[1px] text-[rgba(62,38,15,0.5)] select-none"
          style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
        >
          {mealTime.toUpperCase()}
        </span>
      </div>

      {/* Day cells */}
      {weekDays.map((day, i) => {
        const key = toDateKey(day);
        const dayEntries = entries.filter((e) => e.date === key);
        const past = isPast(day);

        return (
          <div
            key={i}
            className="border-l border-[rgba(62,38,15,0.1)] p-[8px] min-h-[120px] flex flex-col gap-[4px]"
          >
            {dayEntries.map((entry) => (
              <MealCard
                key={entry.id}
                entry={entry}
                past={past}
                onOpenTooltip={onOpenTooltip}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main calendar component ──────────────────────────────────────────────────

export default function MealPlanClient() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<MealPlanWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MealPlanWithRecipe | null>(null);

  // Tooltip state — one at a time
  const [tooltipEntry, setTooltipEntry] = useState<MealPlanWithRecipe | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);

  const today = new Date();
  const weekStart = getWeekStart(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7)
  );
  const weekDays = getWeekDays(weekStart);
  const weekLabel = formatWeekLabel(weekStart);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const start = toDateKey(weekDays[0]);
    const end = toDateKey(weekDays[6]);
    const { data } = await supabase
      .from("meal_plan")
      .select("*, recipes(id, name)")
      .gte("date", start)
      .lte("date", end)
      .order("created_at");
    setEntries((data as MealPlanWithRecipe[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("meal_plan").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEditOpen(entry: MealPlanWithRecipe) {
    setEditEntry(entry);
    setEditModalOpen(true);
  }

  function handleOpenTooltip(entry: MealPlanWithRecipe, rect: DOMRect) {
    // Toggle off if clicking the same card again
    if (tooltipEntry?.id === entry.id) {
      setTooltipEntry(null);
      setTooltipRect(null);
    } else {
      setTooltipEntry(entry);
      setTooltipRect(rect);
    }
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-[32px] font-bold text-[#3e260f] leading-tight">
          Meal Plan Calendar
        </h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="h-[32px] px-4 rounded-[8px] border border-[#b9732c] text-[#b9732c] text-[14px] font-semibold hover:bg-[rgba(185,115,44,0.05)] transition-colors flex-shrink-0"
        >
          + Add Meal
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(62,38,15,0.08)] transition-colors"
            aria-label="Previous week"
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M6 1L1 6l5 5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(62,38,15,0.08)] transition-colors"
            aria-label="Next week"
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1l5 5-5 5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <span className="text-[16px] font-bold text-[#3e260f]">{weekLabel}</span>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="h-[24px] px-3 rounded-[6px] border border-[#b9732c] text-[#b9732c] text-[12px] font-semibold hover:bg-[rgba(185,115,44,0.05)] transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div
        className={`bg-white rounded-[8px] border border-[rgba(62,38,15,0.1)] overflow-hidden transition-opacity ${
          loading ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Day headers */}
        <div
          className="grid"
          style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
        >
          <div />
          {weekDays.map((day, i) => {
            const today_ = isToday(day);
            return (
              <div
                key={i}
                className="border-l border-[rgba(62,38,15,0.1)] py-4 flex flex-col items-center gap-[6px]"
              >
                <span className="text-[12px] text-[#3e260f] font-normal">
                  {DAY_NAMES[i]}
                </span>
                <div
                  className={`w-[28px] h-[28px] rounded-full flex items-center justify-center ${
                    today_ ? "bg-[#b9732c]" : ""
                  }`}
                >
                  <span
                    className={`text-[16px] font-bold leading-none ${
                      today_ ? "text-white" : "text-[#3e260f]"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meal sections */}
        {MEAL_TIMES.map((mt) => (
          <MealSection
            key={mt}
            mealTime={mt}
            weekDays={weekDays}
            entries={entries.filter((e) => e.meal_time === mt)}
            onOpenTooltip={handleOpenTooltip}
          />
        ))}
      </div>

      {/* Card tooltip portal */}
      {tooltipEntry && tooltipRect && (
        <MealCardTooltip
          key={tooltipEntry.id}
          entry={tooltipEntry}
          anchorRect={tooltipRect}
          onEdit={handleEditOpen}
          onRemove={handleRemove}
          onClose={() => { setTooltipEntry(null); setTooltipRect(null); }}
        />
      )}

      {/* Add meal modal */}
      <AddMealModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchEntries}
        mode="add"
      />

      {/* Edit meal modal */}
      {editEntry && (
        <AddMealModal
          key={editEntry.id}
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setEditEntry(null); }}
          onSuccess={() => { fetchEntries(); setEditModalOpen(false); setEditEntry(null); }}
          initialRecipeId={editEntry.recipe_id ?? undefined}
          initialCustomRecipeName={editEntry.custom_recipe_name ?? undefined}
          initialDate={editEntry.date}
          initialMealTime={editEntry.meal_time as MealTime}
          initialColor={editEntry.color as "green" | "orange" | "blue"}
          mode="edit"
          mealPlanId={editEntry.id}
        />
      )}
    </div>
  );
}
