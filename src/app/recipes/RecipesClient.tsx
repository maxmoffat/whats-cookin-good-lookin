"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import RecipeCard from "@/components/RecipeCard";
import RecipeTableRow from "@/components/RecipeTableRow";
import { useAddRecipeModal } from "@/components/AddRecipeModal";
import FilterPanel, {
  DEFAULT_FILTERS,
  hasActiveFilters,
  countActiveFilters,
  formatTime,
  type Filters,
} from "@/components/FilterPanel";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0" y="0" width="6" height="6" rx="1" fill={active ? "white" : "rgba(62,38,15,0.4)"} />
      <rect x="7" y="0" width="6" height="6" rx="1" fill={active ? "white" : "rgba(62,38,15,0.4)"} />
      <rect x="0" y="7" width="6" height="6" rx="1" fill={active ? "white" : "rgba(62,38,15,0.4)"} />
      <rect x="7" y="7" width="6" height="6" rx="1" fill={active ? "white" : "rgba(62,38,15,0.4)"} />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  const color = active ? "white" : "rgba(62,38,15,0.4)";
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
      <rect x="0" y="0" width="13" height="2.2" rx="1.1" fill={color} />
      <rect x="0" y="4.4" width="13" height="2.2" rx="1.1" fill={color} />
      <rect x="0" y="8.8" width="13" height="2.2" rx="1.1" fill={color} />
    </svg>
  );
}

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

const PAGE_SIZE = 25;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RecipesClient({ recipes }: { recipes: any[] }) {
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
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
      if (appliedFilters.favoritesOnly && !r.is_favorite) return false;
      return true;
    });
  }, [recipes, q, appliedFilters]);

  // Reset visible count when search/filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, appliedFilters]);

  // Infinite scroll — list view only
  useEffect(() => {
    if (view !== "list") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [view, filtered.length]);

  const activeFilters = hasActiveFilters(appliedFilters);
  const filterCount = countActiveFilters(appliedFilters);

  function removeTag(tag: string) {
    setAppliedFilters((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  const visibleRecipes = view === "list" ? filtered.slice(0, visibleCount) : filtered;

  return (
    <>
      <div>
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-[#3e260f] leading-tight">
            Recipes ({filtered.length})
          </h1>
        </div>

        {/* Search + Filter + View toggle row */}
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

          {/* View toggle — pushed to the far right */}
          <div className="ml-auto flex-shrink-0 flex items-center h-10 rounded-[8px] border border-[rgba(34,34,34,0.2)] bg-white px-[5px] gap-[4px]">
            <button
              onClick={() => setView("grid")}
              className={`w-8 h-8 rounded-[5px] flex items-center justify-center transition-colors ${
                view === "grid" ? "bg-[#b9732c]" : "hover:bg-[rgba(62,38,15,0.05)]"
              }`}
              aria-label="Grid view"
            >
              <GridIcon active={view === "grid"} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`w-8 h-8 rounded-[5px] flex items-center justify-center transition-colors ${
                view === "list" ? "bg-[#b9732c]" : "hover:bg-[rgba(62,38,15,0.05)]"
              }`}
              aria-label="List view"
            >
              <ListIcon active={view === "list"} />
            </button>
          </div>
        </div>

        {/* Applied filter chips */}
        {activeFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {appliedFilters.tags.map((tag) => (
              <FilterChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
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
            {appliedFilters.favoritesOnly && (
              <FilterChip
                label="Favorites Only"
                onRemove={() =>
                  setAppliedFilters((f) => ({ ...f, favoritesOnly: false }))
                }
              />
            )}
          </div>
        )}

        {/* Empty state */}
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
        ) : view === "grid" ? (
          /* ── Grid view ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe as Parameters<typeof RecipeCard>[0]["recipe"]}
              />
            ))}
          </div>
        ) : (
          /* ── List view ── */
          <>
            <div className="bg-white rounded-lg border border-[rgba(34,34,34,0.1)] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(34,34,34,0.1)]">
                    {/* heart icon col */}
                    <th className="w-12 py-4" />
                    <th className="py-4 pr-6 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Recipe Name
                    </th>
                    <th className="py-4 pr-6 w-24 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Ingredients
                    </th>
                    <th className="py-4 pr-6 w-28 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Prep Time
                    </th>
                    <th className="py-4 pr-6 w-28 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Cook Time
                    </th>
                    <th className="py-4 pr-6 w-20 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Serves
                    </th>
                    <th className="py-4 pr-4 text-left text-xs font-bold text-[rgba(34,34,34,0.5)]">
                      Tags
                    </th>
                    {/* 3-dot col */}
                    <th className="w-10 py-4 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRecipes.map((recipe) => (
                    <RecipeTableRow
                      key={recipe.id}
                      recipe={
                        recipe as Parameters<
                          typeof RecipeTableRow
                        >[0]["recipe"]
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Infinite scroll sentinel — only rendered when more rows remain */}
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} className="h-16 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#b9732c] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
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
