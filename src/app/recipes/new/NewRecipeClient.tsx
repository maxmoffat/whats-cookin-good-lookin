"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedRecipe } from "@/lib/supabase/types";
import RecipeForm from "@/components/RecipeForm";
import Link from "next/link";

type State = "loading" | "ready" | "empty";

export default function NewRecipeClient() {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [prefill, setPrefill] = useState<ExtractedRecipe | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("wcgl_prefill");
    if (stored) {
      try {
        setPrefill(JSON.parse(stored));
        setState("ready");
      } catch {
        sessionStorage.removeItem("wcgl_prefill");
        setState("empty");
      }
    } else {
      setState("empty");
    }
  }, []);

  // If no prefill data, redirect to recipes list
  useEffect(() => {
    if (state === "empty") {
      router.replace("/recipes");
    }
  }, [state, router]);

  function handleSaved(id: string) {
    sessionStorage.removeItem("wcgl_prefill");
    router.push(`/recipes/${id}`);
    router.refresh();
  }

  if (state === "loading" || state === "empty") {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Back link */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-[#3e260f] mb-6 hover:opacity-70 transition-opacity"
      >
        <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
          <path
            d="M6 1L1 5.5L6 10"
            stroke="#3e260f"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-[#3e260f] leading-tight">
          Review your recipe
        </h1>
        <p className="text-[rgba(62,38,15,0.5)] text-sm mt-1">
          Check the details and make any edits before saving.
        </p>
      </div>

      <RecipeForm initialData={prefill ?? undefined} onSaved={handleSaved} />
    </div>
  );
}
