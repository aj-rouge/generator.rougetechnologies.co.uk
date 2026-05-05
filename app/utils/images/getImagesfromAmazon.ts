// Reusable function for Decodo API calls
const callDecodoAPI = async (requestBody: object): Promise<any> => {
  const response = await fetch("https://scraper-api.decodo.com/v2/scrape", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization:
        "Basic VTAwMDAzMzY1MDA6UFdfMTU1OWEwN2I4N2NiMjU4YTk1MjhlYWY4NDc2MTMwYzU2",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export const scrapeAmazonProductImages = async (
  productId: string,
): Promise<string[]> => {
  try {
    // First, try to fetch by ASIN directly
    return await fetchProductByASIN(productId);
  } catch (error) {
    console.error("Error scraping Amazon product images:", error);
    throw error;
  }
};

const extractImagesFromJSONLD = (html: string): string[] => {
  // Find ALL JSON-LD script tags (not just the first)
  const jsonLdRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [];
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  console.log(`Found ${matches.length} JSON-LD script tags`);

  // Look for the Product type JSON-LD
  for (let i = 0; i < matches.length; i++) {
    const jsonString = matches[i];

    try {
      // Parse the JSON (it's already clean in your example)
      const jsonLd = JSON.parse(jsonString);

      // Check if it's a Product type
      if (jsonLd["@type"] === "Product" && jsonLd.image) {
        console.log(`Found Product JSON-LD at position ${i}`);

        if (Array.isArray(jsonLd.image)) {
          // Clean each image URL by removing query parameters
          const cleanedImages = jsonLd.image.map((img: string) => {
            return img.split("?")[0].trim();
          });
          console.log(`Extracted ${cleanedImages.length} images`);
          return cleanedImages;
        } else if (typeof jsonLd.image === "string") {
          const cleanedImage = jsonLd.image.split("?")[0].trim();
          console.log("Extracted 1 image");
          return [cleanedImage];
        }
      }
    } catch (error) {
      // If parsing fails, this might be the BreadcrumbList or invalid JSON
      console.log(`Script tag ${i} is not valid Product JSON`);
    }
  }

  console.log("No Product JSON-LD found in any script tag");
  return [];
};

// New function to handle Currys URLs
export const scrapeCurrysProductImages = async (
  url: string,
): Promise<string[]> => {
  try {
    const json = await callDecodoAPI({
      url: url,
    });

    // The HTML is in json.raw (not json.content or json.results[0].content)
    const htmlContent = json?.results[0]?.content;

    if (!htmlContent) {
      console.error(
        "No 'raw' HTML content in response. Available keys:",
        Object.keys(json),
      );
      throw new Error(
        "No HTML content found in API response (expected 'raw' field)",
      );
    }
    console.log(htmlContent);
    // Check if it's actually HTML (should be a string)
    if (typeof htmlContent !== "string") {
      console.error("'raw' content is not a string:", typeof htmlContent);
      throw new Error("Unexpected content type - expected HTML string");
    }

    // Extract images from the HTML using JSON-LD parsing
    const images = extractImagesFromJSONLD(htmlContent);

    if (images.length === 0) {
      // Optional: Check if we can find the JSON-LD at all
      const hasJsonLd = htmlContent.includes("application/ld+json");
      console.log(`HTML contains JSON-LD: ${hasJsonLd}`);
      throw new Error("No images found in JSON-LD data");
    }

    console.log(`Successfully extracted ${images.length} images from Currys`);
    return images;
  } catch (error) {
    console.error("Error scraping Currys product images:", error);
    throw error;
  }
};

// Function to search Amazon by EAN and get ASIN
export const searchAmazonByEAN = async (
  ean: string,
): Promise<string | null> => {
  try {
    const json = await callDecodoAPI({
      target: "amazon_search",
      query: ean,
      domain: "co.uk",
      parse: true,
      page_from: "1",
    });

    console.log("Search API Response:", json);

    // Extract ASIN from search results - corrected path
    // The structure is: results[0].content.results.results.organic[0].asin
    const organicResults =
      json?.results?.[0]?.content?.results?.results?.organic;

    if (organicResults && organicResults.length > 0) {
      const firstResult = organicResults[0];
      if (firstResult.asin) {
        console.log("Found ASIN:", firstResult.asin);
        return firstResult.asin;
      }
    }

    // Fallback: Check other result sections
    const sponsoredResults =
      json?.results?.[0]?.content?.results?.results?.paid;
    if (sponsoredResults && sponsoredResults.length > 0) {
      const firstSponsored = sponsoredResults[0];
      if (firstSponsored.asin) {
        console.log("Found ASIN from sponsored:", firstSponsored.asin);
        return firstSponsored.asin;
      }
    }

    const amazonChoices =
      json?.results?.[0]?.content?.results?.results?.amazons_choices;
    if (amazonChoices && amazonChoices.length > 0) {
      const firstChoice = amazonChoices[0];
      if (firstChoice.asin) {
        console.log("Found ASIN from Amazon's Choice:", firstChoice.asin);
        return firstChoice.asin;
      }
    }

    console.log("No ASIN found in search results");
    return null;
  } catch (error) {
    console.error("Error searching Amazon by EAN:", error);
    throw error;
  }
};

// Function to fetch product details by ASIN
const fetchProductByASIN = async (asin: string): Promise<string[]> => {
  try {
    const json = await callDecodoAPI({
      target: "amazon_product",
      query: asin,
      domain: "co.uk",
      parse: true,
    });

    const productData = json?.results?.[0]?.content?.results;

    if (!productData || !productData.images) {
      return [];
    }

    return productData.images;
  } catch (error) {
    console.error("Error fetching product by ASIN:", error);
    throw error;
  }
};

// New unified function that accepts multiple input types
export const fetchAmazonProductImages = async (
  identifier: string,
): Promise<{
  images: string[];
  asin?: string;
  source?: "ASIN" | "EAN" | "Currys" | "URL";
  metadata?: {
    productName?: string;
    sku?: string;
    brand?: string;
  };
}> => {
  // Check if it's a Currys URL
  if (identifier.includes("currys.co.uk")) {
    const images = await scrapeCurrysProductImages(identifier);
    return {
      images,
      source: "Currys",
      metadata: await extractCurrysMetadata(identifier),
    };
  }

  // Check if it's a general URL (not Currys)
  if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
    throw new Error(
      "Only Currys.co.uk URLs are currently supported. For Amazon, use ASIN or EAN.",
    );
  }

  // Check if identifier looks like an ASIN (10 characters, alphanumeric)
  const isASIN = /^[A-Z0-9]{10}$/i.test(identifier);

  if (isASIN) {
    // Direct ASIN lookup
    const images = await fetchProductByASIN(identifier);
    return {
      images,
      asin: identifier,
      source: "ASIN",
    };
  } else {
    // Assume it's an EAN and search for it
    const asin = await searchAmazonByEAN(identifier);

    if (!asin) {
      throw new Error(`No product found for EAN: ${identifier}`);
    }

    const images = await fetchProductByASIN(asin);
    return {
      images,
      asin,
      source: "EAN",
    };
  }
};

// Helper function to extract metadata from Currys page
const extractCurrysMetadata = async (
  url: string,
): Promise<{
  productName?: string;
  sku?: string;
  brand?: string;
}> => {
  try {
    const json = await callDecodoAPI({
      url: url,
    });

    const htmlContent = json?.results?.[0]?.content;

    if (!htmlContent) {
      return {};
    }

    const jsonLdRegex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i;
    const match = htmlContent.match(jsonLdRegex);

    if (match && match[1]) {
      try {
        const jsonLd = JSON.parse(match[1]);
        return {
          productName: jsonLd.name,
          sku: jsonLd.sku,
          brand: jsonLd.brand?.name,
        };
      } catch (error) {
        return {};
      }
    }

    return {};
  } catch (error) {
    return {};
  }
};
