// app/api/generate-title/route.ts
import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

interface TitleRequestBody {
  originalTitle: string;
  categoryName: string;
  categoryKeywords: string[];
  specifications?: Array<{ key: string; value: string }>;
  brand?: string;
}

interface GroqTitleApiResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TitleRequestBody;
    const {
      originalTitle,
      categoryName,
      categoryKeywords,
      specifications = [],
      brand,
    } = body;

    if (!originalTitle) {
      return NextResponse.json(
        { error: "Original title is required" },
        { status: 400 },
      );
    }

    const specsStr = specifications
      .map((s) => `${s.key}: ${s.value}`)
      .join(", ");

    const brandLine = brand ? `**Brand**: ${brand}` : "";

    const prompt = `You are an expert product title writer for an e‑commerce catalogue.

**Task**: Generate a **concise, SEO‑friendly product title** based on the provided data.  
Your title **must**:
- Be between **70 and 80 characters** (strict).
- Start with the **brand** (if provided) and product type.
- Include **key specifications** (screen size, processor, RAM, storage, etc.) but **omit** irrelevant extras (e.g., "Fast Adapter", "WiFi 6", "Dual Speakers").
- **At least one** of the following category keywords must appear in the **first 50 characters**: ${categoryKeywords.join(", ")}.
- Do **not** mention condition, warranty, or seller‑specific details.
- Output **only the title**, nothing else.

---
**Original (too long) title**: "${originalTitle}"
**Category**: ${categoryName}
${brandLine}
**Key Specifications**: ${specsStr || "none"}
**Category Keywords**: ${categoryKeywords.join(", ")}
---

Return **ONLY** the optimised title, no extra text or quotes.`;

    console.log("🤖 [generate-title] Sending prompt to Groq");

    if (!GROQ_API_KEY) {
      throw new Error("Missing Groq API key");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 60,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as GroqTitleApiResponse;
    const rawTitle = data.choices?.[0]?.message?.content?.trim();
    if (!rawTitle) throw new Error("Empty response from Groq");

    // Clean up quotes
    const cleanTitle = rawTitle.replace(/^["']|["']$/g, "").trim();

    // Optional: if still too long, you can truncate, but we trust AI
    console.log(
      `✅ Generated title: ${cleanTitle} (${cleanTitle.length} chars)`,
    );

    return NextResponse.json({ title: cleanTitle });
  } catch (error: any) {
    console.error("Title generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate title" },
      { status: 500 },
    );
  }
}
