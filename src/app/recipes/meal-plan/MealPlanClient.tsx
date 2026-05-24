"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddMealModal } from "@/components/AddMealModal";
import type { MealPlanWithRecipe, MealTime } from "@/lib/supabase/types";

// ─── Date utilities ───────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
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
  const s = `Sun, ${SHORT_MONTHS[weekStart.getMonth()]} ${ordinal(weekStart.getDate())}`;
  const e = `Sat, ${SHORT_MONTHS[weekEnd.getMonth()]} ${ordinal(weekEnd.getDate())}`;
  return `${s} – ${e}`;
}

// ─── Meal card with 3-dot menu ────────────────────────────────────────────────

function MealCard({
  entry,
  past,
  onEdit,
  onRemove,
}: {
  entry: MealPlanWithRecipe;
  past: boolean;
  onEdit: (entry: MealPlanWithRecipe) => void;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div className={`relative group/card ${past ? "opacity-25" : ""}`}>
      {/* Card body */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/recipes/${entry.recipe_id}`)}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/recipes/${entry.recipe_id}`)}
        className="rounded-[8px] px-[12px] py-[8px] bg-[rgba(67,145,60,0.1)] hover:bg-[rgba(67,145,60,0.5)] transition-colors cursor-pointer"
      >
        <p className="text-[10px] text-black leading-[16px] pr-4 break-words">
          {entry.recipes?.name ?? "Unknown recipe"}
        </p>
      </div>

      {/* 3-dot menu — visible on card hover */}
      <div
        ref={menuRef}
        className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-[18px] h-[18px] flex items-center justify-center rounded bg-white/90 text-[#3e260f] text-[10px] font-bold leading-none hover:bg-white shadow-sm"
          aria-label="Meal options"
        >
          ···
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg py-1 z-30">
            <button
              onClick={() => { setMenuOpen(false); onEdit(entry); }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => { setMenuOpen(false); onRemove(entry.id); }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Meal section (Breakfast / Lunch / Dinner row) ────────────────────────────

function MealSection({
  mealTime,
  weekDays,
  entries,
  onEdit,
  onRemove,
}: {
  mealTime: MealTime;
  weekDays: Date[];
  entries: MealPlanWithRecipe[];
  onEdit: (entry: MealPlanWithRecipe) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="grid border-t border-[rgba(62,38,15,0.1)]"
      style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
    >
      {/* Rotated label */}
      <div className="border-r border-[rgba(62,38,15,0.1)] flex items-center justify-center py-6">
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
                onEdit={onEdit}
                onRemove={onRemove}
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

  // Add modal state (for the "+ Add Meal" button)
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Edit modal state (for calendar card "Edit")
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MealPlanWithRecipe | null>(null);

  // Derived week data
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
        {/* Prev / Next */}
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

        {/* Week label */}
        <span className="text-[16px] font-bold text-[#3e260f]">{weekLabel}</span>

        {/* Today button */}
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
          {/* Empty corner above label column */}
          <div className="border-r border-[rgba(62,38,15,0.1)]" />

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
            onEdit={handleEditOpen}
            onRemove={handleRemove}
          />
        ))}
      </div>

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
          initialRecipeId={editEntry.recipe_id}
          initialDate={editEntry.date}
          initialMealTime={editEntry.meal_time as MealTime}
          mode="edit"
          mealPlanId={editEntry.id}
        />
      )}
    </div>
  );
}
