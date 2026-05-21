"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ value, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [userTags, setUserTags] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("tags")
        .select("name")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setUserTags(data.map((t) => t.name));
        });
    });
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = userTags.filter(
    (t) => !value.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  );

  const showNewOption =
    input.trim() &&
    !userTags.includes(input.trim().toLowerCase()) &&
    !value.includes(input.trim().toLowerCase());

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[42px] w-full rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:border-[#b9732c] focus-within:ring-1 focus-within:ring-[#b9732c] transition-colors"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(185,115,44,0.2)] text-[#905823] text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((t) => t !== tag)); }}
              className="hover:text-red-500 leading-none transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[120px] text-sm text-[#3e260f] outline-none bg-transparent placeholder:text-[rgba(62,38,15,0.4)]"
        />
      </div>

      {open && (suggestions.length > 0 || showNewOption) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[rgba(34,34,34,0.15)] shadow-lg z-20 max-h-48 overflow-y-auto">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
              className="w-full text-left px-3 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
            >
              {tag}
            </button>
          ))}
          {showNewOption && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(input); }}
              className={`w-full text-left px-3 py-2 text-sm text-[#b9732c] font-medium hover:bg-[#f8f0eb] transition-colors ${suggestions.length > 0 ? "border-t border-[rgba(34,34,34,0.08)]" : ""}`}
            >
              + Add &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
