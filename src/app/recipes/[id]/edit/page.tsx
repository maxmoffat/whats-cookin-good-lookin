import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditRecipeClient from "./EditRecipeClient";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") redirect("/recipes/new");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("recipes")
    .select(`*, ingredients (*), recipe_tags (tags (*))`)
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!data) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const tags = (raw.recipe_tags ?? []).map((rt: { tags: unknown }) => rt.tags).filter(Boolean);

  return <EditRecipeClient recipe={{ ...raw, tags }} />;
}
