// lib/decodo/amazon.ts

import { decodoRequest } from "./decodo";

/**
 * Search Amazon by query (EAN or title) and return the first ASIN.
 */
export async function searchAmazonByQuery(
  query: string,
  domain: string = "co.uk",
): Promise<string | null> {
  try {
    const response = await decodoRequest({
      target: "amazon_search",
      query,
      domain,
      page_from: "1",
    });

    // Log full Decodo response for debugging
    console.log(
      `[Decodo Amazon Search] Response for query "${query}":\n`,
      JSON.stringify(response, null, 2),
    );

    const organicResults =
      response?.results?.[0]?.content?.results?.results?.organic;
    if (organicResults?.length > 0 && organicResults[0].asin) {
      return organicResults[0].asin;
    }

    const sponsoredResults =
      response?.results?.[0]?.content?.results?.results?.paid;
    if (sponsoredResults?.length > 0 && sponsoredResults[0].asin) {
      return sponsoredResults[0].asin;
    }

    const amazonChoices =
      response?.results?.[0]?.content?.results?.results?.amazons_choices;
    if (amazonChoices?.length > 0 && amazonChoices[0].asin) {
      return amazonChoices[0].asin;
    }

    return null;
  } catch (error) {
    console.error(
      `[Decodo Amazon Search] Error searching for query "${query}":`,
      error,
    );
    return null;
  }
}

/**
 * Fetch full product details by ASIN.
 */
export async function fetchProductByASIN(
  asin: string,
  domain: string = "co.uk",
): Promise<any> {
  try {
    const response = await decodoRequest({
      target: "amazon_product",
      query: asin,
      domain,
    });

    // Log full Decodo response for debugging
    console.log(
      `[Decodo Amazon Product] Response for ASIN "${asin}":\n`,
      JSON.stringify(response, null, 2),
    );

    return response?.results?.[0]?.content?.results || null;
  } catch (error) {
    console.error(
      `[Decodo Amazon Product] Error fetching ASIN "${asin}":`,
      error,
    );
    return null;
  }
}

/**
 * Extract EAN from product data, with optional fallback.
 */
export function extractEANFromProduct(
  productData: any,
  providedEan?: string,
): string | null {
  if (providedEan && /^\d{8,13}$/.test(providedEan)) {
    return providedEan;
  }

  const possibleEanLocations = [
    productData?.ean,
    productData?.gtin,
    productData?.gtin13,
    productData?.product_details?.ean,
    productData?.product_details?.gtin,
    productData?.product_details?.gtin13,
    productData?.product_details?.EAN,
    productData?.product_details?.GTIN,
    productData?.product_details?.["EAN"],
    productData?.product_details?.["GTIN-13"],
    ...(productData?.attributes ? Object.values(productData.attributes) : []),
    ...(productData?.specifications
      ? Object.values(productData.specifications)
      : []),
  ];

  for (const location of possibleEanLocations) {
    if (
      location &&
      typeof location === "string" &&
      /^\d{8,13}$/.test(location)
    ) {
      return location;
    }
  }
  return null;
}

/**
 * Search Amazon by EAN and return ASIN.
 */
export async function searchAmazonByEAN(ean: string): Promise<string | null> {
  return searchAmazonByQuery(ean, "co.uk");
}

/**
 * Fetch only product images by ASIN (used by the unified function).
 */
async function fetchProductImagesByASIN(asin: string): Promise<string[]> {
  const productData = await fetchProductByASIN(asin);
  return productData?.images || [];
}

/**
 * Unified entrypoint: accepts ASIN, EAN, or Currys URL and returns images + metadata.
 * For Currys, it delegates to the Currys module.
 */
export async function fetchAmazonProductImages(identifier: string): Promise<{
  images: string[];
  asin?: string;
  source?: "ASIN" | "EAN" | "Currys" | "URL";
  metadata?: {
    productName?: string;
    brand?: string;
  };
}> {
  // If it's a Currys URL, delegate to currys module (avoid circular import via dynamic import)
  if (identifier.includes("currys.co.uk")) {
    const { scrapeCurrysProductImages, extractCurrysMetadata } =
      await import("./currys");
    const images = await scrapeCurrysProductImages(identifier);
    const metadata = await extractCurrysMetadata(identifier);
    return { images, source: "Currys", metadata };
  }

  // Handle generic URLs (not supported for Amazon)
  if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
    throw new Error(
      "Only Currys.co.uk URLs are currently supported. For Amazon, use ASIN or EAN.",
    );
  }

  const isASIN = /^[A-Z0-9]{10}$/i.test(identifier);
  if (isASIN) {
    const images = await fetchProductImagesByASIN(identifier);
    return { images, asin: identifier, source: "ASIN" };
  } else {
    const asin = await searchAmazonByEAN(identifier);
    if (!asin) throw new Error(`No product found for EAN: ${identifier}`);
    const images = await fetchProductImagesByASIN(asin);
    return { images, asin, source: "EAN" };
  }
}
