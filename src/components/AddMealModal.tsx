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

// ─── Modal component ──────────────────────────────────────────────────────────

export interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialRecipeId?: string;
  initialDate?: string; // YYYY-MM-DD
  initialMealTime?: MealTime;
  /** "edit" disables the recipe field; expects mealPlanId */
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
  mode = "add",
  mealPlanId,
}: AddMealModalProps) {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [date, setDate] = useState(initialDate ?? "");
  const [mealTime, setMealTime] = useState<MealTime | "">(initialMealTime ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);

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

  // Reset fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedRecipe(null);
      setDate(initialDate ?? "");
      setMealTime(initialMealTime ?? "");
      setError("");
      setDropdownOpen(false);
    }
  }, [isOpen, initialDate, initialMealTime]);

  // Re-sync initialDate / initialMealTime when they change (edit mode re-open)
  useEffect(() => {
    if (isOpen) {
      setDate(initialDate ?? "");
      setMealTime(initialMealTime ?? "");
    }
  }, [isOpen, initialDate, initialMealTime]);

  // Close combo dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecipe || !date || !mealTime) {
      setError("All three fields are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const supabase = createClient();

    if (mode === "edit" && mealPlanId) {
      const { error: err } = await supabase
        .from("meal_plan")
        .update({ date, meal_time: mealTime })
        .eq("id", mealPlanId);
      if (err) {
        console.error("meal_plan update error:", err);
        setError(err.message || "Failed to update. Please try again.");
        setSubmitting(false);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: err } = await supabase.from("meal_plan").insert({
        user_id: user!.id,
        recipe_id: selectedRecipe.id,
        date,
        meal_time: mealTime,
      });
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
            <label className="block text-[12px] text-[#3e260f] mb-2">
              Select from your saved recipes:
            </label>
            <div ref={comboRef} className="relative">
              <div
                className={`h-[40px] border rounded-[8px] flex items-center px-4 gap-2 ${
                  mode === "edit"
                    ? "bg-[rgba(62,38,15,0.05)] border-[rgba(34,34,34,0.1)] cursor-not-allowed"
                    : "bg-white border-[rgba(34,34,34,0.2)] cursor-pointer"
                }`}
                onClick={() => {
                  if (mode === "add" && !selectedRecipe) {
                    setDropdownOpen((o) => !o);
                  }
                }}
              >
                {selectedRecipe ? (
                  <>
                    <span className="flex-1 text-[16px] text-[#3e260f] truncate">
                      {selectedRecipe.name}
                    </span>
                    {mode === "add" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecipe(null);
                          setSearch("");
                        }}
                        className="text-[rgba(62,38,15,0.4)] hover:text-[#3e260f] text-lg leading-none flex-shrink-0"
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Search recipes…"
                      className="flex-1 text-[16px] text-[#3e260f] outline-none bg-transparent placeholder:text-[rgba(62,38,15,0.35)]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <svg
                      width="12"
                      height="7"
                      viewBox="0 0 12 7"
                      fill="none"
                      className="flex-shrink-0"
                    >
                      <path
                        d="M1 1l5 5 5-5"
                        stroke="#3E260F"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </div>

              {/* Dropdown list */}
              {dropdownOpen && mode === "add" && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[rgba(34,34,34,0.2)] rounded-[8px] shadow-lg max-h-[200px] overflow-y-auto z-20">
                  {filteredRecipes.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[rgba(62,38,15,0.4)]">
                      No recipes found
                    </p>
                  ) : (
                    filteredRecipes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipe(r);
                          setDropdownOpen(false);
                          setSearch("");
                        }}
                        className="w-full text-left px-4 py-2.5 text-[14px] text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
                      >
                        {r.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Date ── */}
          <div>
            <label className="block text-[12px] text-[#3e260f] mb-2">
              Select a date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-[40px] w-[272px] border border-[rgba(34,34,34,0.2)] rounded-[8px] px-4 text-[16px] text-[#3e260f] outline-none focus:border-[#b9732c] transition-colors bg-white"
            />
          </div>

          {/* ── Meal time ── */}
          <div>
            <label className="block text-[12px] text-[#3e260f] mb-2">
              Select a meal time:
            </label>
            <div className="relative w-full">
              <select
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value as MealTime)}
                className="h-[40px] w-full border border-[rgba(34,34,34,0.2)] rounded-[8px] px-4 pr-10 text-[16px] text-[#3e260f] outline-none focus:border-[#b9732c] transition-colors appearance-none bg-white cursor-pointer"
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                  <path
                    d="M1 1l5 5 5-5"
                    stroke="#3E260F"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 -mt-2">{error}</p>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="h-[40px] px-6 bg-[#b9732c] text-white rounded-[8px] text-[16px] font-bold hover:bg-[#a0621f] transition-colors disabled:opacity-50"
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
