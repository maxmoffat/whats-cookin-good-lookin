"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddMealModal, MEAL_COLOR_OPTIONS } from "@/components/AddMealModal";
import type { MealPlanWithRecipe, MealTime } from "@/lib/supabase/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

// Max recipe pills before "+X more" in month cells
const MONTH_MAX_VISIBLE = 3;

const LS_VIEW_KEY = "wcgl_cal_view";
type CalView = "week" | "month";

// ─── Date utilities ───────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-based
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Returns an array of weeks (each week = 7 days Sun→Sat) covering the given
 * month plus leading/trailing days that fill out the grid.
 */
function getMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Grid starts on the Sunday on or before the 1st
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  // Grid ends on the Saturday on or after the last day
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks: Date[][] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  return `Mon, ${SHORT_MONTHS[weekStart.getMonth()]} ${ordinal(weekStart.getDate())} – Sun, ${SHORT_MONTHS[weekEnd.getMonth()]} ${ordinal(weekEnd.getDate())}`;
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

// ─── Week-view card tooltip (portal) ─────────────────────────────────────────

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

  let x = anchorRect.right + GAP;
  if (x + TOOLTIP_W > vw - 8) x = anchorRect.left - TOOLTIP_W - GAP;
  x = Math.max(8, x);

  let y = anchorRect.top;
  if (y + TOOLTIP_H > vh - 8) y = vh - TOOLTIP_H - 8;
  y = Math.max(8, y);

  const isCustom = !entry.recipe_id;

  useEffect(() => {
    if (isCustom) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("name, prep_time, cook_time, servings, ingredients(id), tags(id, name)")
      .eq("id", entry.recipe_id!)
      .single()
      .then(({ data }) => { setRecipe(data as TooltipRecipe | null); setLoading(false); });
  }, [entry.recipe_id, isCustom]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[200] bg-white rounded-[24px] border border-[rgba(62,38,15,0.1)] shadow-[0px_4px_24px_0px_rgba(12,12,13,0.1)] p-6 w-[400px]"
      style={{ left: x, top: y }}
    >
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
                <path d="M10.4735 2.47346L11.8872 1.05962C12.6335 0.313459 13.8432 0.313459 14.5894 1.05962L15.9404 2.41068C16.6865 3.15677 16.6865 4.36656 15.9404 5.11272L14.5266 6.52656M10.4735 2.47346L1.28732 11.6596C0.970088 11.9768 0.774559 12.3955 0.735053 12.8425L0.503798 15.4605C0.451469 16.0528 0.947185 16.5485 1.53948 16.4962L4.15748 16.2649C4.60442 16.2254 5.0232 16.0299 5.34043 15.7128L14.5266 6.52656M10.4735 2.47346L14.5266 6.52656" stroke="#3E260F" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => { onClose(); onRemove(entry.id); }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
              aria-label="Remove meal"
            >
              <svg width="15" height="18" viewBox="0 0 15 18" fill="none">
                <path d="M13.0375 6.0375L12.2535 13.8756C12.135 15.0638 12.0762 15.6574 11.8055 16.1063C11.5681 16.5015 11.219 16.8175 10.8022 17.0144C10.329 17.2375 9.7335 17.2375 8.53883 17.2375H6.33617C5.14243 17.2375 4.54603 17.2375 4.07283 17.0135C3.65568 16.8167 3.30621 16.5007 3.06857 16.1054C2.79977 15.6574 2.74003 15.0638 2.62057 13.8756L1.8375 6.0375M8.8375 12.1042V7.4375M6.0375 12.1042V7.4375M0.4375 3.70417H4.74483M4.74483 3.70417L5.1051 1.2103C5.20963 0.7567 5.5867 0.4375 6.01977 0.4375H8.85523C9.2883 0.4375 9.66443 0.7567 9.7699 1.2103L10.1302 3.70417M4.74483 3.70417H10.1302M10.1302 3.70417H14.4375" stroke="#D11A1A" strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round" />
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
        <p className="text-[14px] text-[rgba(62,38,15,0.5)] mt-2">Manually added recipe</p>
      ) : recipe ? (
        <>
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {recipe.tags.map((tag) => (
                <span key={tag.id} className="px-2 py-0.5 rounded text-[12px] text-[#905823] bg-[rgba(185,115,44,0.2)]">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
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
        <p className="text-sm text-[rgba(62,38,15,0.4)] text-center py-8">Failed to load recipe details.</p>
      )}
    </div>,
    document.body
  );
}

