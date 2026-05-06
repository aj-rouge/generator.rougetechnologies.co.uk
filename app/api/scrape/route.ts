import { NextResponse } from "next/server";
import { extractEANFromProduct, fetchProductByASIN, searchAmazonByQuery } from "../../utils/scrape/amazon";

export async function POST(req: Request) {
  try {
    const { identifier, query, domain = "co.uk" } = await req.json();

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

    const isASIN = identifier && /^[A-Z0-9]{10}$/i.test(identifier);
    const isEAN = identifier && /^\d{8,13}$/.test(identifier);

    let asin: string | null = null;
    let ean: string | null = null;
    let productData: any = null;

    if (isASIN) {
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

    if (asin && !productData) {
      productData = await fetchProductByASIN(asin, domain);
      if (productData) {
        ean = extractEANFromProduct(productData);
      }
    }

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
