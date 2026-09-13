import { NextResponse } from "next/server";
import {
  extractEANFromProduct,
  fetchProductByASIN,
  searchAmazonByQuery,
} from "../../utils/scrape/amazon";
import { extractCurrysMetadata } from "../../utils/scrape/currys";

interface ScrapeRequestBody {
  identifier?: string;
  query?: string;
  domain?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScrapeRequestBody;
    const { identifier, query, domain = "co.uk" } = body;

    // Currys URLs — single metadata call returns images too.
    if (identifier && identifier.includes("currys.co.uk")) {
      const host = (() => {
        try {
          return new URL(identifier).hostname.toLowerCase();
        } catch {
          return "";
        }
      })();
      const isBusiness = host === "business.currys.co.uk";

      const meta = await extractCurrysMetadata(identifier);

      return NextResponse.json({
        success: true,
        source: isBusiness ? "Currys Business" : "Currys",
        storefront: isBusiness ? "business" : "retail",
        asin: null,
        ean: meta.ean ?? null,
        title: meta.productName,
        brand: meta.brand,
        price: meta.price,
        priceExVat: meta.priceExVat,
        priceIncVat: meta.priceIncVat,
        images: meta.images ?? [],
        specifications: meta.specifications ?? [],
        features: meta.features ?? [],
        variants: meta.variants ?? [],
        description: meta.description,
        stock: meta.stock,
        sku: meta.sku,
        mpn: meta.mpn,
        breadcrumbs: meta.breadcrumbs,
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
      productData = await fetchProductByASIN(asin, domain);
      if (productData) ean = extractEANFromProduct(productData);
    } else if (isEAN) {
      console.log(`Identifier is EAN: ${identifier}`);
      ean = identifier;
      asin = await searchAmazonByQuery(identifier, domain);
      if (asin) {
        productData = await fetchProductByASIN(asin, domain);
        if (productData) {
          const extractedEan = extractEANFromProduct(productData);
          if (extractedEan) ean = extractedEan;
        }
      }
    } else if (query || identifier) {
      const searchTerm = query || identifier;
      console.log(`Searching by title: ${searchTerm}`);
      asin = await searchAmazonByQuery(searchTerm, domain);
      if (asin) {
        productData = await fetchProductByASIN(asin, domain);
        if (productData) ean = extractEANFromProduct(productData);
      }
    }

    if (asin && !productData) {
      productData = await fetchProductByASIN(asin, domain);
      if (productData) ean = extractEANFromProduct(productData);
    }

    const response = {
      success: !!(asin || productData),
      asin,
      ean,
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
        `⚠️ Partial IDs: ASIN[${response.asin || "MISSING"}] EAN[${
          response.ean || "MISSING"
        }]`,
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
