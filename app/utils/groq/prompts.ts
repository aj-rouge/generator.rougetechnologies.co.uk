// lib/prompts.ts

// ---------- Input Interfaces ----------
export interface GenerateTitleInput {
  originalTitle: string;
  categoryName: string;
  categoryKeywords: string[];
  specifications?: Array<{ key: string; value: string }>;
  brand?: string;
}

export interface GenerateSkuInput {
  title: string;
  condition: string;
  existingPairs: string; // formatted list of existing SKUs with titles
}

export interface GenerateParagraphsInput {
  title: string;
  category?: string;
  specifications?: Array<{ key: string; value: string }>;
  features?: Array<{ title: string; description: string }>;
  keywords?: string[];
}

export interface GenerateFeaturesInput {
  title: string;
  category?: string;
  specifications?: Array<{ key: string; value: string }>;
  keywords?: string[];
}

export interface GenerateNoteInput {
  description: string; // cleaned, plain text
  title?: string;
  category?: string;
}

// ---------- Prompt Builders ----------
export const buildTitlePrompt = (input: GenerateTitleInput): string => {
  const {
    originalTitle,
    categoryName,
    categoryKeywords,
    specifications = [],
    brand,
  } = input;
  const specsStr = specifications.map((s) => `${s.key}: ${s.value}`).join(", ");
  const brandLine = brand ? `**Brand**: ${brand}` : "";

  return `You are an expert product title writer for an e‑commerce catalogue.

**Task**: Generate a **concise, SEO‑friendly product title** based on the provided data.  
Your title **must**:
- Be between **70 and 80 characters** (strict).
- Start with the **brand** (if provided) and product type.
- Include **key specifications** (screen size, processor, RAM, storage, etc.) but **omit** irrelevant extras (e.g., "Fast Adapter", "WiFi 6", "Dual Speakers").
- **At least one** of the following category keywords must appear in the **first 50 characters**: ${categoryKeywords.join(", ")}.
- Do **not** mention condition, warranty, or seller‑specific details.
- Output **only** the title, nothing else.

---
**Original (too long) title**: "${originalTitle}"
**Category**: ${categoryName}
${brandLine}
**Key Specifications**: ${specsStr || "none"}
**Category Keywords**: ${categoryKeywords.join(", ")}
---

Return **ONLY** the optimised title, no extra text or quotes.`;
};

export const buildSkuPrompt = (input: GenerateSkuInput): string => {
  const { title, condition, existingPairs } = input;
  const conditionMap: Record<string, string> = {
    New: "NEW",
    Used: "USE",
    "Excellent Refurbished": "EX-REF",
    "Very Good Refurbished": "VG-REF",
    "Good Refurbished": "GD-REF",
  };
  const conditionCode = conditionMap[condition] || "";

  return `You are an expert product SKU generator for an e-commerce catalog.

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
};

export const buildParagraphsPrompt = (
  input: GenerateParagraphsInput,
): string => {
  const {
    title,
    category,
    specifications = [],
    features = [],
    keywords = [],
  } = input;
  const specsList = specifications
    .map((s) => `${s.key}: ${s.value}`)
    .join("\n");
  const featuresList = features
    .map((f) => `${f.title}: ${f.description}`)
    .join("\n");
  const keywordsList = keywords.join(", ");

  return `You are a professional product copywriter for an e‑commerce store.

**Task**: Write a product description for the following item using 2–5 paragraphs.

---
**Product Title**: "${title}"
**Category**: "${category || "General"}"
**SEO Keywords to include naturally**: ${keywordsList || "none"}
**Technical Specifications (for reference, do NOT list them verbatim)**:
${specsList || "none"}

**Key Features (highlight important ones)**:
${featuresList || "none"}
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
};

export const buildFeaturesPrompt = (input: GenerateFeaturesInput): string => {
  const { title, category, specifications = [], keywords = [] } = input;
  const specsList = specifications
    .map((s) => `${s.key}: ${s.value}`)
    .join("\n");
  const keywordsList = keywords.join(", ");

  return `You are a product listing specialist for an e‑commerce store.

**Task**: Write **3‑8** high‑quality product features for the following item. More is better if there are many distinct selling points.

---
**Product Title**: "${title}"
**Category**: "${category || "General"}"
**SEO Keywords** (use only where they fit naturally): ${keywordsList || "none"}
**Technical Specifications** (include the most important ones):
${specsList || "none"}
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
};

export const buildNotePrompt = (input: GenerateNoteInput): string => {
  const { description, title, category } = input;
  const context = [];
  if (title) context.push(`Product Title: "${title}"`);
  if (category) context.push(`Category: "${category}"`);
  const contextStr = context.length
    ? `\n**Context**:\n${context.join("\n")}\n`
    : "";

  return `You are a product data assistant. Extract only the factual notes from the product description below.

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
${description}

**Instructions**:
- Write 1-2 short sentences maximum.
- Keep it factual and concise (under 150 characters if possible).
- If no factual notes exist, return an empty string.
- Output ONLY the note text, nothing else. No quotes, no extra commentary.`;
};
