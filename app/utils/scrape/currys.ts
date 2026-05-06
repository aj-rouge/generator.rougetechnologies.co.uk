// lib/decodo/currys.ts

import { fetchRawHtml } from "./decodo";

/**
 * Extract image URLs from a Currys product page using JSON‑LD.
 */
export function extractImagesFromJSONLD(html: string): string[] {
  const jsonLdRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [];
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  for (const jsonString of matches) {
    try {
      const jsonLd = JSON.parse(jsonString);
      if (jsonLd["@type"] === "Product" && jsonLd.image) {
        if (Array.isArray(jsonLd.image)) {
          return jsonLd.image.map((img: string) => img.split("?")[0].trim());
        } else if (typeof jsonLd.image === "string") {
          return [jsonLd.image.split("?")[0].trim()];
        }
      }
    } catch (e) {
      // Not a product JSON‑LD, skip
    }
  }
  return [];
}

/**
 * Scrape all product images from a Currys URL.
 */
export async function scrapeCurrysProductImages(
  url: string,
): Promise<string[]> {
  const html = await fetchRawHtml(url);
  const images = extractImagesFromJSONLD(html);
  if (images.length === 0) {
    throw new Error("No images found in JSON-LD data");
  }
  console.log(`✅ Extracted ${images.length} images from Currys`);
  return images;
}

/**
 * Extract product name, SKU, and brand from a Currys page.
 */
export async function extractCurrysMetadata(url: string): Promise<{
  productName?: string;
  sku?: string;
  brand?: string;
}> {
  try {
    const html = await fetchRawHtml(url);
    const jsonLdRegex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i;
    const match = html.match(jsonLdRegex);
    if (match?.[1]) {
      const jsonLd = JSON.parse(match[1]);
      return {
        productName: jsonLd.name,
        sku: jsonLd.sku,
        brand: jsonLd.brand?.name,
      };
    }
  } catch (error) {
    // Ignore metadata extraction errors
  }
  return {};
}
