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
    description?: string;
    images: string[];
    condition?: string;
    brand?: string;
    mpn?: string;
    sku?: string;
    currency?: string;
    availability?: string;
  };
  seller?: any;
  shipping?: string;
  returns?: string;
  payments?: string[];
  itemSpecifics?: Record<string, string>;
  specifications?: Array<{ key: string; value: string }>;
};

/**
 * Detect the source from identifier and return the normalized scraped data.
 */
export async function scrapeUniversal(
  identifier: string,
): Promise<UniversalScrapeResult> {
  identifier = identifier.trim();

  // 1. eBay URL
  if (identifier.includes("ebay.") && identifier.includes("/itm/")) {
    const result = await scrapeEbayProduct(identifier);
    if (!result.success) throw new Error(result.error);
    const { product, seller, shipping, returns, payments, itemSpecifics } =
      result.data;
    // Convert itemSpecifics to specifications array
    const specifications = itemSpecifics
      ? Object.entries(itemSpecifics).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];
    return {
      source: "ebay",
      product: {
        title: product.title,
        price:
          product.price !== "N/A"
            ? parseFloat(product.price.replace(/[^0-9.-]/g, ""))
            : undefined,
        description: product.description,
        images: product.allImages || [],
        condition: product.condition !== "N/A" ? product.condition : undefined,
        brand: product.brand !== "N/A" ? product.brand : undefined,
        mpn: product.mpn !== "N/A" ? product.mpn : undefined,
        currency: product.currency,
        availability: product.availability,
      },
      seller,
      shipping,
      returns,
      payments,
      itemSpecifics,
      specifications,
    };
  }

  // 2. Currys URL
  if (identifier.includes("currys.co.uk")) {
    // Scrape images and metadata
    const images = await scrapeCurrysProductImages(identifier);
    const metadata = await extractCurrysMetadata(identifier);
    // Try to scrape more details (title, price) from HTML
    const html = await fetchRawHtml(identifier);
    const $ = cheerio.load(html);
    const title =
      $('h1[data-test="product-title"]').text().trim() ||
      metadata.productName ||
      "";
    let price: string | undefined = $('[data-test="product-price"]')
      .text()
      .trim();
    if (price) {
      price = price.replace(/[^0-9.]/g, "");
    }
    return {
      source: "currys",
      product: {
        title,
        price: price ? parseFloat(price) : undefined,
        images,
        sku: metadata.sku,
        brand: metadata.brand,
      },
    };
  }

  // 3. Amazon URL
  let asin: string | null = null;
  if (identifier.includes("amazon.")) {
    // Extract ASIN from URL
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
    // Fetch full product data from Amazon via Decodo
    const productData = await fetchProductByASIN(asin);
    if (!productData) throw new Error("Failed to fetch Amazon product data");

    // Extract fields
    const title = productData.title || "";
    const price = productData.price?.value
      ? parseFloat(productData.price.value)
      : undefined;
    const images = productData.images || [];
    const description = productData.description || "";
    const brand = productData.brand || productData.product_details?.Brand || "";
    const mpn = productData.mpn || productData.product_details?.MPN || "";
    const condition = productData.condition || "New"; // Amazon default
    const currency = productData.price?.currency || "GBP";

    // Build specifications from product_details
    const specifications: Array<{ key: string; value: string }> = [];
    if (
      productData.product_details &&
      typeof productData.product_details === "object"
    ) {
      for (const [key, value] of Object.entries(productData.product_details)) {
        if (value && typeof value === "string")
          specifications.push({ key, value });
      }
    }

    return {
      source: "amazon",
      product: {
        title,
        price,
        images,
        description,
        brand,
        mpn,
        condition,
        currency,
        availability: productData.availability,
      },
      specifications,
    };
  }

  throw new Error("Unable to process identifier");
}
