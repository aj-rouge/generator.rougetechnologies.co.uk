import { NextResponse } from "next/server";

async function decodoRequest(payload: object) {
  const res = await fetch("https://scraper-api.decodo.com/v2/scrape", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization:
        "Basic VTAwMDAzMzY1MDA6UFdfMTU1OWEwN2I4N2NiMjU4YTk1MjhlYWY4NDc2MTMwYzU2",
    },
    body: JSON.stringify({ ...payload, parse: true }),
  });
  if (!res.ok) throw new Error(`Decodo API Error: ${res.status}`);
  return await res.json();
}

// Function to search Amazon by query (EAN or title) and get ASIN
async function searchAmazonByQuery(
  query: string,
  domain: string = "co.uk",
): Promise<string | null> {
  try {
    const response = await decodoRequest({
      target: "amazon_search",
      query: query,
      domain: domain,
      page_from: "1",
    });

    // Extract ASIN from search results - following your pattern
    const organicResults =
      response?.results?.[0]?.content?.results?.results?.organic;

    if (organicResults && organicResults.length > 0) {
      const firstResult = organicResults[0];
      if (firstResult.asin) {
        return firstResult.asin;
      }
    }

    // Fallback: Check sponsored results
    const sponsoredResults =
      response?.results?.[0]?.content?.results?.results?.paid;
    if (sponsoredResults && sponsoredResults.length > 0) {
      const firstSponsored = sponsoredResults[0];
      if (firstSponsored.asin) {
        return firstSponsored.asin;
      }
    }

    // Fallback: Check Amazon's Choices
    const amazonChoices =
      response?.results?.[0]?.content?.results?.results?.amazons_choices;
    if (amazonChoices && amazonChoices.length > 0) {
      const firstChoice = amazonChoices[0];
      if (firstChoice.asin) {
        return firstChoice.asin;
      }
    }

    return null;
  } catch (error) {
    console.error("Error searching Amazon by query:", error);
    return null;
  }
}

// Function to fetch product details by ASIN
async function fetchProductByASIN(
  asin: string,
  domain: string = "co.uk",
): Promise<any> {
  try {
    const response = await decodoRequest({
      target: "amazon_product",
      query: asin,
      domain: domain,
    });

    const productData = response?.results?.[0]?.content?.results;

    if (!productData) {
      return null;
    }

    return productData;
  } catch (error) {
    console.error("Error fetching product by ASIN:", error);
    return null;
  }
}

// Extract EAN from product details (following your pattern in the utility functions)
function extractEANFromProduct(
  productData: any,
  providedEan?: string,
): string | null {
  // If we already have a valid EAN from the input, use it
  if (providedEan && /^\d{8,13}$/.test(providedEan)) {
    return providedEan;
  }

  // Try to find EAN in various locations (following Decodo's response structure)
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
    // Try to find in attributes if they exist
    ...(productData?.attributes ? Object.values(productData.attributes) : []),
    // Try to find in specifications
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

export async function POST(req: Request) {
  try {
    const { identifier, query, domain = "co.uk" } = await req.json();

    let asin: string | null = null;
    let ean: string | null = null;
    let productData: any = null;

    // Check if identifier is a Currys URL (following your pattern)
    if (identifier && identifier.includes("currys.co.uk")) {
      return NextResponse.json({
        success: true,
        source: "Currys",
        asin: null,
        ean: null,
        message:
          "Currys URLs are handled by the image scraping utility directly",
      });
    }

    // Check if identifier looks like an ASIN (10 characters, alphanumeric) - following your pattern
    const isASIN = identifier && /^[A-Z0-9]{10}$/i.test(identifier);

    // Check if identifier looks like an EAN (8-13 digits) - following your pattern
    const isEAN = identifier && /^\d{8,13}$/.test(identifier);

    // STEP 1: Determine search approach based on input type
    if (isASIN) {
      // Direct ASIN lookup
      console.log(`Identifier is ASIN: ${identifier}`);
      asin = identifier;

      // Fetch product details
      productData = await fetchProductByASIN(asin, domain);

      // Try to extract EAN from product details
      if (productData) {
        ean = extractEANFromProduct(productData);
      }
    } else if (isEAN) {
      // Identifier is an EAN - search for ASIN first
      console.log(`Identifier is EAN: ${identifier}`);
      ean = identifier;

      // Search for ASIN using the EAN
      asin = await searchAmazonByQuery(identifier, domain);

      if (asin) {
        // Fetch product details to verify/update EAN
        productData = await fetchProductByASIN(asin, domain);

        // EAN from product data might be more accurate
        if (productData) {
          const extractedEan = extractEANFromProduct(productData);
          if (extractedEan) {
            ean = extractedEan;
          }
        }
      }
    } else if (query || identifier) {
      // Search by product title/query
      const searchTerm = query || identifier;
      console.log(`Searching by title: ${searchTerm}`);

      // Search for ASIN using the title
      asin = await searchAmazonByQuery(searchTerm, domain);

      if (asin) {
        // Fetch product details to get EAN
        productData = await fetchProductByASIN(asin, domain);

        if (productData) {
          ean = extractEANFromProduct(productData);
        }
      }
    }

    // If we still don't have productData but have ASIN, fetch it
    if (asin && !productData) {
      productData = await fetchProductByASIN(asin, domain);
      if (productData) {
        ean = extractEANFromProduct(productData);
      }
    }

    // Prepare response
    const response = {
      success: !!(asin || productData),
      asin: asin,
      ean: ean,
      title: productData?.title || productData?.product_name,
      brand: productData?.brand,
      images: productData?.images || [],
      source: isASIN ? "ASIN" : isEAN ? "EAN" : "SEARCH",
      inputType: isASIN ? "ASIN" : isEAN ? "EAN" : "TITLE",
    };

    // Log the result (following your pattern)
    if (response.asin && response.ean) {
      console.log(
        `✅ Fully Enriched: ASIN[${response.asin}] EAN[${response.ean}]`,
      );
    } else {
      console.log(
        `⚠️ Partial IDs: ASIN[${response.asin || "MISSING"}] EAN[${response.ean || "MISSING"}]`,
      );
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error in /api/scrape:", err);
    return NextResponse.json(
      {
        error: err.message || "An internal server error occurred",
        success: false,
      },
      { status: 500 },
    );
  }
}
