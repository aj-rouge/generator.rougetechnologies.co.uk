// app/utils/scrape/universal.ts

import { fetchProductByASIN, searchAmazonByEAN } from "../amazon";
import { extractCurrysMetadata } from "../currys";
import { scrapeEbayProduct } from "../ebay";

export type UniversalScrapeResult = {
  source: "ebay" | "amazon" | "currys";
  product: {
    title: string;
    price?: string | number;
    priceExVat?: number;
    priceIncVat?: number;
    rrp?: string | number;
    description?: string;
    images: string[];
    brand?: string;
  };
  seller?: any;
  itemSpecifics?: Record<string, string>;
  specifications?: Array<{ key: string; value: string }>;
  variants?: Array<{
    name: string;
    priceExVat?: number;
    url?: string;
    image?: string;
    isCurrent?: boolean;
  }>;
};

function filterSpecifications(
  specs: Array<{ key: string; value: string }> | undefined,
): Array<{ key: string; value: string }> | undefined {
  if (!specs) return undefined;
  return specs.filter((spec) => !spec.key.toLowerCase().includes("condition"));
}

export async function scrapeUniversal(
  identifier: string,
): Promise<UniversalScrapeResult> {
  identifier = identifier.trim();

  // 1. eBay URL
  if (identifier.includes("ebay.") && identifier.includes("/itm/")) {
    const result = await scrapeEbayProduct(identifier);
    if (!result.success) throw new Error(result.error);
    const { product, seller, itemSpecifics } = result.data;

    const rawSpecs = itemSpecifics
      ? Object.entries(itemSpecifics).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];
    const specifications = filterSpecifications(rawSpecs);

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
        brand: product.brand !== "N/A" ? product.brand : undefined,
      },
      seller,
      itemSpecifics,
      specifications,
    };
  }

  // 2. Currys URL — single metadata call returns images too (cache-shared)
  if (identifier.includes("currys.co.uk")) {
    const metadata = await extractCurrysMetadata(identifier);
    const specifications = filterSpecifications(metadata.specifications);

    return {
      source: "currys",
      product: {
        title: metadata.productName || "",
        price: metadata.price,
        priceExVat: metadata.priceExVat,
        priceIncVat: metadata.priceIncVat,
        images: metadata.images ?? [],
        brand: metadata.brand,
        description: metadata.description,
      },
      specifications,
      variants: metadata.variants,
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
    if (typeof productData.bullet_points === "string")
      description = productData.bullet_points;
    else if (Array.isArray(productData.description)) {
      description = productData.description
        .filter(
          (item: any) =>
            typeof item === "string" && !item.match(/^https?:\/\//),
        )
        .join("\n\n");
    } else if (typeof productData.description === "string")
      description = productData.description;

    const brand = productData.brand || productData.product_details?.Brand || "";

    const rawSpecs: Array<{ key: string; value: string }> = [];
    if (
      productData.product_details &&
      typeof productData.product_details === "object"
    ) {
      for (const [key, value] of Object.entries(productData.product_details)) {
        if (value && typeof value === "string" && value.trim() !== "") {
          rawSpecs.push({ key, value });
        }
      }
    }
    const specifications = filterSpecifications(rawSpecs);

    return {
      source: "amazon",
      product: { title, price, rrp, images, description, brand },
      specifications,
    };
  }

  throw new Error("Unable to process identifier");
}
