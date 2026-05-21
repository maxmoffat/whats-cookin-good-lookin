import { createClient } from "@/lib/supabase/server";
import RecipesClient from "./RecipesClient";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rawRecipes } = await supabase
    .from("recipes")
    .select(`*, ingredients (*), recipe_tags (tags (*))`)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipes = ((rawRecipes ?? []) as any[]).map((r) => ({
    ...r,
    tags: (r.recipe_tags ?? []).map((rt: { tags: unknown }) => rt.tags).filter(Boolean),
  }));

  return <RecipesClient recipes={recipes} />;
}
