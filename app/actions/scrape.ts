"use server";

import axios from "axios";
import * as cheerio from "cheerio";

async function fetchDescriptionFromIframe(iframeUrl) {
  if (!iframeUrl || iframeUrl === "N/A") return "No description available.";
  try {
    const response = await axios.get(iframeUrl, { timeout: 10000 });
    const $desc = cheerio.load(response.data);
    // Remove scripts and styles to get clean text
    $desc("script, style").remove();
    const text = $desc("body").text().trim();
    return text.length > 500 ? text.substring(0, 500) + "..." : text;
  } catch (error) {
    console.error("Failed to fetch description:", error);
    return "Description could not be loaded.";
  }
}

export async function scrapeEbayProduct(ebayUrl) {
  try {
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
    const $ = cheerio.load(rawHtml);

    const getText = (selector) => $(selector).first().text().trim() || "N/A";

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

    // Extract all images from the gallery
    const images = [];
    $(".ux-image-carousel-item img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !images.includes(src)) images.push(src);
    });
    // Fallback: if no gallery images, try og:image
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) images.push(ogImage);
    }

    // Item specifics (key-value pairs)
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

    // Shipping & returns
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
      // Fetch description in background (we'll do it async, but for server action we await)
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
        // Merge any additional images from JSON-LD
        jsonLdProduct.image.forEach((img) => {
          if (!product.allImages.includes(img)) product.allImages.push(img);
        });
      }
    }

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
    console.error("Scraping failed:", error);
    return { success: false, error: "Failed to retrieve data from eBay." };
  }
}
