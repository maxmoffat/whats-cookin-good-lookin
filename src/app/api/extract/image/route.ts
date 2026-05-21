import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const PROMPT = `You are extracting structured recipe data from an image of a recipe (cookbook page, handwritten card, printed sheet, etc.).

Extract the following and return ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "name": "string (recipe title)",
  "description": "string or null (brief description if present)",
  "prep_time": number or null (minutes),
  "cook_time": number or null (minutes),
  "servings": number or null,
  "instructions": "string (instructions broken into discrete logical steps, one per line, each prefixed with its step number and a period — e.g. '1. Preheat the oven to 375°F.\n2. Mix the dry ingredients in a large bowl.'\n\nEven if the source writes instructions as a single paragraph or wall of text, you MUST identify the natural step boundaries — look for sequential actions, changes in cooking method, new equipment, timing shifts, or ingredient additions — and split them into separate numbered steps. Never return instructions as a single unbroken block.)",
  "ingredients": [
    {
      "quantity": "string or null (e.g. '1/2', '2', 'a handful')",
      "unit": "string or null (e.g. 'cup', 'tbsp', 'oz')",
      "name": "string (ingredient name, e.g. 'all-purpose flour')"
    }
  ],
  "confidence": "high" | "medium" | "low"
}

Rules:
- If a field isn't visible or legible, use null — never guess
- Split quantity and unit from the ingredient name
- If the image doesn't contain a recipe, return { "error": "not_a_recipe" }
- If text is partially illegible, still extract what you can and set confidence to "low"`;

export async function POST(request: Request) {
  const { imageBase64, mediaType } = await request.json();

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return NextResponse.json({ error: "invalid_media_type" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let raw: string;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    raw = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("Anthropic error (image):", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return NextResponse.json(JSON.parse(cleaned));
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 422 });
  }
}
