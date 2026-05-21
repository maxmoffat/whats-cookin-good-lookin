"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { ExtractedRecipe, RecipeWithDetails } from "@/lib/supabase/types";
import TagInput from "@/components/TagInput";

type IngredientRow = { quantity: string; unit: string; name: string };

interface RecipeFormProps {
  initialData?: ExtractedRecipe | Partial<RecipeWithDetails>;
  recipeId?: string;
  onSaved: (id: string) => void;
}

function toRows(
  ingredients: Array<{ quantity?: string | null; unit?: string | null; name: string }>
): IngredientRow[] {
  return ingredients.map((i) => ({
    quantity: i.quantity ?? "",
    unit: i.unit ?? "",
    name: i.name,
  }));
}

function parseSteps(instructions: string | null | undefined): string[] {
  if (!instructions?.trim()) return [""];
  const lines = instructions
    .split(/\n+/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [""];
}

async function uploadImageToStorage(file: File): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("recipe-images").upload(path, file);
  if (error) { console.error("Image upload error:", error); return null; }
  const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function RecipeForm({ initialData, recipeId, onSaved }: RecipeFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [prepTime, setPrepTime] = useState(String(initialData?.prep_time ?? ""));
  const [cookTime, setCookTime] = useState(String(initialData?.cook_time ?? ""));
  const [servings, setServings] = useState(String(initialData?.servings ?? ""));
  const [steps, setSteps] = useState<string[]>(parseSteps(initialData?.instructions));
  const [sourceUrl] = useState(
    (initialData as ExtractedRecipe & { source_url?: string })?.source_url ?? ""
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.ingredients && initialData.ingredients.length > 0
      ? toRows(initialData.ingredients as Array<{ quantity?: string | null; unit?: string | null; name: string }>)
      : [{ quantity: "", unit: "", name: "" }]
  );
  const [tags, setTags] = useState<string[]>(
    (initialData as RecipeWithDetails)?.tags?.map((t) => t.name) ?? []
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    (initialData as RecipeWithDetails)?.image_url ??
    (initialData as ExtractedRecipe & { image_url?: string })?.image_url ??
    null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confidence = (initialData as ExtractedRecipe)?.confidence;

  // ── Ingredient helpers ──────────────────────────────────────────────────────
  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { quantity: "", unit: "", name: "" }]);
  }, []);

  const removeIngredient = useCallback((i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const updateIngredient = useCallback(
    (i: number, field: keyof IngredientRow, value: string) => {
      setIngredients((prev) =>
        prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  // ── Step helpers ────────────────────────────────────────────────────────────
  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  }

  // ── Image helpers ───────────────────────────────────────────────────────────
  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageUploading(true);
    const url = await uploadImageToStorage(file);
    if (url) setImageUrl(url);
    setImageUploading(false);
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setSaving(false); return; }

    const validSteps = steps.filter((s) => s.trim());
    const recipeData = {
      user_id: user.id,
      name: name.trim(),
      description: null,
      prep_time: prepTime ? parseInt(prepTime) : null,
      cook_time: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : null,
      instructions: validSteps.length > 0 ? validSteps.join("\n") : null,
      source_url: sourceUrl.trim() || null,
      image_url: imageUrl,
    };

    let savedId = recipeId;

    if (recipeId) {
      const { error: updateErr } = await supabase
        .from("recipes")
        .update(recipeData)
        .eq("id", recipeId);
      if (updateErr) { setError(updateErr.message); setSaving(false); return; }
    } else {
      const { data, error: insertErr } = await supabase
        .from("recipes")
        .insert(recipeData)
        .select("id")
        .single();
      if (insertErr || !data) { setError(insertErr?.message ?? "Failed to save"); setSaving(false); return; }
      savedId = data.id;
    }

    if (!savedId) { setError("No recipe ID"); setSaving(false); return; }

    // Replace ingredients
    await supabase.from("ingredients").delete().eq("recipe_id", savedId);
    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length > 0) {
      await supabase.from("ingredients").insert(
        validIngredients.map((i, idx) => ({
          recipe_id: savedId!,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          unit: i.unit.trim() || null,
          sort_order: idx,
        }))
      );
    }

    // Replace tags
    await supabase.from("recipe_tags").delete().eq("recipe_id", savedId);
    for (const tagName of tags) {
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", tagName)
        .single();

      let tagId = existingTag?.id;
      if (!tagId) {
        const { data: newTag } = await supabase
          .from("tags")
          .insert({ user_id: user.id, name: tagName })
          .select("id")
          .single();
        tagId = newTag?.id;
      }
      if (tagId) {
        await supabase.from("recipe_tags").insert({ recipe_id: savedId, tag_id: tagId });
      }
    }

    onSaved(savedId);
  }

  const inputClass =
    "w-full rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.4)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]";

  const labelClass = "block text-sm font-semibold text-[#3e260f] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {confidence === "low" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Low confidence scan</strong> — some fields may be incomplete. Please review before saving.
        </div>
      )}

      {/* Recipe name */}
      <div>
        <label className={labelClass}>
          Recipe name <span className="text-red-400">*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Grandma's Chicken Soup"
          className={inputClass}
        />
      </div>

      {/* Cover image */}
      <div>
        <label className={labelClass}>Cover Image</label>
        {imageUrl ? (
          <div className="relative rounded-xl overflow-hidden aspect-[16/9] w-full bg-stone-100">
            <Image src={imageUrl} alt="Cover" fill className="object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center text-[#3e260f] shadow-sm transition-colors text-base leading-none"
            >
              ×
            </button>
          </div>
        ) : (
          <label
            className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[#b9732c] bg-[rgba(185,115,44,0.05)]"
                : "border-[rgba(62,38,15,0.2)] hover:border-[#b9732c]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleImageDrop}
          >
            {imageUploading ? (
              <p className="text-sm text-[rgba(62,38,15,0.5)]">Uploading…</p>
            ) : (
              <>
                <p className="font-semibold text-[#3e260f] text-sm">Drop a photo here</p>
                <p className="text-xs text-[rgba(62,38,15,0.4)] mt-1">or click to browse · JPG or PNG</p>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
              disabled={imageUploading}
            />
          </label>
        )}
      </div>

      {/* Prep / Cook / Serves */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Prep (min)</label>
          <input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className={inputClass} placeholder="15" />
        </div>
        <div>
          <label className={labelClass}>Cook (min)</label>
          <input type="number" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} className={inputClass} placeholder="30" />
        </div>
        <div>
          <label className={labelClass}>Serves</label>
          <input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} className={inputClass} placeholder="4" />
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass.replace(" mb-1.5", "")}>Ingredients</label>
          <button type="button" onClick={addIngredient} className="text-xs text-[#b9732c] hover:text-[#a0621f] font-semibold transition-colors">
            + Add ingredient
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                placeholder="1/2"
                className="w-16 rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-2 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.3)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c] text-center"
              />
              <input
                value={ing.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                placeholder="cup"
                className="w-20 rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-2 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.3)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
              />
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="all-purpose flour"
                className="flex-1 rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.4)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
              />
              {ingredients.length > 1 && (
                <button type="button" onClick={() => removeIngredient(i)} className="text-[rgba(62,38,15,0.3)] hover:text-red-400 transition-colors text-xl leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass.replace(" mb-1.5", "")}>Instructions</label>
          <button type="button" onClick={addStep} className="text-xs text-[#b9732c] hover:text-[#a0621f] font-semibold transition-colors">
            + Add step
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(185,115,44,0.2)] text-[#905823] text-xs font-bold flex items-center justify-center mt-2">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                rows={2}
                placeholder={`Step ${i + 1}…`}
                className={`flex-1 ${inputClass} resize-none`}
              />
              {steps.length > 1 && (
                <button type="button" onClick={() => removeStep(i)} className="text-[rgba(62,38,15,0.3)] hover:text-red-400 transition-colors text-xl leading-none mt-2">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags</label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || imageUploading}
          className="rounded-lg bg-[#b9732c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0621f] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : recipeId ? "Save changes" : "Save recipe"}
        </button>
      </div>
    </form>
  );
}
