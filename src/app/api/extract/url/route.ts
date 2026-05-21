import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const PROMPT = `You are extracting structured recipe data from the HTML content of a recipe webpage.

Extract the following and return ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "name": "string (recipe title)",
  "description": "string or null",
  "prep_time": number or null (minutes — convert '1 hour 30 minutes' to 90),
  "cook_time": number or null (minutes),
  "servings": number or null,
  "instructions": "string (instructions broken into discrete logical steps, one per line, each prefixed with its step number and a period — e.g. '1. Preheat the oven to 375°F.\n2. Mix the dry ingredients in a large bowl.'\n\nEven if the source writes instructions as a single paragraph or wall of text, you MUST identify the natural step boundaries — look for sequential actions, changes in cooking method, new equipment, timing shifts, or ingredient additions — and split them into separate numbered steps. Never return instructions as a single unbroken block.)",
  "ingredients": [
    {
      "quantity": "string or null",
      "unit": "string or null",
      "name": "string"
    }
  ]
}

Rules:
- Ignore ads, navigation, comments, and related recipe suggestions
- If the page has no recipe content (login wall, 404, unrelated page), return { "error": "no_recipe_found" }
- Convert all time expressions to minutes as integers
- Preserve the original instruction order and step numbers`;

export async function POST(request: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  let html: string;
  {
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 800;
    let lastError: string | null = null;
    let succeeded = false;
    let resultHtml = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          lastError = `fetch_failed (HTTP ${res.status})`;
          continue;
        }
        resultHtml = await res.text();
        succeeded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "fetch_failed";
      }
    }

    if (!succeeded) {
      console.error("URL fetch failed after retries:", lastError);
      return NextResponse.json({ error: "fetch_failed" }, { status: 400 });
    }
    html = resultHtml;
  }

  // Extract Open Graph image before stripping the head
  const ogImageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const ogImage = ogImageMatch?.[1] ?? null;

  // Strip script/style/head tags to reduce token usage
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 40_000);

  let raw: string;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\nPage content:\n\n${stripped}`,
        },
      ],
    });
    raw = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("Anthropic error (url):", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (ogImage && !parsed.image_url) parsed.image_url = ogImage;
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 422 });
  }
}
