// app/api/generate-sku/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface SkuRequestBody {
  title?: string;
  condition?: string;
}

interface SkuProductRow {
  sku: string;
  title: string;
}

interface GroqSkuApiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  [key: string]: any;
}

export async function POST(request: Request) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  try {
    const body = (await request.json()) as SkuRequestBody;
    const { title, condition } = body;

    if (!title || !condition) {
      return NextResponse.json(
        { error: "Title and condition parameters are required" },
        { status: 400 },
      );
    }

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

    // 2. Fetch existing SKUs – pass db
    const allSkus = (await executeQuery(
      `SELECT sku, title FROM products WHERE sku IS NOT NULL ORDER BY updated_at DESC LIMIT 100`,
      [],
      db,
    )) as SkuProductRow[];

    const existingPairs =
      Array.isArray(allSkus) && allSkus.length > 0
        ? allSkus.map((p) => `- SKU: ${p.sku} (Title: ${p.title})`).join("\n")
        : "- No current SKU examples available in repository index.";

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

    console.log("🤖 [generate-sku] Forwarding request to Groq");

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
          temperature: 0.2,
          max_tokens: 20,
          stop: ["\n"],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GroqSkuApiResponse;
    const rawSku = data.choices?.[0]?.message?.content?.trim();
    if (!rawSku) throw new Error("Empty response from Groq");

    const cleanSku = rawSku.replace(/^["']|["']$/g, "").trim();

    if (cleanSku.split("-").length < 3 || cleanSku.length > 40) {
      throw new Error(`Invalid SKU format: ${cleanSku}`);
    }

    console.log(`✅ Generated SKU: ${cleanSku}`);
    return NextResponse.json({ sku: cleanSku });
  } catch (error: any) {
    console.error("💥 SKU generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate SKU" },
      { status: 500 },
    );
  }
}
