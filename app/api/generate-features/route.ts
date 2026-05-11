// app/api/generate-features/route.ts
import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(request: Request) {
  try {
    const { title, category, specifications, keywords } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 },
      );
    }

    const specsList = (specifications || [])
      .map((s: any) => `${s.key}: ${s.value}`)
      .join("\n");

    const keywordsList = (keywords || []).join(", ");

    const prompt = `You are a product listing specialist for an e‑commerce store.

**Task**: Write **3‑8** high‑quality product features for the following item. More is better if there are many distinct selling points.

---
**Product Title**: "${title}"
**Category**: "${category}"
**SEO Keywords** (use only where they fit naturally): ${keywordsList || "none"}
**Technical Specifications** (include the most important ones):
${specsList}
---

**STRICT RULES**:
1. Start each feature with a short, title (≤8 words), followed by a colon and a benefit‑driven description (≤25 words).
2. Highlight the product’s **key specifications** – do not genericise them. If the specs mention “4PASS dye sublimation”, “38‑sheet bundle”, “protective coating”, use those exact terms.
3. SEO keywords must be **woven naturally** into the descriptions. Never force a keyword if it ruins the flow. Accuracy and readability come first.
4. Use a professional, enthusiastic, sales‑focused tone.
5. Do NOT mention the product condition (New, Used, refurbished, etc.), warranties, or seller‑specific guarantees.
6. Do NOT invent specifications or features that are not supported by the data.
7. Output ONLY the features, one per line, in the exact format:
   Feature title: Description
   No numbering, no extra commentary, no blank lines between entries.`;

    // --- LOGGING: print the final prompt sent to Groq ---
    console.log("========================================");
    console.log("🤖 FINAL PROMPT SENT TO GROQ (Features):");
    console.log("----------------------------------------");
    console.log(`Model: ${GROQ_MODEL}`);
    console.log(`Product Title: ${title}`);
    console.log(`Category: ${category}`);
    console.log(`Specifications count: ${specifications.length}`);
    console.log(`SEO Keywords: ${keywordsList}`);
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
          temperature: 0.4,
          max_tokens: 800,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error response:", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Groq API response (Features):", JSON.stringify(data, null, 2));

    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) throw new Error("Groq returned empty response");

    const lines = rawText.split("\n").filter((line: string) => line.trim());
    const features = lines
      .map((line: string) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) {
          return { title: line, description: "" };
        }
        const title = line.substring(0, colonIndex).trim();
        const description = line.substring(colonIndex + 1).trim();
        return { title, description };
      })
      .filter((f: any) => f.title && f.description);

    const finalFeatures = features.slice(0, 8);
    if (finalFeatures.length < 3) {
      throw new Error("Generated fewer than 3 valid features");
    }

    console.log(`✅ Generated Features: ${finalFeatures.length} items`);
    console.log(
      finalFeatures.map((f: any) => `${f.title}: ${f.description}`).join("\n"),
    );

    return NextResponse.json({ features: finalFeatures });
  } catch (error: any) {
    console.error("Feature generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate features" },
      { status: 500 },
    );
  }
}
