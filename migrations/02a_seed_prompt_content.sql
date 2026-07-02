-- Title prompt
INSERT OR IGNORE INTO prompt_templates (task, name, description, template_text, variables, created_at)
VALUES (
  'title',
  'AI Title Generator',
  'Generates an SEO‑friendly product title',
  'You are an expert product title writer for an e‑commerce catalogue.

**Task**: Generate a **concise, SEO‑friendly product title** based on the provided data.  
Your title **must**:
- Be between **70 and 80 characters** (strict).
- Start with the **brand** (if provided) and product type.
- Include **key specifications** (screen size, processor, RAM, storage, etc.) but **omit** irrelevant extras (e.g., "Fast Adapter", "WiFi 6", "Dual Speakers").
- **At least one** of the following category keywords must appear in the **first 50 characters**: {{join categoryKeywords ", "}}.
- Do **not** mention condition, warranty, or seller‑specific details.
- Output **only** the title, nothing else.

---
**Original (too long) title**: "{{originalTitle}}"
**Category**: {{categoryName}}
{{#if brand}}**Brand**: {{brand}}{{/if}}
**Key Specifications**: {{#if specifications}}{{#each specifications}}{{this.key}}: {{this.value}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}none{{/if}}
**Category Keywords**: {{join categoryKeywords ", "}}
---

Return **ONLY** the optimised title, no extra text or quotes.',
  '["originalTitle","categoryName","categoryKeywords","specifications","brand"]',
  unixepoch()
);

-- SKU prompt
INSERT OR IGNORE INTO prompt_templates (task, name, description, template_text, variables, created_at)
VALUES (
  'sku',
  'AI SKU Generator',
  'Generates a unique SKU following internal pattern',
  'You are an expert product SKU generator for an e-commerce catalog.

**SKU Format Rules**
- Structure: BRAND-PRODTYPE-SPECS-COLOUR-CONDITION
- Each segment (after splitting by "-") should ideally be ≤4 characters (except condition codes can be longer like EX-REF).
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
{{existingPairs}}

**New Product to Generate SKU For**
- Title: "{{title}}"
- Condition: "{{condition}}" → use condition code: "{{conditionCode}}"

**Task**
Return ONLY the generated SKU string, nothing else. Do not include quotes, explanation, or any other text. Just the SKU.',
  '["title","condition","existingPairs","conditionCode"]',
  unixepoch()
);

-- Paragraphs prompt
INSERT OR IGNORE INTO prompt_templates (task, name, description, template_text, variables, created_at)
VALUES (
  'paragraphs',
  'AI Paragraphs Generator',
  'Writes 2–5 sales‑focused product description paragraphs',
  'You are a professional product copywriter for an e‑commerce store.

**Task**: Write a product description for the following item using 2–5 paragraphs.

---
**Product Title**: "{{title}}"
**Category**: "{{category}}"
**SEO Keywords to include naturally**: {{join keywords ", "}}
**Technical Specifications (for reference, do NOT list them verbatim)**:
{{#each specifications}}{{this.key}}: {{this.value}}
{{/each}}
**Key Features (highlight important ones)**:
{{#each features}}{{this.title}}: {{this.description}}
{{/each}}
---

**CRITICAL RULES (Follow Exactly)**:
- Write 2 to 5 clean paragraphs (no bullet points, no numbered lists).
- Use a professional, clear, and sales-focused tone.
- Naturally incorporate the provided SEO keywords where they fit.
- Reference the product''s key specifications and features in a flowing narrative – do NOT copy-paste the spec list.
- DO NOT mention the product condition (e.g., New, Used, Refurbished).
- DO NOT mention any other storage sizes, colours, or variations not included in the title.
- DO NOT mention warranties, guarantees, or seller-specific offerings.
- DO NOT invent features or specifications not present in the provided data.
- DO NOT use headings, emojis, or any extra commentary.
- Output ONLY the paragraphs, separated by two newlines. No markdown, no quotes.',
  '["title","category","specifications","features","keywords"]',
  unixepoch()
);

-- Features prompt
INSERT OR IGNORE INTO prompt_templates (task, name, description, template_text, variables, created_at)
VALUES (
  'features',
  'AI Features Generator',
  'Generates 3–8 bullet‑style feature descriptions',
  'You are a product listing specialist for an e‑commerce store.

**Task**: Write **3‑8** high‑quality product features for the following item. More is better if there are many distinct selling points.

---
**Product Title**: "{{title}}"
**Category**: "{{category}}"
**SEO Keywords** (use only where they fit naturally): {{join keywords ", "}}
**Technical Specifications** (include the most important ones):
{{#each specifications}}{{this.key}}: {{this.value}}
{{/each}}
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
   No numbering, no extra commentary, no blank lines between entries.',
  '["title","category","specifications","keywords"]',
  unixepoch()
);

-- Note prompt
INSERT OR IGNORE INTO prompt_templates (task, name, description, template_text, variables, created_at)
VALUES (
  'note',
  'AI Note Generator',
  'Extracts factual notes (condition, accessories, defects) from description',
  'You are a product data assistant. Extract only the factual notes from the product description below.

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

{{#if title}}**Product Title**: "{{title}}"{{/if}}
{{#if category}}**Category**: "{{category}}"{{/if}}
**Description**:
{{description}}

**Instructions**:
- Write 1-2 short sentences maximum.
- Keep it factual and concise (under 150 characters if possible).
- If no factual notes exist, return an empty string.
- Output ONLY the note text, nothing else. No quotes, no extra commentary.',
  '["description","title","category"]',
  unixepoch()
);