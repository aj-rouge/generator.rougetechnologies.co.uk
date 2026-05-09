// lib/decodo/currys.ts
import * as cheerio from "cheerio";
import { fetchRawHtml } from "./decodo";

/**
 * Extract image URLs from a Currys product page using JSON‑LD.
 */
export function extractImagesFromJSONLD(html: string): string[] {
  console.log("🔍 Extracting images from JSON-LD...");
  const jsonLdRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [];
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  console.log(`📄 Found ${matches.length} JSON-LD script(s)`);

  const allImages: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const jsonString = matches[i];
    try {
      const jsonLd = JSON.parse(jsonString);
      console.log(`📝 Parsed JSON-LD #${i + 1}, type: ${jsonLd["@type"]}`);

      if (jsonLd["@type"] === "Product" && jsonLd.image) {
        let imageUrls: string[] = [];
        if (Array.isArray(jsonLd.image)) {
          imageUrls = jsonLd.image.map((img: string) =>
            img.split("?")[0].trim(),
          );
        } else if (typeof jsonLd.image === "string") {
          imageUrls = [jsonLd.image.split("?")[0].trim()];
        }
        console.log(`🖼️ Found ${imageUrls.length} images in Product JSON-LD`);
        allImages.push(...imageUrls);
      } else if (jsonLd["@type"] === "ProductGroup" && jsonLd.hasVariant) {
        for (const variant of jsonLd.hasVariant) {
          if (variant.image) {
            let variantImages: string[] = [];
            if (Array.isArray(variant.image)) {
              variantImages = variant.image.map((img: string) =>
                img.split("?")[0].trim(),
              );
            } else if (typeof variant.image === "string") {
              variantImages = [variant.image.split("?")[0].trim()];
            }
            console.log(
              `🖼️ Found ${variantImages.length} images in ProductGroup variant`,
            );
            allImages.push(...variantImages);
          }
        }
      }
    } catch (e) {
      console.log(
        `⚠️ Failed to parse JSON-LD #${i + 1}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Remove duplicates while preserving order
  const uniqueImages = [
    ...new Map(allImages.map((img) => [img, img])).values(),
  ];
  console.log(`✅ Total unique images extracted: ${uniqueImages.length}`);
  return uniqueImages;
}

/**
 * Scrape all product images from a Currys URL.
 */
export async function scrapeCurrysProductImages(
  url: string,
): Promise<string[]> {
  console.log(`🛒 Scraping Currys product images from: ${url}`);
  const html = await fetchRawHtml(url);
  console.log(`📄 Fetched HTML (length: ${html.length} characters)`);
  const images = extractImagesFromJSONLD(html);
  if (images.length === 0) {
    console.error("❌ No images found in JSON-LD data");
    throw new Error("No images found in JSON-LD data");
  }
  console.log(`✅ Extracted ${images.length} images from Currys`);
  images.forEach((img, idx) => console.log(`   Image ${idx + 1}: ${img}`));
  return images;
}

function extractCurrysSpecs($: cheerio.CheerioAPI): {
  specs: Array<{ key: string; value: string }>;
} {
  const specs: Array<{ key: string; value: string }> = [];

  // The specification tables are inside .tech-specification-table
  $(".tech-specification-table").each((_, table) => {
    // Each table has a caption (h3) and multiple rows
    const $table = $(table);
    const category = $table.find("h3.tech-specification-caption").text().trim();
    $table.find(".tech-specification-body").each((_, row) => {
      const $row = $(row);
      const key = $row.find(".tech-specification-th").first().text().trim();
      let value = $row.find(".tech-specification-td").first().text().trim();
      if (key && value) {
        // Prepend category if useful (optional)
        specs.push({ key, value });
      }
    });
  });

  // Also check the "Key features" section for quick specs (optional)
  $(".pdp-item-features .item").each((_, el) => {
    const feature = $(el).text().trim();
    if (feature) {
      specs.push({ key: "Key Feature", value: feature });
    }
  });

  return { specs };
}

/**
 * Extract product name, brand, and price from a Currys page.
 * Tries all JSON‑LD scripts and falls back to DOM selectors.
 */
export async function extractCurrysMetadata(url: string): Promise<{
  productName?: string;
  brand?: string;
  price?: number;
  specifications?: Array<{ key: string; value: string }>;
}> {
  console.log(`🔖 Extracting metadata from Currys URL: ${url}`);
  try {
    const html = await fetchRawHtml(url);
    const $ = cheerio.load(html);

    // ----- JSON‑LD parsing (same as before) -----
    const jsonLdRegex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let bestName = "";
    let bestBrand = "";
    let bestPrice: number | undefined;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonLd = JSON.parse(match[1]);
        if (jsonLd["@type"] === "Product") {
          bestName = jsonLd.name || bestName;
          bestBrand = jsonLd.brand?.name || bestBrand;
          if (jsonLd.offers?.price) {
            const priceNum = parseFloat(jsonLd.offers.price);
            if (!isNaN(priceNum)) bestPrice = priceNum;
          }
          console.log(
            `📝 Found Product JSON-LD: name="${bestName}", brand="${bestBrand}", price="${bestPrice}"`,
          );
        } else if (jsonLd["@type"] === "ProductGroup") {
          bestName = jsonLd.name || bestName;
          bestBrand = jsonLd.brand?.name || bestBrand;
          if (jsonLd.hasVariant && jsonLd.hasVariant.length) {
            for (const variant of jsonLd.hasVariant) {
              if (variant.name) bestName = variant.name;
              if (variant.brand?.name) bestBrand = variant.brand.name;
              if (variant.offers?.price) {
                const priceNum = parseFloat(variant.offers.price);
                if (!isNaN(priceNum)) bestPrice = priceNum;
              }
            }
          }
          console.log(
            `📝 Found ProductGroup JSON-LD: name="${bestName}", brand="${bestBrand}", price="${bestPrice}"`,
          );
        }
      } catch (e) {
        /* skip invalid JSON */
      }
    }

    // ----- DOM fallbacks (title, brand, price) -----
    if (!bestName) {
      const titleSelectors = [
        "h1.product-name",
        'h1[data-test="product-title"]',
        "h1.pdp-product-title",
        ".product-name h1",
      ];
      for (const sel of titleSelectors) {
        const text = $(sel).first().text().trim();
        if (text) {
          bestName = text;
          console.log(`✅ Fallback title from DOM "${sel}": ${bestName}`);
          break;
        }
      }
    }
    if (!bestBrand) {
      const brandSelectors = ["[data-brand]", ".product-brand", ".brand-name"];
      for (const sel of brandSelectors) {
        let brand = "";
        if (sel.startsWith("[")) brand = $(sel).attr("data-brand") || "";
        else brand = $(sel).first().text().trim();
        if (brand) {
          bestBrand = brand;
          console.log(`✅ Fallback brand from DOM "${sel}": ${bestBrand}`);
          break;
        }
      }
    }
    if (!bestPrice) {
      const priceSelectors = [
        '[data-test="product-price"]',
        ".price .value",
        ".sales .value",
      ];
      for (const sel of priceSelectors) {
        const priceText = $(sel).first().text().trim();
        if (priceText) {
          const cleaned = priceText.replace(/[^0-9.]/g, "");
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            bestPrice = num;
            console.log(`✅ Fallback price from DOM "${sel}": ${bestPrice}`);
            break;
          }
        }
      }
    }

    // ----- Extract specifications from the DOM -----
    const { specs } = extractCurrysSpecs($);

    console.log(
      `📦 Final metadata: name="${bestName || "N/A"}", brand="${bestBrand || "N/A"}", price="${bestPrice || "N/A"}", specs: ${specs.length} items`,
    );
    return {
      productName: bestName || undefined,
      brand: bestBrand || undefined,
      price: bestPrice,
      specifications: specs.length ? specs : undefined,
    };
  } catch (error) {
    console.error(
      "❌ Error extracting Currys metadata:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}
