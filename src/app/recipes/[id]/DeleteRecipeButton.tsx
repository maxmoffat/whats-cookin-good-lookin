"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipeId);
    router.push("/recipes");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">Sure?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-400 hover:border-red-200 hover:text-red-500 transition-colors"
    >
      Delete
    </button>
  );
}
