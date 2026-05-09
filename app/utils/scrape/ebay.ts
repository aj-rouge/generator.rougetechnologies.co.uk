// lib/decodo/ebay.ts
import * as cheerio from "cheerio";
import axios from "axios";
import { fetchRawHtml } from "./decodo";

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
    console.log(`✅ Description fetched (${text.length} chars)`);
    return text;
  } catch (error: any) {
    console.error("❌ Failed to fetch description:", error.message);
    return "Description could not be loaded.";
  }
}

export async function scrapeEbayProduct(ebayUrl: string) {
  console.log(`\n🚀 Starting eBay scrape for URL: ${ebayUrl}`);
  const startTime = Date.now();

  try {
    const rawHtml = await fetchRawHtml(ebayUrl);
    console.log(`📄 Raw HTML received: ${rawHtml.length} characters`);
    const $ = cheerio.load(rawHtml);

    // ----- Helper to safely get text -----
    const getText = (selector: string, context?: any) => {
      const el = context ? $(selector, context) : $(selector);
      return el.first().text().trim() || "N/A";
    };

    // ----- JSON-LD Product extraction -----
    let jsonLdProduct: any = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "Product") {
          jsonLdProduct = data;
          console.log("✅ JSON-LD Product found");
          return false;
        }
      } catch (e) {}
    });

    // ----- Category from breadcrumbs -----
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
          console.log(`✅ Category from JSON-LD: ${category}`);
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

    // ----- Images (main carousel) -----
    const images: string[] = [];
    $(".ux-image-carousel-item img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !images.includes(src)) images.push(src);
    });
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) images.push(ogImage);
    }
    console.log(`🖼️ Found ${images.length} images`);

    // ----- Item specifics (specifications) -----
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
    // Also check the new "ux-layout-section-evo" pattern (sometimes used)
    $(".ux-layout-section-evo .ux-labels-values").each((i, el) => {
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
      if (label && value && !itemSpecifics[label]) itemSpecifics[label] = value;
    });
    console.log(
      `🏷️ Item specifics count: ${Object.keys(itemSpecifics).length}`,
    );

    // ----- Seller details -----
    const sellerName = getText(".x-sellercard-atf__info__about-seller a");
    const feedbackScore = getText(
      ".x-sellercard-atf__about-seller-item:first-child",
    );
    const positivePercentElem = $(
      ".x-sellercard-atf__data-item button",
    ).first();
    const positivePercent =
      positivePercentElem
        .text()
        .match(/\d+(?:\.\d+)?%/)
        ?.toString() || "N/A";
    const isBusinessSeller =
      $(".x-sellercard-atf__about-seller-item .ux-bubble-help").length > 0;
    const joined = getText(".x-store-information__info .ux-icon-text__text");
    const storeName = getText(".x-store-information__store-name a");
    const seller = {
      name: sellerName,
      feedbackScore,
      positivePercent,
      isBusinessSeller,
      joined,
      storeName,
    };
    console.log(
      `👤 Seller: ${seller.name || "unknown"} (${seller.feedbackScore})`,
    );
    
    // ----- RRP (Was price / original price) -----
    let rrp: number | undefined;
    const wasPriceElem = $(
      ".x-bin-price__was-price .ux-textspans, .x-price-secondary .ux-textspans",
    );
    if (wasPriceElem.length) {
      const wasText = wasPriceElem.first().text().trim();
      const wasNumber = parseFloat(wasText.replace(/[^0-9.-]/g, ""));
      if (!isNaN(wasNumber)) {
        rrp = wasNumber;
        console.log(`💰 RRP found: ${rrp}`);
      }
    }

    let price = parseFloat(
      getText(".x-price-primary .ux-textspans").replace(/[^0-9.-]/g, ""),
    );
    if (isNaN(price)) price = 0;

 
    const brand = itemSpecifics["Brand"] || jsonLdProduct?.brand?.name || "N/A";

    // ----- Description iframe -----
    const descriptionIframeUrl = $("#desc_ifr").attr("src") || "N/A";
    let descriptionText = "No description available.";
    if (descriptionIframeUrl !== "N/A") {
      descriptionText = await fetchDescriptionFromIframe(descriptionIframeUrl);
    }

    const product = {
      title: getText("h1.x-item-title__mainTitle"),
      price: isNaN(price) ? "N/A" : price.toString(),
      brand: brand !== "N/A" ? brand : undefined,
      currency: "GBP",
      image: images[0] || null,
      allImages: images,
      description: descriptionText,
      descriptionUrl: descriptionIframeUrl,
      category,
      rrp: rrp || undefined, // add RRP to product object
    };

    // Override with JSON-LD if available and more accurate
    if (jsonLdProduct) {
      product.title = jsonLdProduct.name || product.title;
      const ldPrice = jsonLdProduct.offers?.price;
      if (ldPrice) product.price = ldPrice.toString();
      product.currency = jsonLdProduct.offers?.priceCurrency || "GBP";
      product.brand = jsonLdProduct.brand?.name || product.brand;
      if (jsonLdProduct.image && jsonLdProduct.image.length) {
        for (const img of jsonLdProduct.image) {
          if (!product.allImages.includes(img)) product.allImages.push(img);
        }
      }
      // Check for RRP in JSON-LD (sometimes in `offers` as `priceSpecification`)
      if (jsonLdProduct.offers?.priceSpecification?.price) {
        const specPrice = parseFloat(
          jsonLdProduct.offers.priceSpecification.price,
        );
        if (!isNaN(specPrice) && specPrice !== price) product.rrp = specPrice;
      }
      console.log(
        `🔄 Overridden with JSON-LD: title=${product.title}, price=${product.price}`,
      );
    }

    console.log(`✨ Scrape completed in ${Date.now() - startTime}ms`);
    return {
      success: true,
      data: {
        product,
        seller,
        itemSpecifics,
      },
      html: rawHtml,
    };
  } catch (error: any) {
    console.error(
      `❌ Scraping failed after ${Date.now() - startTime}ms:`,
      error.message,
    );
    if (error.stack) console.error(error.stack);
    return { success: false, error: "Failed to retrieve data from eBay." };
  }
}
