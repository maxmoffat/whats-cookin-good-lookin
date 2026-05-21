"use client";

import { useRouter } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import Link from "next/link";
import type { RecipeWithDetails } from "@/lib/supabase/types";

export default function EditRecipeClient({ recipe }: { recipe: RecipeWithDetails }) {
  const router = useRouter();

  function handleSaved(id: string) {
    router.push(`/recipes/${id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-8">
        <Link
          href={`/recipes/${recipe.id}`}
          className="text-sm text-[rgba(62,38,15,0.4)] hover:text-[#3e260f] transition-colors"
        >
          ← Back to recipe
        </Link>
        <h1 className="text-2xl font-bold text-[#3e260f] mt-3">Edit recipe</h1>
      </div>
      <RecipeForm initialData={recipe} recipeId={recipe.id} onSaved={handleSaved} />
    </div>
  );
}
