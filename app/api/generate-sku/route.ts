// app/api/generate-sku/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile"; // current production model as of May 2026

export async function POST(request: Request) {
  try {
    const { title, condition } = await request.json();

    if (!title || !condition) {
      return NextResponse.json(
        { error: "Title and condition are required" },
        { status: 400 },
      );
    }

    // Map condition to SKU abbreviation
    const conditionMap: Record<string, string> = {
      New: "NEW",
      Used: "USE",
      "Excellent Refurbished": "EX-REF",
      "Very Good Refurbished": "VG-REF",
      "Good Refurbished": "GD-REF",
    };
    const conditionCode = conditionMap[condition];
    if (!conditionCode) {
      return NextResponse.json(
        { error: `Unsupported condition: ${condition}` },
        { status: 400 },
      );
    }

    // Fetch existing SKUs for context (limit to 200)
    const allSkus = await executeQuery(
      `SELECT sku, title FROM products WHERE sku IS NOT NULL ORDER BY updated_at DESC LIMIT 200`,
    );
    const existingPairs = allSkus
      .map((p: any) => `- SKU: ${p.sku} (Title: ${p.title})`)
      .join("\n");

    const prompt = `You are an expert product SKU generator for an e-commerce catalog.

**SKU Format Rules**
- Structure: BRAND-PRODTYPE-SPECS-COLOUR-CONDITION
- Each segment (after splitting by "-") should ideally be ≤4 characters (except condition codes which can be longer like EX-REF).
- Total length ideally <30 characters, maximum 40 if needed.
- Condition codes (last segment):
  - NEW = New
  - USE = Used
  - EX-REF = Excellent Refurbished
  - VG-REF = Very Good Refurbished
  - GD-REF = Good Refurbished
- Use only uppercase letters, numbers, and hyphens.
- Derive brand, product type, key specs, and colour from the product title.
- Make the SKU unique and consistent with existing patterns.

**Existing SKUs (for pattern reference)**
${existingPairs}

**New Product to Generate SKU For**
- Title: "${title}"
- Condition: "${condition}" → use condition code: "${conditionCode}"

**Task**
Return ONLY the generated SKU string, nothing else. Do not include quotes, explanation, or any other text. Just the SKU.`;

    // --- LOGGING: print the final prompt sent to Groq ---
    console.log("========================================");
    console.log("🤖 FINAL PROMPT SENT TO GROQ:");
    console.log("----------------------------------------");
    console.log(`Model: ${GROQ_MODEL}`);
    console.log(`Product Title: ${title}`);
    console.log(`Condition: ${condition} → ${conditionCode}`);
    console.log(`Existing SKU examples: ${allSkus.length}`);
    console.log("-------- PROMPT BODY --------");
    console.log(prompt);
    console.log("========================================");

    // --- Call Groq API ---
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
          temperature: 0.2,
          max_tokens: 20,
          stop: ["\n"],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error response:", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Groq API response:", JSON.stringify(data, null, 2));

    const rawSku = data.choices?.[0]?.message?.content?.trim();
    if (!rawSku) throw new Error("Groq returned empty response");

    const cleanSku = rawSku.replace(/^["']|["']$/g, "").trim();

    if (cleanSku.split("-").length < 3 || cleanSku.length > 40) {
      throw new Error(
        `Generated SKU does not meet length/format requirements: ${cleanSku}`,
      );
    }

    console.log(`✅ Generated SKU: ${cleanSku}`);
    return NextResponse.json({ sku: cleanSku });
  } catch (error: any) {
    console.error("SKU generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate SKU" },
      { status: 500 },
    );
  }
}
