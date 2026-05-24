"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Filters = {
  tags: string[];
  cookTimeMax: number; // minutes, 0 = any
  prepTimeMax: number; // minutes, 0 = any
  servesMin: number;   // 1 = any
  favoritesOnly: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  tags: [],
  cookTimeMax: 0,
  prepTimeMax: 0,
  servesMin: 1,
  favoritesOnly: false,
};

export function hasActiveFilters(f: Filters): boolean {
  return (
    f.tags.length > 0 ||
    f.cookTimeMax > 0 ||
    f.prepTimeMax > 0 ||
    f.servesMin > 1 ||
    f.favoritesOnly
  );
}

export function countActiveFilters(f: Filters): number {
  return (
    f.tags.length +
    (f.cookTimeMax > 0 ? 1 : 0) +
    (f.prepTimeMax > 0 ? 1 : 0) +
    (f.servesMin > 1 ? 1 : 0) +
    (f.favoritesOnly ? 1 : 0)
  );
}

export function formatTime(mins: number): string {
  if (mins === 0) return "Any";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Slider section ──────────────────────────────────────────────────────────

function SliderSection({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#3e260f]">{label}</span>
        <span className="text-sm font-semibold text-[#b9732c]">
          {formatLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, #b9732c 0%, #b9732c ${pct}%, rgba(62,38,15,0.15) ${pct}%, rgba(62,38,15,0.15) 100%)`,
        }}
      />
      <div className="flex justify-between mt-2">
        <span className="text-xs text-[rgba(62,38,15,0.4)]">
          {formatLabel(min)}
        </span>
        <span className="text-xs text-[rgba(62,38,15,0.4)]">
          {formatLabel(max)}
        </span>
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function FilterPanel({
  open,
  onClose,
  onApply,
  appliedFilters,
  allTags,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (f: Filters) => void;
  appliedFilters: Filters;
  allTags: string[];
}) {
  // Draft lives inside the panel — only committed when user clicks Apply
  const [draft, setDraft] = useState<Filters>(appliedFilters);
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagSearchRef = useRef<HTMLInputElement>(null);

  // Reset draft to currently applied filters every time the panel opens
  useEffect(() => {
    if (open) {
      setDraft(appliedFilters);
      setTagSearch("");
      setTagDropdownOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setTagDropdownOpen(false);
        setTagSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleTag(tag: string) {
    const next = draft.tags.includes(tag)
      ? draft.tags.filter((t) => t !== tag)
      : [...draft.tags, tag];
    setDraft((d) => ({ ...d, tags: next }));
  }

  const filteredTags = tagSearch.trim()
    ? allTags.filter((t) =>
        t.toLowerCase().includes(tagSearch.toLowerCase())
      )
    : allTags;

  const draftHasChanges =
    JSON.stringify(draft) !== JSON.stringify(appliedFilters);
  const draftIsDefault = !hasActiveFilters(draft);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/20 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(62,38,15,0.08)]">
          <h2 className="text-lg font-bold text-[#3e260f]">Filters</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="#3e260f"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Favorites Only */}
          <button
            onClick={() => setDraft((d) => ({ ...d, favoritesOnly: !d.favoritesOnly }))}
            className="flex items-center gap-3 w-full text-left"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                draft.favoritesOnly
                  ? "bg-[#b9732c] border-[#b9732c]"
                  : "border-[rgba(62,38,15,0.3)]"
              }`}
            >
              {draft.favoritesOnly && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-sm font-semibold text-[#3e260f]">Favorites Only</span>
          </button>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#3e260f] mb-3">Tags</p>
              <div className="relative" ref={tagDropdownRef}>
                {/* Trigger */}
                <button
                  onClick={() => {
                    setTagDropdownOpen((o) => !o);
                    if (!tagDropdownOpen) {
                      setTimeout(() => tagSearchRef.current?.focus(), 50);
                    }
                  }}
                  className="w-full h-10 rounded-lg border border-[rgba(62,38,15,0.2)] bg-white px-3 flex items-center justify-between text-sm text-[#3e260f] hover:border-[#b9732c] transition-colors"
                >
                  <span
                    className={
                      draft.tags.length === 0
                        ? "text-[rgba(62,38,15,0.4)]"
                        : ""
                    }
                  >
                    {draft.tags.length === 0
                      ? "Select tags…"
                      : `${draft.tags.length} tag${draft.tags.length !== 1 ? "s" : ""} selected`}
                  </span>
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    className={`transition-transform flex-shrink-0 ${tagDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M1 1l4 4 4-4"
                      stroke="#3e260f"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {tagDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(62,38,15,0.1)] rounded-lg shadow-lg z-10 flex flex-col max-h-[240px]">
                    {/* Search input */}
                    <div className="px-3 pt-2 pb-1 border-b border-[rgba(62,38,15,0.06)]">
                      <input
                        ref={tagSearchRef}
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="Search tags…"
                        className="w-full h-8 rounded-md border border-[rgba(62,38,15,0.15)] bg-[#f8f0eb] px-3 text-xs text-[#3e260f] placeholder:text-[rgba(62,38,15,0.4)] focus:border-[#b9732c] focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Tag list */}
                    <div className="overflow-y-auto py-1">
                      {filteredTags.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-[rgba(62,38,15,0.4)] text-center">
                          No tags match &ldquo;{tagSearch}&rdquo;
                        </p>
                      ) : (
                        filteredTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors text-left"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                draft.tags.includes(tag)
                                  ? "bg-[#b9732c] border-[#b9732c]"
                                  : "border-[rgba(62,38,15,0.3)]"
                              }`}
                            >
                              {draft.tags.includes(tag) && (
                                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                  <path
                                    d="M1 3L3 5L7 1"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            {tag}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected chips */}
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {draft.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(185,115,44,0.15)] text-xs text-[#905823] hover:bg-[rgba(185,115,44,0.25)] transition-colors"
                    >
                      {tag}
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path
                          d="M1 1L7 7M7 1L1 7"
                          stroke="#905823"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cook Time */}
          <SliderSection
            label="Cook Time (max)"
            value={draft.cookTimeMax}
            min={0}
            max={480}
            step={15}
            onChange={(v) => setDraft((d) => ({ ...d, cookTimeMax: v }))}
            formatLabel={formatTime}
          />

          {/* Prep Time */}
          <SliderSection
            label="Prep Time (max)"
            value={draft.prepTimeMax}
            min={0}
            max={480}
            step={15}
            onChange={(v) => setDraft((d) => ({ ...d, prepTimeMax: v }))}
            formatLabel={formatTime}
          />

          {/* Serves */}
          <SliderSection
            label="Minimum Serves"
            value={draft.servesMin}
            min={1}
            max={8}
            step={1}
            onChange={(v) => setDraft((d) => ({ ...d, servesMin: v }))}
            formatLabel={(v) => (v === 1 ? "Any" : `${v}+`)}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(62,38,15,0.08)] flex items-center gap-3">
          {!draftIsDefault && (
            <button
              onClick={() => setDraft(DEFAULT_FILTERS)}
              className="text-sm text-[rgba(62,38,15,0.5)] hover:text-[#3e260f] transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => onApply(draft)}
            disabled={!draftHasChanges}
            className="flex-1 h-10 rounded-lg bg-[#b9732c] text-white text-sm font-semibold hover:bg-[#a0621f] transition-colors disabled:opacity-40"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
