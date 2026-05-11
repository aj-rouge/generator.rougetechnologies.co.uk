import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(request: Request) {
  try {
    const { title, category, specifications, features, keywords } =
      await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 },
      );
    }

    // Format specifications as a list (key: value)
    const specsList = (specifications || [])
      .map((s: any) => `${s.key}: ${s.value}`)
      .join("\n");

    // Format features as a bullet-like list (but we'll only use the text)
    const featuresList = (features || [])
      .map((f: any) => `${f.title}: ${f.description}`)
      .join("\n");

    const keywordsList = (keywords || []).join(", ");

    const prompt = `You are a professional product copywriter for an e‑commerce store.

**Task**: Write a product description for the following item using 2–5 paragraphs.

---
**Product Title**: "${title}"
**Category**: "${category}"
**SEO Keywords to include naturally**: ${keywordsList || "none"}
**Technical Specifications (for reference, do NOT list them verbatim)**:
${specsList}

**Key Features (highlight important ones)**:
${featuresList}
---

**CRITICAL RULES (Follow Exactly)**:
- Write 2 to 5 clean paragraphs (no bullet points, no numbered lists).
- Use a professional, clear, and sales-focused tone.
- Naturally incorporate the provided SEO keywords where they fit.
- Reference the product's key specifications and features in a flowing narrative – do NOT copy-paste the spec list.
- DO NOT mention the product condition (e.g., New, Used, Refurbished).
- DO NOT mention any other storage sizes, colours, or variations not included in the title.
- DO NOT mention warranties, guarantees, or seller-specific offerings.
- DO NOT invent features or specifications not present in the provided data.
- DO NOT use headings, emojis, or any extra commentary.
- Output ONLY the paragraphs, separated by two newlines. No markdown, no quotes.`;

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
          temperature: 0.5,
          max_tokens: 800,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) throw new Error("Groq returned empty response");

    // Split into paragraphs by two newlines, filter out empty strings
    let paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    // Limit to 5 paragraphs maximum
    paragraphs = paragraphs.slice(0, 5);

    // Basic validation: each paragraph should be at least 100 characters
    const shortParagraphs = paragraphs.filter((p: string) => p.length < 100);
    if (shortParagraphs.length > 0) {
      throw new Error("Generated paragraphs are too short – try regenerating.");
    }

    return NextResponse.json({ paragraphs });
  } catch (error: any) {
    console.error("Paragraph generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate paragraphs" },
      { status: 500 },
    );
  }
}
