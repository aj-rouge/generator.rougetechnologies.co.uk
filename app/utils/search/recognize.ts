export type SearchType =
  | "ean"
  | "asin"
  | "sku"
  | "id"
  | "title"
  | "shopify_id"
  | "baselinker_id"
  | "slug"

export const DETECTORS = {
  // EAN: Strictly 13 digits
  ean: { regex: /^\d{13}$/, label: "EAN" },
  // Shopify ID: 14 digits (sometimes 13-14)
  shopify_id: { regex: /^\d{14}$/, label: "Shopify ID" },
  // ASIN: 10 chars, typically starts with B
  asin: { regex: /^[A-Z0-9]{10}$/i, label: "ASIN" },
  // BaseLinker ID: 8-10 digits based on your range (75M - 231M)
  baselinker_id: { regex: /^\d{8,10}$/, label: "BaseLinker ID" },
  // SKU: Alphanumeric with separators, MUST BE UPPERCASE
  sku: { regex: /^[A-Z0-9-_./]{3,50}$/, label: "SKU" }, // Removed 'i' flag
  // Slug: Contains hyphens and lowercase letters
  slug: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, label: "URL Slug" },
};

export function detectSearchType(input: string): {
  type: SearchType;
  label: string;
} {
  const trimmed = input.trim();


  // 1. Check for BaseLinker ID first (8-10 digits)
  if (DETECTORS.baselinker_id.regex.test(trimmed)) {
    return { type: "baselinker_id", label: "BaseLinker ID" };
  }

  // 2. Check for Shopify ID (13-14 digits)
  if (DETECTORS.shopify_id.regex.test(trimmed)) {
    return { type: "shopify_id", label: "Shopify ID" };
  }

  // 3. Check for EAN (13 digits) - separate from Shopify
  if (DETECTORS.ean.regex.test(trimmed)) {
    return { type: "ean", label: "EAN" };
  }

  // 4. ASIN Check
  if (DETECTORS.asin.regex.test(trimmed)) {
    return { type: "asin", label: "ASIN" };
  }

  // 5. Slug Check (URL-friendly format)
  if (DETECTORS.slug.regex.test(trimmed) && trimmed.includes("-")) {
    return { type: "slug", label: "URL Slug" };
  }

  // 6. SKU Check - must be UPPERCASE (removed i flag from regex)
  if (DETECTORS.sku.regex.test(trimmed)) {
    return { type: "sku", label: "SKU" };
  }

  // 7. Title / FTS (multiple words or longer than 15 chars)
  if (trimmed.includes(" ") || trimmed.length > 15) {
    return { type: "title", label: "Product Title" };
  }
}