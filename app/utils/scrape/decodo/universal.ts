// lib/decodo/universal.ts

import * as cheerio from "cheerio";
import { scrapeEbayProduct } from "../ebay";
import { extractCurrysMetadata, scrapeCurrysProductImages } from "../currys";
import { fetchRawHtml } from "../decodo";
import { fetchProductByASIN, searchAmazonByEAN } from "../amazon";

export type UniversalScrapeResult = {
  source: "ebay" | "amazon" | "currys";
  product: {
    title: string;
    price?: string | number;
    rrp?: string | number;
    description?: string;
    images: string[];
    brand?: string;
  };
  seller?: any;
  itemSpecifics?: Record<string, string>;
  specifications?: Array<{ key: string; value: string }>;
};

export async function scrapeUniversal(
  identifier: string,
): Promise<UniversalScrapeResult> {
  identifier = identifier.trim();

  // 1. eBay URL
  if (identifier.includes("ebay.") && identifier.includes("/itm/")) {
    const result = await scrapeEbayProduct(identifier);
    if (!result.success) throw new Error(result.error);
    const { product, seller, itemSpecifics } = result.data;
    const specifications = itemSpecifics
      ? Object.entries(itemSpecifics).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];
    let rrp: number | undefined = undefined;
    return {
      source: "ebay",
      product: {
        title: product.title,
        price:
          product.price !== "N/A"
            ? parseFloat(product.price.replace(/[^0-9.-]/g, ""))
            : undefined,
        rrp,
        description: product.description,
        images: product.allImages || [],
        brand: product.brand !== "N/A" ? product.brand : undefined,
      },
      seller,
      itemSpecifics,
      specifications,
    };
  }

  // 2. Currys URL
  if (identifier.includes("currys.co.uk")) {
    const images = await scrapeCurrysProductImages(identifier);
    const metadata = await extractCurrysMetadata(identifier);
    const html = await fetchRawHtml(identifier);
    const $ = cheerio.load(html);

    let title = metadata.productName || "";
    // Fallback title from DOM (same as before)
    if (!title) {
      const titleSelectors = [
        "h1.product-name",
        'h1[data-test="product-title"]',
        "h1.pdp-product-title",
      ];
      for (const sel of titleSelectors) {
        const t = $(sel).first().text().trim();
        if (t) {
          title = t;
          break;
        }
      }
    }

    let price = metadata.price;
    if (!price) {
      const priceText = $('[data-test="product-price"], .price .value')
        .first()
        .text()
        .trim();
      if (priceText) price = parseFloat(priceText.replace(/[^0-9.]/g, ""));
    }

    // RRP extraction (was price) – keep your existing logic
    let rrp: number | undefined;
    const wasPriceElem = $('.price-date, [data-test="was-price"]').first();
    if (wasPriceElem.length) {
      const wasText = wasPriceElem.text().trim();
      const match = wasText.match(/Was\s*£([\d,]+(?:\.\d{2})?)/i);
      if (match) rrp = parseFloat(match[1].replace(/,/g, ""));
    }
    return {
      source: "currys",
      product: {
        title: title || "",
        price,
        rrp,
        images,
        brand: metadata.brand,
      },
      specifications: metadata.specifications,
    };
  }

  // 3. Amazon URL
  let asin: string | null = null;
  if (identifier.includes("amazon.")) {
    const asinMatch = identifier.match(
      /(?:\/dp\/|\/product\/|\/gp\/product\/)([A-Z0-9]{10})/i,
    );
    if (asinMatch) asin = asinMatch[1];
    else throw new Error("Could not extract ASIN from Amazon URL");
  }
  // 4. ASIN pattern
  else if (/^[A-Z0-9]{10}$/i.test(identifier)) {
    asin = identifier.toUpperCase();
  }
  // 5. EAN pattern
  else if (/^\d{8,13}$/.test(identifier)) {
    asin = await searchAmazonByEAN(identifier);
    if (!asin) throw new Error(`No product found for EAN: ${identifier}`);
  } else {
    throw new Error(
      "Unsupported identifier. Use eBay URL, Amazon URL/ASIN/EAN, or Currys URL.",
    );
  }

  if (asin) {
    const productData = await fetchProductByASIN(asin);
    if (!productData) throw new Error("Failed to fetch Amazon product data");

    const title = productData.title || "";
    let price: number | undefined;
    if (typeof productData.price === "number") price = productData.price;
    else if (productData.price?.value)
      price = parseFloat(productData.price.value);

    let rrp: number | undefined;
    if (
      productData.price_upper &&
      typeof productData.price_upper === "number" &&
      productData.price_upper !== price
    )
      rrp = productData.price_upper;
    else if (
      productData.list_price &&
      typeof productData.list_price === "number"
    )
      rrp = productData.list_price;

    const images = productData.images || [];
    let description = "";
    if (
      productData.bullet_points &&
      typeof productData.bullet_points === "string"
    )
      description = productData.bullet_points;
    else if (Array.isArray(productData.description)) {
      const textItems = productData.description.filter(
        (item: any) => typeof item === "string" && !item.match(/^https?:\/\//),
      );
      description = textItems.join("\n\n");
    } else if (typeof productData.description === "string")
      description = productData.description;

    const brand = productData.brand || productData.product_details?.Brand || "";
    const specifications: Array<{ key: string; value: string }> = [];
    if (
      productData.product_details &&
      typeof productData.product_details === "object"
    ) {
      for (const [key, value] of Object.entries(productData.product_details)) {
        if (value && typeof value === "string" && value.trim() !== "") {
          specifications.push({ key, value });
        }
      }
    }

    return {
      source: "amazon",
      product: {
        title,
        price,
        rrp,
        images,
        description,
        brand,
      },
      specifications,
    };
  }

  throw new Error("Unable to process identifier");
}
