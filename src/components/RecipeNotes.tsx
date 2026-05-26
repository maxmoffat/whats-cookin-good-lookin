"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipeNote } from "@/lib/supabase/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeNotes({
  recipeId,
  initialNotes,
}: {
  recipeId: string;
  initialNotes: RecipeNote[];
}) {
  const [notes, setNotes] = useState<RecipeNote[]>(initialNotes);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSave = !!trimmed && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("recipe_notes")
      .insert({ recipe_id: recipeId, user_id: user.id, content: trimmed })
      .select()
      .single();

    if (insertErr || !data) {
      setError("Failed to save note. Please try again.");
    } else {
      setNotes((prev) => [data as RecipeNote, ...prev]);
      setText("");
    }
    setSaving(false);
  }

  return (
    <section id="notes">
      <h2 className="text-xl font-bold text-[#3e260f] mb-6">Notes</h2>

      {/* ── Input area ── */}
      <div className="mb-10">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
          }}
          placeholder="Add a note…"
          rows={3}
          className="w-full rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2.5 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.35)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c] resize-none leading-[22px]"
        />

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[rgba(62,38,15,0.35)]">⌘ + Enter to save</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`h-[32px] px-4 rounded-[8px] text-sm font-semibold text-white transition-colors ${
              canSave
                ? "bg-[#b9732c] hover:bg-[#a0621f] cursor-pointer"
                : "bg-[#b9732c] opacity-40 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* ── Timeline ── */}
      {notes.length === 0 ? (
        <p className="text-base text-[rgba(62,38,15,0.25)] leading-[32px]">
          No notes added yet.
        </p>
      ) : (
        <div>
          {notes.map((note, i) => (
            <div key={note.id} className="flex gap-4">
              {/* Dot + connector line */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-[#b9732c] flex-shrink-0 mt-[6px]" />
                {i < notes.length - 1 && (
                  <div className="flex-1 w-px bg-[rgba(62,38,15,0.1)] mt-1" />
                )}
              </div>

              {/* Note content */}
              <div className={`flex-1 ${i < notes.length - 1 ? "pb-8" : ""}`}>
                <p className="text-xs text-[rgba(62,38,15,0.4)] mb-1.5 leading-none">
                  {formatNoteDate(note.created_at)}
                </p>
                <p className="text-base text-[#3e260f] leading-[28px] whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
