"use server";

import axios from "axios";
import * as cheerio from "cheerio";

async function fetchDescriptionFromIframe(iframeUrl) {
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
  } catch (error) {
    console.error("❌ Failed to fetch description:", error.message);
    return "Description could not be loaded.";
  }
}

export async function scrapeEbayProduct(ebayUrl) {
  console.log(`\n🚀 Starting eBay scrape for URL: ${ebayUrl}`);
  const startTime = Date.now();

  try {
    // 1. Request HTML via scraping API
    console.log("⏳ Requesting HTML from scraper API...");
    const response = await axios.post(
      "https://scraper-api.decodo.com/v2/scrape",
      {
        url: ebayUrl,
        target: "universal",
        render: "html",
      },
      {
        headers: {
          Authorization: `Basic VTAwMDAzMzY1MDA6UFdfMTU1OWEwN2I4N2NiMjU4YTk1MjhlYWY4NDc2MTMwYzU2`,
          "Content-Type": "application/json",
        },
      },
    );

    const rawHtml = response.data.results[0].content;
    const htmlSizeKB = (rawHtml.length / 1024).toFixed(1);
    console.log(`✅ HTML received (${htmlSizeKB} KB)`);

    const $ = cheerio.load(rawHtml);
    const getText = (selector) => $(selector).first().text().trim() || "N/A";

    // 2. Extract JSON-LD Product
    console.log("🔍 Extracting JSON-LD Product...");
    let jsonLdProduct = null;
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
    if (!jsonLdProduct) console.log("⚠️ No JSON-LD Product found");

    // 3. Extract category from breadcrumbs (JSON-LD or HTML)
    console.log("🏷️ Extracting product category...");
    let category = "N/A";
    // First try JSON-LD BreadcrumbList
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "BreadcrumbList" && data.itemListElement) {
          const items = data.itemListElement
            .filter((item) => item["@type"] === "ListItem" && item.name)
            .map((item) => item.name);
          // Skip first item if it's "eBay"
          if (items[0] === "eBay" && items.length > 1) {
            category = items.slice(1).join(" > ");
          } else {
            category = items.join(" > ");
          }
          console.log(`✅ Category from JSON-LD: ${category}`);
          return false;
        }
      } catch (e) {}
    });
    // Fallback to HTML breadcrumbs if JSON-LD not found
    if (category === "N/A") {
      const breadcrumbs = [];
      $(".breadcrumbs li a").each((i, el) => {
        const text = $(el).text().trim();
        if (text) breadcrumbs.push(text);
      });
      if (breadcrumbs.length > 0) {
        category = breadcrumbs.join(" > ");
        console.log(`✅ Category from HTML breadcrumbs: ${category}`);
      } else {
        console.log("⚠️ No category breadcrumbs found");
      }
    }

    // 4. Extract images
    console.log("🖼️ Extracting images...");
    const images = [];
    $(".ux-image-carousel-item img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !images.includes(src)) images.push(src);
    });
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) images.push(ogImage);
    }
    console.log(`📸 Found ${images.length} images`);

    // 5. Extract item specifics
    console.log("🏷️ Extracting item specifics...");
    const itemSpecifics = {};
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
    console.log(
      `📋 Found ${Object.keys(itemSpecifics).length} item specifics:`,
      itemSpecifics,
    );

    // 6. Extract seller details
    console.log("🏪 Extracting seller details...");
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
    console.log("👤 Seller:", seller);

    // 7. Extract shipping, returns, payments
    console.log("🚚 Extracting shipping & returns...");
    const shipping = getText(
      ".ux-labels-values--shipping .ux-textspans:first-child",
    );
    const returns = getText(
      ".x-returns-minview .ux-labels-values--returns .ux-textspans:first-child",
    );
    const payments = $(".d-payments-minview .ux-textspans[title]")
      .map((i, el) => $(el).attr("title"))
      .get();
    console.log(`📦 Shipping: ${shipping}`);
    console.log(`🔄 Returns: ${returns}`);
    console.log(`💳 Payments: ${payments.join(", ") || "N/A"}`);

    // 8. Extract description iframe
    const descriptionIframeUrl = $("#desc_ifr").attr("src") || "N/A";
    console.log(`📄 Description iframe URL: ${descriptionIframeUrl}`);
    let descriptionText = "Loading description...";
    if (descriptionIframeUrl !== "N/A") {
      descriptionText = await fetchDescriptionFromIframe(descriptionIframeUrl);
    } else {
      console.log("⚠️ No description iframe found");
    }

    // 9. Basic product data (from selectors)
    console.log("📦 Extracting basic product data...");
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
      category: category, // Add category to product object
    };
    console.log("🛒 Product (before JSON-LD override):", {
      title: product.title,
      price: product.price,
      condition: product.condition,
      quantityAvailable: product.quantityAvailable,
      imagesCount: product.allImages.length,
      category: product.category,
    });

    // 10. Override with JSON-LD if available
    if (jsonLdProduct) {
      console.log("🔄 Overriding product data with JSON-LD...");
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
        jsonLdProduct.image.forEach((img) => {
          if (!product.allImages.includes(img)) product.allImages.push(img);
        });
      }
      console.log("✅ After JSON-LD override:", {
        title: product.title,
        price: product.price,
        currency: product.currency,
        brand: product.brand,
        mpn: product.mpn,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`✨ Scrape completed in ${elapsed}ms`);
    console.log("📊 Final data summary:", {
      productTitle: product.title,
      price: `${product.price} ${product.currency}`,
      category: product.category,
      imagesCount: product.allImages.length,
      itemSpecificsCount: Object.keys(itemSpecifics).length,
      seller: seller.name,
    });

    return {
      success: true,
      data: {
        product,
        seller,
        shipping,
        returns,
        payments,
        itemSpecifics,
      },
      html: rawHtml,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Scraping failed after ${elapsed}ms:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return { success: false, error: "Failed to retrieve data from eBay." };
  }
}
