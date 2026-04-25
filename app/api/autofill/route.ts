import { NextResponse } from "next/server";
import OpenAI from "openai";

// Use Groq's OpenAI‑compatible endpoint
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Recommended free models:
// - 'llama-3.3-70b-versatile' (best quality)
// - 'mixtral-8x7b-32768' (good, faster)
const MODEL = process.env.AUTOFILL_MODEL || "llama-3.3-70b-versatile";

/**
 * Safely extract JSON from LLM response that may contain markdown fences
 */
function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "");
  // Try to find first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}
const formatSnippet = (text) => {
  if (!text) return "";
  // Remove special characters, uppercase it, take first 3-4 chars
  return text
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 4);
};

const mapConditionToSku = (condition) => {
  const map = {
    New: "NEW",
    "Open Box": "ONU",
    Refurbished: "REF",
    Used: "USE",
    "Manufacturer Refurbished": "REF",
    "Seller Refurbished": "SER",
    "For parts or not working": "PAR",
    "Like New": "LIK",
  };
  return map[condition] || "NEW";
};
export const suggestSkuFromTitle = (title, condition) => {
  if (!title) return "";

  const words = title.trim().split(/\s+/);
  const brand = formatSnippet(words[0]); // First word usually brand
  const type = formatSnippet(words[1]); // Second word usually type

  // Grab the "middle" parts as specs (if they exist)
  const specs = words
    .slice(2, -1)
    .map((w) => formatSnippet(w))
    .filter((w) => w.length > 0)
    .join("-");

  // Last word is often the color
  const color = words.length > 2 ? formatSnippet(words[words.length - 1]) : "";

  const cond = mapConditionToSku(condition);

  // Filter out empty parts and join with dashes
  return [brand, type, specs, color, cond]
    .filter((part) => part && part.length > 0)
    .join("-");
};
export async function POST(req: Request) {
  try {
    const { section, categoryKeywords, existingData } = await req.json();

    // SKU generation uses your existing rule‑based logic (no LLM)
    if (section === "sku") {
      // dynamic import to avoid circular dependencies
      const { title, condition } = existingData;
      if (!title || !condition) {
        return NextResponse.json(
          { error: "Missing title or condition" },
          { status: 400 },
        );
      }
      const sku = suggestSkuFromTitle(title, condition);
      return NextResponse.json({ sku });
    }

    // Prompts for each section (no response_format, we'll instruct JSON only)
    const prompts: Record<string, string> = {
      title: `Generate an SEO product title (50-80 characters). Include at least one keyword early. Return ONLY valid JSON: {"title": string}`,
      paragraphs: `Generate 2-4 detailed paragraphs (each 160+ chars) describing the product. Return ONLY valid JSON: {"paragraphs": string[]}`,
      features: `Generate 5-8 product features. Each feature has a short title and a description. Return ONLY valid JSON: {"features": [{"title": string, "description": string}]}`,
      specifications: `Generate 6-10 technical specifications (key-value pairs). Return ONLY valid JSON: {"specifications": [{"key": string, "value": string}]}`,
      full: `You are an expert e‑commerce copywriter. Return ONLY valid JSON with: title, paragraphs, features, specifications, condition (choose from "New","Used","Refurbished"), note (optional string).`,
    };

    const systemPrompt = prompts[section] || prompts.full;
    const userMessage = `Category keywords: ${categoryKeywords?.join(", ") || "none"}. Existing product data: ${JSON.stringify(existingData)}`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      // Groq does NOT support response_format for all models – we parse JSON from text
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from LLM");

    // Parse the JSON (cleaning markdown if any)
    const parsedData = extractJSON(content);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Autofill error:", error);
    const status = error.status === 429 ? 429 : 500;
    const message =
      status === 429
        ? "Free tier limit reached. Please try again later."
        : "Failed to generate content.";
    return NextResponse.json({ error: message }, { status });
  }
}
