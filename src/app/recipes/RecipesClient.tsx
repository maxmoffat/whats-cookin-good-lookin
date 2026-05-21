"use client";

import { useState, useMemo } from "react";
import RecipeCard from "@/components/RecipeCard";
import { useAddRecipeModal } from "@/components/AddRecipeModal";
import FilterPanel, {
  DEFAULT_FILTERS,
  hasActiveFilters,
  countActiveFilters,
  formatTime,
  type Filters,
} from "@/components/FilterPanel";

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-[rgba(62,38,15,0.2)] bg-white text-xs text-[#3e260f] hover:border-[#3e260f] transition-colors"
    >
      {label}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path
          d="M1 1L7 7M7 1L1 7"
          stroke="#3e260f"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RecipesClient({ recipes }: { recipes: any[] }) {
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  // appliedFilters drives the actual filtering — only updated on Apply
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { open: openModal } = useAddRecipeModal();

  // Unique tag names across all recipes
  const allTags = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const r of recipes) {
      for (const tag of r.tags ?? []) {
        if (tag?.name) set.add(tag.name);
      }
    }
    return Array.from(set).sort();
  }, [recipes]);

  // Apply search + filters
  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (q.trim() && !r.name.toLowerCase().includes(q.toLowerCase()))
        return false;

      if (appliedFilters.tags.length > 0) {
        const recipeTags: string[] = (r.tags ?? []).map(
          (t: { name: string }) => t.name
        );
        if (!appliedFilters.tags.some((t) => recipeTags.includes(t)))
          return false;
      }

      if (
        appliedFilters.cookTimeMax > 0 &&
        r.cook_time !== null &&
        r.cook_time > appliedFilters.cookTimeMax
      )
        return false;

      if (
        appliedFilters.prepTimeMax > 0 &&
        r.prep_time !== null &&
        r.prep_time > appliedFilters.prepTimeMax
      )
        return false;

      if (
        appliedFilters.servesMin > 1 &&
        r.servings !== null &&
        r.servings < appliedFilters.servesMin
      )
        return false;

      return true;
    });
  }, [recipes, q, appliedFilters]);

  const activeFilters = hasActiveFilters(appliedFilters);
  const filterCount = countActiveFilters(appliedFilters);

  function removeTag(tag: string) {
    setAppliedFilters((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  return (
    <>
      <div>
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-[#3e260f] leading-tight">
            Recipes ({filtered.length})
          </h1>
        </div>

        {/* Search + Filter row */}
        <div className="flex items-center gap-4 mb-10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Recipe Name"
            className="w-full max-w-[640px] h-10 rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-4 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.5)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
          />

          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 text-[#b9732c] hover:opacity-70 transition-opacity flex-shrink-0"
          >
            <img src="/icons/filter.svg" alt="" width={16} height={10} />
            <span className="text-base">
              {activeFilters ? `Filters (${filterCount})` : "Filter"}
            </span>
          </button>

          {activeFilters && (
            <button
              onClick={() => setAppliedFilters(DEFAULT_FILTERS)}
              className="text-sm text-[#3e260f] underline underline-offset-2 hover:opacity-70 transition-opacity flex-shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Applied filter chips */}
        {activeFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {appliedFilters.tags.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                onRemove={() => removeTag(tag)}
              />
            ))}
            {appliedFilters.cookTimeMax > 0 && (
              <FilterChip
                label={`Cook ≤ ${formatTime(appliedFilters.cookTimeMax)}`}
                onRemove={() =>
                  setAppliedFilters((f) => ({ ...f, cookTimeMax: 0 }))
                }
              />
            )}
            {appliedFilters.prepTimeMax > 0 && (
              <FilterChip
                label={`Prep ≤ ${formatTime(appliedFilters.prepTimeMax)}`}
                onRemove={() =>
                  setAppliedFilters((f) => ({ ...f, prepTimeMax: 0 }))
                }
              />
            )}
            {appliedFilters.servesMin > 1 && (
              <FilterChip
                label={`Serves ${appliedFilters.servesMin}+`}
                onRemove={() =>
                  setAppliedFilters((f) => ({ ...f, servesMin: 1 }))
                }
              />
            )}
          </div>
        )}

        {/* Cards / empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <img
              src="/icons/empty-state.svg"
              alt=""
              width={34}
              height={40}
              className="mb-6 opacity-80"
            />
            <h2 className="text-2xl font-bold text-[#3e260f] mb-3">
              {q || activeFilters ? "No recipes found" : "Your Cookbook is Empty!"}
            </h2>
            <p className="text-base text-[rgba(62,38,15,0.5)]">
              {q || activeFilters
                ? "Try adjusting your search or filters"
                : "Add your first recipe to get started"}
            </p>
            {activeFilters && (
              <button
                onClick={() => setAppliedFilters(DEFAULT_FILTERS)}
                className="mt-6 rounded-lg border border-[rgba(62,38,15,0.2)] px-5 py-2.5 text-sm font-semibold text-[#3e260f] hover:border-[#3e260f] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe as Parameters<typeof RecipeCard>[0]["recipe"]}
              />
            ))}
          </div>
        )}
      </div>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(newFilters) => {
          setAppliedFilters(newFilters);
          setFilterOpen(false);
        }}
        appliedFilters={appliedFilters}
        allTags={allTags}
      />
    </>
  );
}
