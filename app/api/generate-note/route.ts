// app/api/generate-note/route.ts
import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "openai/gpt-oss-20b";

export async function POST(request: Request) {
  try {
    const { description, title, category } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Product description is required" },
        { status: 400 },
      );
    }

    // Clean description: remove HTML tags, collapse whitespace, limit length
    const cleaned = description
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    if (!cleaned) {
      return NextResponse.json({ note: null });
    }

    const context = [];
    if (title) context.push(`Product Title: "${title}"`);
    if (category) context.push(`Category: "${category}"`);
    const contextStr = context.length
      ? `\n**Context**:\n${context.join("\n")}\n`
      : "";

    const prompt = `You are a product data assistant. Extract only the factual notes from the product description below.

Focus on:
- Condition details (e.g., "used with minor scratches", "sealed", "not working")
- Included accessories (e.g., "comes with original box", "no strap")
- Defects or missing parts (e.g., "screen cracked", "charging port damaged")
- Special remarks (e.g., "battery health 98%", "locked to business account")

Do NOT include:
- Marketing language or sales pitch
- Main product specifications (already handled separately)
- HTML tags
- Seller guarantees or warranties

${contextStr}
**Description**:
${cleaned}

**Instructions**:
- Write 1-2 short sentences maximum.
- Keep it factual and concise (under 150 characters if possible).
- If no factual notes exist, return an empty string.
- Output ONLY the note text, nothing else. No quotes, no extra commentary.`;

    console.log("========================================");
    console.log("🤖 FINAL PROMPT SENT TO GROQ (Note):");
    console.log("----------------------------------------");
    console.log(`Model: ${GROQ_MODEL}`);
    console.log(`Title: ${title || "(none)"}`);
    console.log(`Category: ${category || "(none)"}`);
    console.log(`Description length: ${cleaned.length} chars`);
    console.log("-------- PROMPT BODY --------");
    console.log(prompt);
    console.log("========================================");

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
          max_tokens: 150,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error response (Note):", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Groq API response (Note):", JSON.stringify(data, null, 2));

    let note = data.choices?.[0]?.message?.content?.trim() || "";
    // If note is empty or just punctuation, return null
    if (!note || note.length < 3) note = null;

    console.log(`✅ Generated note: ${note || "(none)"}`);
    return NextResponse.json({ note });
  } catch (error: any) {
    console.error("Note generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate note" },
      { status: 500 },
    );
  }
}
