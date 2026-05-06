// lib/decodo/ebay.ts
import * as cheerio from "cheerio";
import axios from "axios";
import { fetchRawHtml } from "./decodo";

/**
 * Fetch description from an iframe URL (used in eBay scrape).
 */
export async function fetchDescriptionFromIframe(
  iframeUrl: string,
): Promise<string> {
  if (!iframeUrl || iframeUrl === "N/A") return "No description available.";
  try {
    console.log(`📡 Fetching description from iframe: ${iframeUrl}`);
    const response = await axios.get(iframeUrl, { timeout: 10000 });
    const $desc = cheerio.load(response.data);
    $desc("script, style").remove();
    const text = $desc("body").text().trim();
    const truncated = text.length > 500 ? text.substring(0, 500) + "..." : text;
    console.log(
      `✅ Description fetched (${text.length} chars): ${truncated.substring(0, 100)}...`,
    );
    return truncated;
  } catch (error: any) {
    console.error("❌ Failed to fetch description:", error.message);
    return "Description could not be loaded.";
  }
}

/**
 * Scrape an eBay product page.
 */
export async function scrapeEbayProduct(ebayUrl: string) {
  console.log(`\n🚀 Starting eBay scrape for URL: ${ebayUrl}`);
  const startTime = Date.now();

  try {
    const rawHtml = await fetchRawHtml(ebayUrl);
    const $ = cheerio.load(rawHtml);
    const getText = (selector: string) =>
      $(selector).first().text().trim() || "N/A";

    // Extract JSON-LD Product
    let jsonLdProduct = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "Product") {
          jsonLdProduct = data;
          return false;
        }
      } catch (e) {}
    });

    // Extract category from breadcrumbs
    let category = "N/A";
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "BreadcrumbList" && data.itemListElement) {
          const items = data.itemListElement
            .filter((item: any) => item["@type"] === "ListItem" && item.name)
            .map((item: any) => item.name);
          if (items[0] === "eBay" && items.length > 1)
            category = items.slice(1).join(" > ");
          else category = items.join(" > ");
          return false;
        }
      } catch (e) {}
    });
    if (category === "N/A") {
      const breadcrumbs: string[] = [];
      $(".breadcrumbs li a").each((i, el) => {
        const text = $(el).text().trim();
        if (text) breadcrumbs.push(text);
      });
      if (breadcrumbs.length) category = breadcrumbs.join(" > ");
    }

    // Extract images
    const images: string[] = [];
    $(".ux-image-carousel-item img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !images.includes(src)) images.push(src);
    });
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) images.push(ogImage);
    }

    // Extract item specifics
    const itemSpecifics: Record<string, string> = {};
    $(".x-about-this-item .ux-labels-values").each((i, el) => {
      const label = $(el)
        .find(".ux-labels-values__labels .ux-textspans")
        .first()
        .text()
        .trim();
      const value = $(el)
        .find(".ux-labels-values__values .ux-textspans")
        .first()
        .text()
        .trim();
      if (label && value) itemSpecifics[label] = value;
    });

    // Seller details
    const seller = {
      name: getText(".x-sellercard-atf__info__about-seller a"),
      feedbackScore: getText(
        ".x-sellercard-atf__about-seller-item:first-child",
      ),
      positivePercent:
        getText(".x-sellercard-atf__data-item button").match(
          /\d+(?:\.\d+)?%/,
        )?.[0] || "N/A",
      isBusinessSeller:
        $(".x-sellercard-atf__about-seller-item .ux-bubble-help").length > 0,
      joined: getText(".x-store-information__info .ux-icon-text__text"),
      storeName: getText(".x-store-information__store-name a"),
    };

    // Shipping, returns, payments
    const shipping = getText(
      ".ux-labels-values--shipping .ux-textspans:first-child",
    );
    const returns = getText(
      ".x-returns-minview .ux-labels-values--returns .ux-textspans:first-child",
    );
    const payments = $(".d-payments-minview .ux-textspans[title]")
      .map((i, el) => $(el).attr("title"))
      .get();

    // Description iframe
    const descriptionIframeUrl = $("#desc_ifr").attr("src") || "N/A";
    let descriptionText = "Loading description...";
    if (descriptionIframeUrl !== "N/A") {
      descriptionText = await fetchDescriptionFromIframe(descriptionIframeUrl);
    }

    // Basic product data
    const product = {
      title: getText("h1.x-item-title__mainTitle"),
      price: getText(".x-price-primary .ux-textspans"),
      condition: getText(".x-item-condition-text .ux-textspans"),
      quantityAvailable: getText(".x-quantity__availability .ux-textspans"),
      brand: "N/A",
      mpn: "N/A",
      currency: "GBP",
      availability: getText(".x-quantity__availability .ux-textspans"),
      image: images[0] || null,
      allImages: images,
      description: descriptionText,
      descriptionUrl: descriptionIframeUrl,
      category: category,
    };

    // Override with JSON-LD if available
    if (jsonLdProduct) {
      product.title = jsonLdProduct.name || product.title;
      product.price = jsonLdProduct.offers?.price || product.price;
      product.currency = jsonLdProduct.offers?.priceCurrency || "GBP";
      product.availability =
        jsonLdProduct.offers?.availability || product.quantityAvailable;
      product.brand =
        jsonLdProduct.brand?.name || itemSpecifics["Brand"] || "N/A";
      product.mpn = jsonLdProduct.mpn || itemSpecifics["MPN"] || "N/A";
      if (jsonLdProduct.image && jsonLdProduct.image.length) {
        product.image = jsonLdProduct.image[0];
        jsonLdProduct.image.forEach((img: string) => {
          if (!product.allImages.includes(img)) product.allImages.push(img);
        });
      }
    }

    console.log(`✨ Scrape completed in ${Date.now() - startTime}ms`);
    return {
      success: true,
      data: { product, seller, shipping, returns, payments, itemSpecifics },
      html: rawHtml,
    };
  } catch (error: any) {
    console.error(
      `❌ Scraping failed after ${Date.now() - startTime}ms:`,
      error.message,
    );
    return { success: false, error: "Failed to retrieve data from eBay." };
  }
}