// ─── Week-view meal card ──────────────────────────────────────────────────────

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
    if (cardRef.current) onOpenTooltip(entry, cardRef.current.getBoundingClientRect());
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

// ─── Week-view meal section ───────────────────────────────────────────────────

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
      <div className="flex items-center justify-center py-6">
        <span
          className="text-[10px] font-normal tracking-[1px] text-[rgba(62,38,15,0.5)] select-none"
          style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
        >
          {mealTime.toUpperCase()}
        </span>
      </div>

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
              <MealCard key={entry.id} entry={entry} past={past} onOpenTooltip={onOpenTooltip} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Month-view day modal (portal) ────────────────────────────────────────────

function DayModal({
  date,
  entries,
  onClose,
}: {
  date: Date;
  entries: MealPlanWithRecipe[];
  onClose: () => void;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const dateTitle = `${FULL_MONTHS[date.getMonth()]} ${ordinal(date.getDate())}, ${date.getFullYear()}`;

  const sections = MEAL_TIMES
    .map((mt) => ({ time: mt, items: entries.filter((e) => e.meal_time === mt) }))
    .filter((s) => s.items.length > 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-[24px] shadow-xl w-full max-w-[640px] p-8 max-h-[80vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="#3e260f" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-[24px] font-bold text-[#3e260f] mb-1">{dateTitle}</h2>
        <p className="text-[16px] text-[#3e260f] mb-6">
          {entries.length} meal{entries.length !== 1 ? "s" : ""} added
        </p>

        {/* Meal sections */}
        {sections.length === 0 ? (
          <p className="text-sm text-[rgba(62,38,15,0.4)] py-4">No meals planned for this day.</p>
        ) : (
          <div className="space-y-6">
            {sections.map(({ time, items }) => (
              <div key={time}>
                <p className="text-[12px] text-[rgba(62,38,15,0.5)] mb-3 tracking-wide uppercase">
                  {time} ({items.length})
                </p>
                <div className="flex flex-col gap-2">
                  {items.map((entry) => {
                    const colorOpt =
                      MEAL_COLOR_OPTIONS.find((c) => c.value === (entry.color ?? "green")) ??
                      MEAL_COLOR_OPTIONS[0];
                    const name =
                      entry.custom_recipe_name ?? entry.recipes?.name ?? "Unknown recipe";
                    return (
                      <div
                        key={entry.id}
                        className="rounded-[4px] px-[12px] py-[8px] text-[12px] text-black leading-[16px]"
                        style={{ backgroundColor: colorOpt.bg }}
                      >
                        {entry.recipe_id ? (
                          <a
                            href={`/recipes/${entry.recipe_id}`}
                            className="hover:underline"
                          >
                            {name}
                          </a>
                        ) : (
                          name
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Month-view grid ──────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  entries,
  onDayClick,
}: {
  year: number;
  month: number;
  entries: MealPlanWithRecipe[];
  onDayClick: (date: Date) => void;
}) {
  const weeks = getMonthGrid(year, month);

  return (
    <div className="bg-white rounded-[8px] border border-[rgba(62,38,15,0.1)] overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {MONTH_DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`py-3 flex items-center justify-center text-[12px] text-[#3e260f] ${
              i > 0 ? "border-l border-[rgba(62,38,15,0.1)]" : ""
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-t border-[rgba(62,38,15,0.1)]">
          {week.map((day, di) => {
            const inMonth = day.getMonth() === month;
            const today = isToday(day);
            const dayEntries = entries.filter((e) => e.date === toDateKey(day));
            const visible = dayEntries.slice(0, MONTH_MAX_VISIBLE);
            const overflow = dayEntries.length - visible.length;

            return (
              <div
                key={di}
                onClick={() => onDayClick(day)}
                className={[
                  di > 0 ? "border-l border-[rgba(62,38,15,0.1)]" : "",
                  "min-h-[130px] p-2 cursor-pointer transition-colors",
                  today
                    ? "bg-[rgba(185,115,44,0.05)] hover:bg-[rgba(185,115,44,0.09)]"
                    : "hover:bg-[rgba(62,38,15,0.02)]",
                ].join(" ")}
              >
                {/* Date number */}
                <p
                  className={`text-[10px] leading-none mb-1.5 ${
                    !inMonth
                      ? "text-[rgba(62,38,15,0.25)]"
                      : today
                      ? "font-bold text-[#b9732c]"
                      : "text-[#3e260f]"
                  }`}
                >
                  {day.getDate()}
                </p>

                {/* Recipe pills */}
                <div className="flex flex-col gap-[3px]">
                  {visible.map((entry) => {
                    const colorOpt =
                      MEAL_COLOR_OPTIONS.find((c) => c.value === (entry.color ?? "green")) ??
                      MEAL_COLOR_OPTIONS[0];
                    return (
                      <div
                        key={entry.id}
                        className="rounded-[4px] px-[6px] py-[3px] text-[10px] text-black leading-[14px] truncate"
                        style={{ backgroundColor: colorOpt.bg }}
                      >
                        {entry.custom_recipe_name ?? entry.recipes?.name ?? "Unknown"}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <p className="text-[10px] text-[rgba(62,38,15,0.5)] pl-1 leading-none mt-0.5">
                      +{overflow} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── View dropdown ────────────────────────────────────────────────────────────

function ViewDropdown({
  view,
  onChange,
}: {
  view: CalView;
  onChange: (v: CalView) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-[32px] px-3 rounded-[8px] border border-[rgba(34,34,34,0.2)] bg-white text-[12px] font-semibold text-[#3e260f] flex items-center gap-1.5 hover:border-[rgba(62,38,15,0.5)] transition-colors"
      >
        {view === "week" ? "Week" : "Month"}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="#3e260f" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-[100px] bg-white rounded-[8px] border border-[rgba(62,38,15,0.1)] shadow-md py-1 z-[200]">
          {(["Week", "Month"] as const).map((label) => {
            const v = label.toLowerCase() as CalView;
            return (
              <button
                key={label}
                onClick={() => { onChange(v); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                  view === v
                    ? "text-[#b9732c] font-semibold bg-[rgba(185,115,44,0.06)]"
                    : "text-[#3e260f] hover:bg-[rgba(62,38,15,0.04)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main calendar component ──────────────────────────────────────────────────

export default function MealPlanClient() {
  const now = new Date();

  // View — always start as "week" to match SSR, then sync from localStorage after mount
  const [view, setView] = useState<CalView>("week");
  useEffect(() => {
    const stored = localStorage.getItem(LS_VIEW_KEY);
    if (stored === "month") setView("month");
  }, []);

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Month navigation
  const [monthYear, setMonthYear] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const [entries, setEntries] = useState<MealPlanWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals / overlays
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MealPlanWithRecipe | null>(null);

  // Week-view tooltip
  const [tooltipEntry, setTooltipEntry] = useState<MealPlanWithRecipe | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);

  // Month-view day modal
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  // ── Derived values ──────────────────────────────────────────────────────────

  const today = new Date();
  const weekStart = getWeekStart(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7)
  );
  const weekDays = getWeekDays(weekStart);
  const isCurrentMonth =
    monthYear.year === today.getFullYear() && monthYear.month === today.getMonth();

  const dateLabel =
    view === "week"
      ? formatWeekLabel(weekStart)
      : `${FULL_MONTHS[monthYear.month]} ${monthYear.year}`;

  const showToday = view === "week" ? weekOffset !== 0 : !isCurrentMonth;

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let start: string, end: string;
    if (view === "week") {
      const now2 = new Date();
      const ws = getWeekStart(
        new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() + weekOffset * 7)
      );
      const wd = getWeekDays(ws);
      start = toDateKey(wd[0]);
      end = toDateKey(wd[6]);
    } else {
      const grid = getMonthGrid(monthYear.year, monthYear.month);
      start = toDateKey(grid[0][0]);
      end = toDateKey(grid[grid.length - 1][6]);
    }

    const { data } = await supabase
      .from("meal_plan")
      .select("*, recipes(id, name)")
      .gte("date", start)
      .lte("date", end)
      .order("created_at");

    setEntries((data as MealPlanWithRecipe[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekOffset, monthYear.year, monthYear.month]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Event handlers ──────────────────────────────────────────────────────────

  function handleViewChange(v: CalView) {
    setView(v);
    localStorage.setItem(LS_VIEW_KEY, v);
    // Close any open overlays when switching views
    setTooltipEntry(null);
    setTooltipRect(null);
    setDayModalDate(null);
  }

  function handlePrev() {
    if (view === "week") {
      setWeekOffset((o) => o - 1);
    } else {
      setMonthYear(({ year, month }) =>
        month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
      );
    }
  }

  function handleNext() {
    if (view === "week") {
      setWeekOffset((o) => o + 1);
    } else {
      setMonthYear(({ year, month }) =>
        month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
      );
    }
  }

  function handleToday() {
    if (view === "week") {
      setWeekOffset(0);
    } else {
      const n = new Date();
      setMonthYear({ year: n.getFullYear(), month: n.getMonth() });
    }
  }

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
    if (tooltipEntry?.id === entry.id) {
      setTooltipEntry(null);
      setTooltipRect(null);
    } else {
      setTooltipEntry(entry);
      setTooltipRect(rect);
    }
  }

  const dayModalEntries = dayModalDate
    ? entries.filter((e) => e.date === toDateKey(dayModalDate))
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* Navigation row */}
      <div className="flex items-center gap-3 mb-6">
        {/* Prev / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(62,38,15,0.08)] transition-colors"
            aria-label={view === "week" ? "Previous week" : "Previous month"}
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M6 1L1 6l5 5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(62,38,15,0.08)] transition-colors"
            aria-label={view === "week" ? "Next week" : "Next month"}
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1l5 5-5 5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Date label */}
        <span className="text-[16px] font-bold text-[#3e260f]">{dateLabel}</span>

        {/* View switcher */}
        <ViewDropdown view={view} onChange={handleViewChange} />

        {/* Today */}
        {showToday && (
          <button
            onClick={handleToday}
            className="h-[32px] px-4 rounded-[8px] border border-[#b9732c] text-[#b9732c] text-[14px] font-semibold hover:bg-[rgba(185,115,44,0.05)] transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Calendar */}
      <div
        className={`transition-opacity ${
          loading ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {view === "week" ? (
          <div className="bg-white rounded-[8px] border border-[rgba(62,38,15,0.1)] overflow-hidden">
            {/* Day headers */}
            <div className="grid" style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}>
              <div />
              {weekDays.map((day, i) => {
                const today_ = isToday(day);
                return (
                  <div
                    key={i}
                    className="border-l border-[rgba(62,38,15,0.1)] py-4 flex flex-col items-center gap-[6px]"
                  >
                    <span className="text-[12px] text-[#3e260f] font-normal">{DAY_NAMES[i]}</span>
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
        ) : (
          <MonthView
            year={monthYear.year}
            month={monthYear.month}
            entries={entries}
            onDayClick={(date) => setDayModalDate(date)}
          />
        )}
      </div>

      {/* Week-view card tooltip */}
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

      {/* Month-view day modal */}
      {dayModalDate && (
        <DayModal
          key={toDateKey(dayModalDate)}
          date={dayModalDate}
          entries={dayModalEntries}
          onClose={() => setDayModalDate(null)}
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
