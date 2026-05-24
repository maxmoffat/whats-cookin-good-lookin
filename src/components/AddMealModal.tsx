"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MealTime } from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeOption {
  id: string;
  name: string;
}

export interface AddMealOpts {
  recipeId?: string;
  date?: string; // YYYY-MM-DD
  mealTime?: MealTime;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<{ open: (opts?: AddMealOpts) => void }>({
  open: () => {},
});
export const useAddMealModal = () => useContext(Ctx);

// ─── Color config (shared with MealPlanClient via this export) ───────────────

export type MealColor = "green" | "orange" | "blue";

export const MEAL_COLOR_OPTIONS: {
  value: MealColor;
  label: string;
  dot: string;        // full-opacity dot colour
  bg: string;         // 10% card background
  bgHover: string;    // ~50% hover background
}[] = [
  {
    value: "green",
    label: "Green",
    dot: "rgb(67,145,60)",
    bg: "rgba(67,145,60,0.1)",
    bgHover: "rgba(67,145,60,0.5)",
  },
  {
    value: "orange",
    label: "Orange",
    dot: "#b9732c",
    bg: "rgba(185,115,44,0.1)",
    bgHover: "rgba(185,115,44,0.5)",
  },
  {
    value: "blue",
    label: "Blue",
    dot: "#2C6CB9",
    bg: "rgba(44,108,185,0.1)",
    bgHover: "rgba(44,108,185,0.5)",
  },
];

// ─── Date utilities (local to this file) ─────────────────────────────────────

const DAY_ABBREV = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isPastDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

// ─── Date toggle picker (add mode only) ───────────────────────────────────────

function DateTogglePicker({
  selectedDates,
  onToggle,
}: {
  selectedDates: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [weekCount, setWeekCount] = useState(1);
  const MAX_WEEKS = 4;

  const weekStart = getMondayOfWeek(new Date());

  // Build `weekCount` rows of 7 days each
  const weeks: Date[][] = Array.from({ length: weekCount }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + wi * 7 + di);
      return d;
    })
  );

  return (
    <div className="flex flex-col gap-2">
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-[6px]">
          {week.map((date, di) => {
            const key = toDateKey(date);
            const selected = selectedDates.has(key);
            const past = isPastDay(date);

            return (
              <button
                key={di}
                type="button"
                disabled={past}
                onClick={() => onToggle(key)}
                className={`h-[40px] rounded-[8px] border flex flex-col items-center justify-center transition-colors ${
                  past
                    ? "opacity-25 cursor-not-allowed bg-white border-[rgba(34,34,34,0.2)]"
                    : selected
                    ? "bg-[rgba(185,115,44,0.25)] border-[#b9732c] cursor-pointer"
                    : "bg-white border-[rgba(34,34,34,0.2)] hover:border-[rgba(62,38,15,0.5)] cursor-pointer"
                }`}
              >
                <span
                  className={`text-[10px] leading-[14px] ${
                    selected && !past
                      ? "text-[#b9732c] font-bold"
                      : "text-[#3e260f] font-normal"
                  }`}
                >
                  {DAY_ABBREV[di]}
                </span>
                <span
                  className={`text-[10px] leading-[14px] ${
                    selected && !past
                      ? "text-[#b9732c] font-bold"
                      : "text-[#3e260f] font-normal"
                  }`}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {/* Show Additional Week */}
      <div className="flex justify-end mt-1">
        {weekCount < MAX_WEEKS ? (
          <button
            type="button"
            onClick={() => setWeekCount((c) => c + 1)}
            className="text-[12px] text-[#b9732c] hover:opacity-70 transition-opacity"
          >
            + Show Additional Week
          </button>
        ) : (
          <div className="relative group/tip">
            <span className="text-[12px] text-[#b9732c] opacity-40 cursor-not-allowed select-none">
              + Show Additional Week
            </span>
            {/* Tooltip */}
            <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity z-20">
              <div className="bg-[#3e260f] text-white text-xs font-medium px-2.5 py-1.5 rounded-[6px] whitespace-nowrap shadow-md">
                Only a month can be shown at a time
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal component ──────────────────────────────────────────────────────────

export interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialRecipeId?: string;
  initialDate?: string; // YYYY-MM-DD — used in edit mode
  initialMealTime?: MealTime;
  initialColor?: MealColor;
  initialCustomRecipeName?: string; // set when editing a manually-added entry
  /** "edit" keeps a single <input type="date"> and disables the recipe field */
  mode?: "add" | "edit";
  mealPlanId?: string;
}

export function AddMealModal({
  isOpen,
  onClose,
  onSuccess,
  initialRecipeId,
  initialDate,
  initialMealTime,
  initialColor,
  initialCustomRecipeName,
  mode = "add",
  mealPlanId,
}: AddMealModalProps) {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Add mode: toggle between saved-recipe search and custom name input
  const [recipeMode, setRecipeMode] = useState<"search" | "custom">("search");
  const [customRecipeName, setCustomRecipeName] = useState(""); // add mode custom name
  const [editCustomName, setEditCustomName] = useState(initialCustomRecipeName ?? ""); // edit mode custom name

  // Add mode: multi-select set of YYYY-MM-DD strings
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  // Edit mode: single date string
  const [editDate, setEditDate] = useState(initialDate ?? "");

  const [mealTime, setMealTime] = useState<MealTime | "">(initialMealTime ?? "");
  const [mealTimeOpen, setMealTimeOpen] = useState(false);
  const mealTimeRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState<MealColor>(initialColor ?? "green");
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);

  // True when editing a manually-named entry (no recipe_id)
  const isCustomEdit = mode === "edit" && initialCustomRecipeName !== undefined;

  // Fetch recipe list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        setRecipes(list);
        if (initialRecipeId) {
          const found = list.find((r) => r.id === initialRecipeId);
          if (found) setSelectedRecipe(found);
        }
      });
  }, [isOpen, initialRecipeId]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedRecipe(null);
      setSelectedDates(new Set());
      setRecipeMode("search");
      setCustomRecipeName("");
      setEditDate(initialDate ?? "");
      setEditCustomName(initialCustomRecipeName ?? "");
      setMealTime(initialMealTime ?? "");
      setColor(initialColor ?? "green");
      setError("");
      setDropdownOpen(false);
      setMealTimeOpen(false);
      setColorOpen(false);
    }
  }, [isOpen, initialDate, initialMealTime, initialColor, initialCustomRecipeName]);

  // Re-sync edit fields when they change (edit mode re-open)
  useEffect(() => {
    if (isOpen) {
      setEditDate(initialDate ?? "");
      setEditCustomName(initialCustomRecipeName ?? "");
      setMealTime(initialMealTime ?? "");
      setColor(initialColor ?? "green");
    }
  }, [isOpen, initialDate, initialMealTime, initialColor, initialCustomRecipeName]);

  // Close combo / mealTime / color dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (mealTimeRef.current && !mealTimeRef.current.contains(e.target as Node)) {
        setMealTimeOpen(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleDate(key: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Whether all required fields are filled (drives visual disabled state)
  const isReady = mode === "edit"
    ? (isCustomEdit ? !!editCustomName.trim() : true) && !!editDate && !!mealTime
    : (recipeMode === "search" ? !!selectedRecipe : !!customRecipeName.trim()) &&
      selectedDates.size > 0 &&
      !!mealTime;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const supabase = createClient();

    if (mode === "edit") {
      if (isCustomEdit && !editCustomName.trim()) {
        setError("Recipe name is required.");
        return;
      }
      if (!editDate || !mealTime) {
        setError("Date and meal time are required.");
        return;
      }
      setSubmitting(true);
      const updatePayload: Record<string, unknown> = { date: editDate, meal_time: mealTime, color };
      if (isCustomEdit) updatePayload.custom_recipe_name = editCustomName.trim();
      const { error: err } = await supabase
        .from("meal_plan")
        .update(updatePayload)
        .eq("id", mealPlanId!);
      if (err) {
        console.error("meal_plan update error:", err);
        setError(err.message || "Failed to update. Please try again.");
        setSubmitting(false);
        return;
      }
    } else {
      if (recipeMode === "search" && !selectedRecipe) {
        setError("Please select a recipe.");
        return;
      }
      if (recipeMode === "custom" && !customRecipeName.trim()) {
        setError("Please enter a recipe name.");
        return;
      }
      if (selectedDates.size === 0) {
        setError("Please select at least one date.");
        return;
      }
      if (!mealTime) {
        setError("Please select a meal time.");
        return;
      }
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const inserts = Array.from(selectedDates).map((d) => ({
        user_id: user!.id,
        recipe_id: recipeMode === "search" ? selectedRecipe!.id : null,
        custom_recipe_name: recipeMode === "custom" ? customRecipeName.trim() : null,
        date: d,
        meal_time: mealTime,
        color,
      }));

      const { error: err } = await supabase.from("meal_plan").insert(inserts);
      if (err) {
        console.error("meal_plan insert error:", err);
        setError(err.message || "Failed to add meal. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    onSuccess?.();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-[24px] shadow-xl px-10 py-10 w-full max-w-[640px]">
        {/* Close × */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#3e260f] hover:opacity-50 transition-opacity"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="#3E260F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-[24px] font-bold text-[#3e260f] mb-1">
          {mode === "edit" ? "Edit Meal" : "Add Meal"}
        </h2>
        <p className="text-[16px] text-[#3e260f] mb-8">
          Select a recipe, date and time for your meal below
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* ── Recipe ── */}
          <div>
            {/* Label row — right side is the mode-swap link (add mode only) */}
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[12px] text-[#3e260f]">
                {mode === "edit"
                  ? isCustomEdit
                    ? "Custom recipe name:"
                    : "Selected recipe:"
                  : recipeMode === "search"
                  ? "Select from your saved recipes or add a custom recipe name:"
                  : "Add a custom recipe name or search your saved recipes:"}
              </label>
              {mode === "add" && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipeMode((m) => (m === "search" ? "custom" : "search"));
                    setSelectedRecipe(null);
                    setCustomRecipeName("");
                    setSearch("");
                    setDropdownOpen(false);
                  }}
                  className="text-[12px] text-[#b9732c] hover:opacity-70 transition-opacity flex-shrink-0 ml-3"
                >
                  {recipeMode === "search" ? "Add a custom name instead" : "Search saved recipes instead"}
                </button>
              )}
            </div>

            {/* Edit mode — custom name: editable text input */}
            {mode === "edit" && isCustomEdit ? (
              <input
                type="text"
                value={editCustomName}
                onChange={(e) => setEditCustomName(e.target.value)}
                placeholder="Recipe name…"
                className="h-[40px] w-full border border-[rgba(34,34,34,0.2)] rounded-[8px] px-4 text-[16px] text-[#3e260f] outline-none focus:border-[#b9732c] transition-colors bg-white placeholder:text-[rgba(62,38,15,0.35)]"
              />
            ) : mode === "edit" ? (
              /* Edit mode — saved recipe: disabled name display */
              <div className="h-[40px] border rounded-[8px] flex items-center px-4 bg-[rgba(62,38,15,0.05)] border-[rgba(34,34,34,0.1)] cursor-not-allowed">
                <span className="flex-1 text-[16px] text-[#3e260f] truncate">
                  {selectedRecipe?.name ?? ""}
                </span>
              </div>
            ) : recipeMode === "custom" ? (
              /* Add mode — custom name input */
              <input
                type="text"
                value={customRecipeName}
                onChange={(e) => setCustomRecipeName(e.target.value)}
                placeholder="Type in a name for your custom recipe..."
                className="h-[40px] w-full border border-[rgba(34,34,34,0.2)] rounded-[8px] px-4 text-[16px] text-[#3e260f] outline-none focus:border-[#b9732c] transition-colors bg-white placeholder:text-[rgba(62,38,15,0.35)]"
              />
            ) : (
              /* Add mode — saved recipe search dropdown */
              <div ref={comboRef} className="relative">
                <div
                  className="h-[40px] border border-[rgba(34,34,34,0.2)] rounded-[8px] flex items-center px-4 gap-2 bg-white cursor-pointer"
                  onClick={() => { if (!selectedRecipe) setDropdownOpen((o) => !o); }}
                >
                  {selectedRecipe ? (
                    <>
                      <span className="flex-1 text-[16px] text-[#3e260f] truncate">
                        {selectedRecipe.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedRecipe(null); setSearch(""); }}
                        className="text-[rgba(62,38,15,0.4)] hover:text-[#3e260f] text-lg leading-none flex-shrink-0"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder="Search your saved recipes..."
                        className="flex-1 text-[16px] text-[#3e260f] outline-none bg-transparent placeholder:text-[rgba(62,38,15,0.35)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <svg width="12" height="7" viewBox="0 0 12 7" fill="none" className="flex-shrink-0">
                        <path d="M1 1l5 5 5-5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </div>
                {dropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[rgba(34,34,34,0.2)] rounded-[8px] shadow-lg max-h-[200px] overflow-y-auto z-20">
                    {filteredRecipes.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-[rgba(62,38,15,0.4)]">No recipes found</p>
                    ) : (
                      filteredRecipes.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setSelectedRecipe(r); setDropdownOpen(false); setSearch(""); }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                        >
                          {r.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Date(s) ── */}
          <div>
            <label className="block text-[12px] text-[#3e260f] mb-2">
              {mode === "edit" ? "Select a date:" : "Select date(s):"}
            </label>

            {mode === "edit" ? (
              /* Edit: single native date input */
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-[40px] w-[272px] border border-[rgba(34,34,34,0.2)] rounded-[8px] px-4 text-[16px] text-[#3e260f] outline-none focus:border-[#b9732c] transition-colors bg-white"
              />
            ) : (
              /* Add: multi-select toggle picker */
              <DateTogglePicker
                selectedDates={selectedDates}
                onToggle={toggleDate}
              />
            )}
          </div>

          {/* ── Meal time ── */}
          <div>
            <label className="block text-[12px] text-[#3e260f] mb-2">
              Select a meal time:
            </label>
            <div ref={mealTimeRef} className="relative">
              <div
                onClick={() => setMealTimeOpen((o) => !o)}
                className="h-[40px] border border-[rgba(34,34,34,0.2)] rounded-[8px] flex items-center px-4 cursor-pointer bg-white"
              >
                <span
                  className={`flex-1 text-[16px] ${
                    mealTime ? "text-[#3e260f]" : "text-[rgba(62,38,15,0.35)]"
                  }`}
                >
                  {mealTime
                    ? mealTime.charAt(0).toUpperCase() + mealTime.slice(1)
                    : "Select…"}
                </span>
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none" className="flex-shrink-0">
                  <path d="M1 1l5 5 5-5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {mealTimeOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[rgba(34,34,34,0.2)] rounded-[8px] shadow-lg z-20 py-1">
                  {(["breakfast", "lunch", "dinner"] as MealTime[]).map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => { setMealTime(mt); setMealTimeOpen(false); }}
                      className="w-full flex items-center px-4 py-2.5 text-[14px] text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                    >
                      <span className="flex-1 text-left">
                        {mt.charAt(0).toUpperCase() + mt.slice(1)}
                      </span>
                      {mt === mealTime && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5l3.5 3.5L11 1" stroke="#3e260f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Color ── */}
          <div>
            <label className="block text-[12px] text-[#3e260f] mb-2">
              Select a meal color (green by default):
            </label>
            <div ref={colorRef} className="relative">
              {/* Trigger */}
              {(() => {
                const opt = MEAL_COLOR_OPTIONS.find((c) => c.value === color)!;
                return (
                  <div
                    onClick={() => setColorOpen((o) => !o)}
                    className="h-[40px] border border-[rgba(34,34,34,0.2)] rounded-[8px] flex items-center px-4 gap-3 cursor-pointer bg-white"
                  >
                    <span
                      className="w-[14px] h-[14px] rounded-full flex-shrink-0 border"
                      style={{ backgroundColor: opt.bg, borderColor: opt.bgHover }}
                    />
                    <span className="flex-1 text-[16px] text-[#3e260f]">
                      {opt.label}
                    </span>
                    <svg width="12" height="7" viewBox="0 0 12 7" fill="none" className="flex-shrink-0">
                      <path d="M1 1l5 5 5-5" stroke="#3E260F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })()}

              {/* Dropdown */}
              {colorOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[rgba(34,34,34,0.2)] rounded-[8px] shadow-lg z-20 overflow-hidden">
                  {MEAL_COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setColor(opt.value); setColorOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                    >
                      <span
                        className="w-[14px] h-[14px] rounded-full flex-shrink-0 border"
                        style={{ backgroundColor: opt.bg, borderColor: opt.bgHover }}
                      />
                      <span className="flex-1 text-left">{opt.label}</span>
                      {opt.value === color && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5l3.5 3.5L11 1" stroke="#3e260f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`h-[40px] px-6 bg-[#b9732c] text-white rounded-[8px] text-[16px] font-bold transition-colors disabled:opacity-50 ${
                isReady && !submitting
                  ? "hover:bg-[#a0621f] cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              {submitting
                ? "Saving…"
                : mode === "edit"
                ? "Save Changes"
                : "Add to Meal Calendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AddMealModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [opts, setOpts] = useState<AddMealOpts>({});

  function open(options?: AddMealOpts) {
    setOpts(options ?? {});
    setIsOpen(true);
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <AddMealModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
        initialRecipeId={opts.recipeId}
        initialDate={opts.date}
        initialMealTime={opts.mealTime}
        mode="add"
      />
    </Ctx.Provider>
  );
}
