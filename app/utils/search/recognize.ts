export type SearchType =
  | "ean"
  | "asin"
  | "sku"
  | "id"
  | "title"
  | "generic"
  | "shopify_id"
  | "baselinker_id"
  | "slug"
  | "features"
  | "images";

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

  // Check for special search prefixes
  if (trimmed.startsWith("features:")) {
    return { type: "features", label: "Features Search" };
  }
  if (trimmed.startsWith("images:")) {
    return { type: "images", label: "Image Search" };
  }

  // Remove special prefixes for detection
  const cleanInput = trimmed.replace(/^(features:|images:)/, "").trim();

  // 1. Check for BaseLinker ID first (8-10 digits)
  if (DETECTORS.baselinker_id.regex.test(cleanInput)) {
    return { type: "baselinker_id", label: "BaseLinker ID" };
  }

  // 2. Check for Shopify ID (13-14 digits)
  if (DETECTORS.shopify_id.regex.test(cleanInput)) {
    return { type: "shopify_id", label: "Shopify ID" };
  }

  // 3. Check for EAN (13 digits) - separate from Shopify
  if (DETECTORS.ean.regex.test(cleanInput)) {
    return { type: "ean", label: "EAN" };
  }

  // 4. ASIN Check
  if (DETECTORS.asin.regex.test(cleanInput)) {
    return { type: "asin", label: "ASIN" };
  }

  // 5. Slug Check (URL-friendly format)
  if (DETECTORS.slug.regex.test(cleanInput) && cleanInput.includes("-")) {
    return { type: "slug", label: "URL Slug" };
  }

  // 6. SKU Check - must be UPPERCASE (removed i flag from regex)
  if (DETECTORS.sku.regex.test(cleanInput)) {
    return { type: "sku", label: "SKU" };
  }

  // 7. Title / FTS (multiple words or longer than 15 chars)
  if (cleanInput.includes(" ") || cleanInput.length > 15) {
    return { type: "title", label: "Product Title" };
  }

  // 8. Default to generic search
  return { type: "generic", label: "Generic Search" };
}

export function sanitizeFTSQuery(query: string): string {
  // Remove special prefixes
  const cleanQuery = query.replace(/^(features:|images:)/, "").trim();

  return cleanQuery
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((token) => token.length > 0)
    .map((token) => `"${token}"*`)
    .join(" ");
}

export function extractSearchTerms(query: string): string[] {
  const cleanQuery = query.replace(/^(features:|images:)/, "").trim();
  return cleanQuery.split(/\s+/).filter((token) => token.length >= 2);
}
