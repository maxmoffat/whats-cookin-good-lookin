import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import RecipeActions from "./RecipeActions";

function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function RecipePage({
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
  const recipe = data as any;
  const tags = (recipe.recipe_tags ?? []).map((rt: { tags: unknown }) => rt.tags).filter(Boolean) as Array<{ id: string; name: string }>;
  const ingredients = (recipe.ingredients ?? []) as Array<{ id: string; quantity: string | null; unit: string | null; name: string }>;
  const steps = recipe.instructions
    ? recipe.instructions
        .split(/\n+/)
        .map((s: string) => s.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-[#3e260f] mb-6 hover:opacity-70 transition-opacity"
      >
        <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
          <path d="M6 1L1 5.5L6 10" stroke="#3e260f" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </Link>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-[#3e260f] leading-tight mb-3">
            {recipe.name}
          </h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 rounded bg-[rgba(185,115,44,0.2)] text-[#905823] text-xs"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 mt-1">
          <RecipeActions recipeId={id} />
        </div>
      </div>

      {/* Hero image */}
      {recipe.image_url && (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden mb-10">
          <Image
            src={recipe.image_url}
            alt={recipe.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center bg-white/75 border border-[rgba(62,38,15,0.1)] rounded-xl px-4 sm:px-8 py-0 mb-10 divide-x divide-[rgba(62,38,15,0.08)] min-h-[72px] sm:min-h-[94px]">
        {[
          { icon: "/icons/ingredients.svg", label: "Ingredients", value: ingredients.length > 0 ? String(ingredients.length) : "—" },
          { icon: "/icons/prep-time.svg",   label: "Prep Time",   value: formatTime(recipe.prep_time) },
          { icon: "/icons/cook-time.svg",   label: "Cook Time",   value: formatTime(recipe.cook_time) },
          { icon: "/icons/serves.svg",      label: "Serves",      value: recipe.servings ? String(recipe.servings) : "—" },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex-1 flex items-center gap-2 sm:gap-4 px-3 sm:px-8 first:pl-0 last:pr-0">
            <img src={icon} alt="" className="w-5 h-5 sm:w-8 sm:h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-[#3e260f] leading-tight mb-0.5 sm:mb-1 truncate">{label}</p>
              <p className="text-sm sm:text-base font-semibold text-[#3e260f] leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex gap-0 pb-20">
        {/* Jump to section sidebar — hidden on mobile */}
        <div className="hidden sm:block w-[190px] shrink-0 pr-8">
          <p className="text-sm font-semibold text-[#3e260f] mb-4">Jump to Section</p>
          <nav className="flex flex-col gap-3">
            <a href="#ingredients" className="text-sm text-[#b9732c] underline underline-offset-2 hover:opacity-70 transition-opacity">Ingredient List</a>
            <a href="#instructions" className="text-sm text-[#b9732c] underline underline-offset-2 hover:opacity-70 transition-opacity">Instructions</a>
            <a href="#notes" className="text-sm text-[#b9732c] underline underline-offset-2 hover:opacity-70 transition-opacity">Notes</a>
          </nav>
        </div>

        {/* Vertical divider — hidden on mobile */}
        <div className="hidden sm:block w-px bg-[rgba(62,38,15,0.1)] self-stretch shrink-0" />

        {/* Main content */}
        <div className="flex-1 pl-0 sm:pl-10 space-y-12">

          {/* Ingredient list */}
          {ingredients.length > 0 && (
            <section id="ingredients">
              <h2 className="text-xl font-bold text-[#3e260f] mb-6">Ingredient List</h2>
              <ul className="space-y-0 list-disc list-inside">
                {ingredients.map((ing) => (
                  <li key={ing.id} className="text-base text-[#3e260f] leading-[32px]">
                    {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {steps.length > 0 && (
            <section id="instructions">
              <h2 className="text-xl font-bold text-[#3e260f] mb-6">Instructions</h2>
              <ol className="space-y-6">
                {steps.map((step: string, i: number) => (
                  <li key={i} className="flex gap-4">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#b9732c] text-white text-xs font-bold flex items-center justify-center mt-1">
                      {i + 1}
                    </span>
                    <p className="text-base text-[#3e260f] leading-[32px]">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Notes */}
          <section id="notes">
            <h2 className="text-xl font-bold text-[#3e260f] mb-4">Notes</h2>
            <p className="text-base text-[rgba(62,38,15,0.25)] leading-[32px]">
              No notes added yet for this recipe.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
