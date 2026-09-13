// app/utils/scrape/currys.ts
//
// Scrapes both Currys storefronts:
//   • www.currys.co.uk           → JSON-LD + .tech-specification-* tables
//   • business.currys.co.uk      → dataLayer + plpEvent + DOM dl/dt/dd
//
// Both need NO JS rendering — everything is in the raw HTML.
//
// Key design points:
//   1. Query strings are stripped from Currys URLs before fetching.
//      Decodo's proxy returns empty HTML when fed the Google-Shopping
//      tracking query string (?cidp=…&gclid=…) that PDPs normally carry.
//   2. HTML is cached per-URL for CACHE_TTL_MS so image + metadata calls
//      share one Decodo request instead of firing two.
//   3. Empty HTML triggers one silent retry.

import * as cheerio from "cheerio";
import { fetchRawHtml } from "./decodo";

// =============================================================================
// Shared types
// =============================================================================

export type CurrysStorefront = "retail" | "business";

export interface CurrysSpec {
  key: string;
  value: string;
}

export interface CurrysVariant {
  name: string;
  priceExVat?: number;
  url?: string;
  image?: string;
  isCurrent?: boolean;
}

export interface CurrysStock {
  status?: string;
  level?: number;
}

export interface CurrysBreadcrumb {
  name: string;
  url: string;
}

export interface CurrysMetadata {
  productName?: string;
  brand?: string;
  /** Storefront display price (ex VAT on business, inc VAT on retail). */
  price?: number;
  priceExVat?: number;
  priceIncVat?: number;
  sku?: string;
  mpn?: string;
  ean?: string;
  stock?: CurrysStock;
  specifications?: CurrysSpec[];
  features?: string[];
  variants?: CurrysVariant[];
  description?: string;
  breadcrumbs?: CurrysBreadcrumb[];
  images?: string[];
}

// =============================================================================
// URL normalisation + HTML cache
// =============================================================================

/**
 * Strip every query parameter from a Currys URL.
 *
 * Currys PDPs are always linked from Google Shopping with a huge
 * `?cidp=…&srcid=…&cmpid=…&gclid=…` tracking string. Decodo's universal
 * target returns an empty body when that string is present, so we fetch
 * the canonical path-only URL instead.
 */
export function normalizeCurrysUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

type CacheEntry = { html: string; expiresAt: number };
const htmlCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a Currys PDP's HTML, deduped + cached.
 * Always uses the normalized (query-stripped) URL.
 */
export async function fetchCurrysHtml(rawUrl: string): Promise<string> {
  const url = normalizeCurrysUrl(rawUrl);

  const cached = htmlCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`♻️  [currys] HTML cache HIT: ${url}`);
    return cached.html;
  }

  const pending = inFlight.get(url);
  if (pending) {
    console.log(`⏳ [currys] Joining in-flight fetch: ${url}`);
    return pending;
  }

  const task = (async () => {
    console.log(`🌐 [currys] Fetching HTML: ${url}`);

    let html = await tryFetch(url);

    if (!html || html.length < 5000) {
      console.log(
        `⚠️  [currys] Empty/short HTML (${html?.length ?? 0} chars), retrying once…`,
      );
      await new Promise((r) => setTimeout(r, 750));
      html = await tryFetch(url);
    }

    if (!html || html.length === 0) {
      throw new Error(`Decodo returned no HTML for ${url}`);
    }

    htmlCache.set(url, { html, expiresAt: Date.now() + CACHE_TTL_MS });
    console.log(`✅ [currys] Cached HTML (${html.length} chars): ${url}`);
    return html;
  })();

  inFlight.set(url, task);
  try {
    return await task;
  } finally {
    inFlight.delete(url);
  }
}

async function tryFetch(url: string): Promise<string> {
  try {
    return await fetchRawHtml(url);
  } catch (e) {
    console.log(
      `⚠️  [currys] fetchRawHtml failed for ${url}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return "";
  }
}

// =============================================================================
// Dispatcher
// =============================================================================

export function detectCurrysStorefront(url: string): CurrysStorefront | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "business.currys.co.uk") return "business";
    if (host === "currys.co.uk" || host === "www.currys.co.uk") return "retail";
    if (host.endsWith(".currys.co.uk")) return "retail";
    return null;
  } catch {
    return null;
  }
}

export async function scrapeCurrysProductImages(
  url: string,
): Promise<string[]> {
  const store = detectCurrysStorefront(url);
  const html = await fetchCurrysHtml(url);
  if (store === "business") return extractBusinessImages(html);
  return extractImagesFromJSONLD(html);
}

export async function extractCurrysMetadata(
  url: string,
): Promise<CurrysMetadata> {
  const store = detectCurrysStorefront(url);
  if (store === "business") return extractBusinessMetadata(url);
  return extractRetailMetadata(url);
}

// =============================================================================
// Business storefront — business.currys.co.uk
// =============================================================================

const DIXONS_IMG_RE =
  /https:\/\/brain-images-ssl\.cdn\.dixons\.com\/[^"')\s]+?\.(?:jpg|jpeg|png|webp)/gi;

function extractDataLayer(html: string): any | null {
  let m = html.match(
    /var\s+dataLayer\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:\r?\n\s*)?var\s+width/,
  );
  if (!m) {
    m = html.match(/var\s+dataLayer\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:\r?\n|$)/);
  }
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function extractPlpEvent(html: string): any | null {
  // NOTE: no /s flag — ES5-safe equivalent of "any char incl. newline"
  const m = html.match(/const\s+raw\s*=\s*('(?:[^'\\]|\\[\s\S])*')\s*;/);
  if (!m) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const jsonString = new Function(`return ${m[1]}`)() as string;
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

export function extractBusinessImages(html: string): string[] {
  console.log("🖼️ [business] Starting image extraction");
  console.log(`   HTML length: ${html.length} chars`);

  const $ = cheerio.load(html);
  const urls = new Set<string>();

  const mainSlideCount = $(".itemSwiper .swiper-slide").length;
  const thumbSlideCount = $(".itemThumbsSwiper .swiper-slide").length;
  const mainImgCount = $(".itemSwiper .swiper-slide img").length;
  const thumbImgCount = $(".itemThumbsSwiper .swiper-slide img").length;
  const anyDixonsImgs = $('img[src*="brain-images-ssl.cdn.dixons.com"]').length;

  console.log(`   #product-gallery present: ${$("#product-gallery").length}`);
  console.log(`   .itemSwiper .swiper-slide: ${mainSlideCount}`);
  console.log(`   .itemThumbsSwiper .swiper-slide: ${thumbSlideCount}`);
  console.log(`   .itemSwiper img: ${mainImgCount}`);
  console.log(`   .itemThumbsSwiper img: ${thumbImgCount}`);
  console.log(`   any img[src*=brain-images...]: ${anyDixonsImgs}`);

  const push = (src?: string | null) => {
    if (!src) return;
    const clean = src.split("?")[0].trim();
    if (clean) urls.add(clean);
  };

  if (mainSlideCount > 0) {
    $(".itemSwiper .swiper-slide")
      .toArray()
      .sort((a, b) => {
        const ai = parseInt($(a).attr("data-swiper-slide-index") ?? "", 10);
        const bi = parseInt($(b).attr("data-swiper-slide-index") ?? "", 10);
        if (isNaN(ai) && isNaN(bi)) return 0;
        if (isNaN(ai)) return 1;
        if (isNaN(bi)) return -1;
        return ai - bi;
      })
      .forEach((el) => {
        const $img = $(el).find("img").first();
        const src =
          $img.attr("src") ||
          $img.attr("data-src") ||
          $img.attr("data-lazy-src");
        push(src);
      });
  }

  const afterMain = urls.size;
  console.log(`   → after main gallery: ${afterMain} unique`);

  $(".itemThumbsSwiper .swiper-slide img").each((_, el) => {
    const $img = $(el);
    const src =
      $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src");
    push(src);
  });
  console.log(
    `   → after thumbs: ${urls.size} unique (+${urls.size - afterMain})`,
  );

  if (urls.size === 0) {
    console.log("   ⚠️ Falling back to raw regex scan");
    const matches = html.match(DIXONS_IMG_RE) ?? [];
    console.log(`   Regex matched ${matches.length} Dixons URLs`);
    matches.forEach((u) => push(u));
  }

  const result = [...urls];
  console.log(`🖼️ [business] Final image count: ${result.length}`);
  return result;
}

function extractBusinessSpecs($: cheerio.CheerioAPI): CurrysSpec[] {
  const specs: CurrysSpec[] = [];
  const $root = $("#specifications").first();
  if (!$root.length) return specs;

  let section = "";

  $root.children().each((_, el) => {
    const $el = $(el);
    const tag = (el as any).tagName?.toLowerCase();

    if (tag === "h3") {
      section = $el.text().trim();
      return;
    }

    if (tag === "dl") {
      $el.find("dt").each((_, dt) => {
        const key = $(dt).text().trim();
        const value = $(dt).next("dd").text().trim();
        if (!key || !value) return;
        specs.push({
          key: section ? `${section} — ${key}` : key,
          value,
        });
      });
    }
  });

  return specs;
}

function extractBusinessFeatures($: cheerio.CheerioAPI): string[] {
  return $(".features > li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

function extractBusinessVariants($: cheerio.CheerioAPI): CurrysVariant[] {
  const variants: CurrysVariant[] = [];

  $("#product-variants li").each((_, li) => {
    const $li = $(li);

    const $clone = $li.clone();
    $clone.find("br, img, p, a").remove();
    const name = $clone.text().replace(/\s+/g, " ").trim();

    const priceText = $li.find("p.price").text().replace(/,/g, "");
    const priceMatch = priceText.match(/£([\d.]+)/);

    const image =
      $li.find("img").attr("data-src") || $li.find("img").attr("src");

    let url: string | undefined;
    const $wrap = $li.closest("a");
    if ($wrap.length) url = $wrap.attr("href");
    if (!url) {
      const $inner = $li.find("a").first();
      if ($inner.length) url = $inner.attr("href");
    }

    if (!name && !priceMatch) return;

    variants.push({
      name,
      priceExVat: priceMatch ? parseFloat(priceMatch[1]) : undefined,
      url,
      image,
      isCurrent: $li.hasClass("current"),
    });
  });

  return variants;
}

async function extractBusinessMetadata(url: string): Promise<CurrysMetadata> {
  console.log(`🔖 [business] Extracting metadata from: ${url}`);
  try {
    const html = await fetchCurrysHtml(url);
    const $ = cheerio.load(html);

    const dl = extractDataLayer(html);
    const pe = extractPlpEvent(html);
    const info = dl?.product?.productInfo ?? {};
    const pdet = pe?.productDetail?.[0];

    const domTitle =
      $(".title h1").first().text().trim() ||
      $("#add-to-basket-fix .product-title-fix h1").first().text().trim() ||
      $("h1").first().text().trim();

    const parsePrice = (s: string): number | undefined => {
      const m = s.replace(/,/g, "").match(/£\s*([\d.]+)/);
      return m ? parseFloat(m[1]) : undefined;
    };
    const domPriceExVat = parsePrice($(".price").first().text());
    const domPriceIncVat = parsePrice($(".price.inc-vat").first().text());

    const codesText = $("dl.product-codes dd").first().text().trim();
    const [skuFromDom, mpnFromDom] = codesText.split("|").map((s) => s.trim());

    const stockText = $(".stock").first().text().trim();
    const stockLevelFromDom = stockText.match(/(\d+)\s+in stock/i);

    const breadcrumbs: CurrysBreadcrumb[] = $("ul.breadcrumbs > li > a")
      .map((_, a) => ({
        name: $(a).text().trim(),
        url: ($(a).attr("href") || "").trim(),
      }))
      .get();

    const description = $("#description p").first().text().trim() || undefined;

    const images = extractBusinessImages(html);

    const priceExVat =
      typeof info.currentPrice === "number" ? info.currentPrice : domPriceExVat;
    const priceIncVat =
      typeof pdet?.price?.retailPrice === "number"
        ? pdet.price.retailPrice
        : domPriceIncVat;

    const meta: CurrysMetadata = {
      productName: info.productName || pdet?.name || domTitle || undefined,
      brand: info.attributes?.manufacturer || pdet?.brand || undefined,
      price: priceExVat,
      priceExVat,
      priceIncVat,
      sku: info.productSKU || pdet?.id || skuFromDom || undefined,
      mpn: info.productPart || pdet?.manufacturePartNumber || mpnFromDom,
      ean: pdet?.ean?.[0],
      stock: {
        status: info.stockStatus,
        level:
          typeof info.stockLevel === "number"
            ? info.stockLevel
            : stockLevelFromDom
              ? parseInt(stockLevelFromDom[1], 10)
              : undefined,
      },
      specifications: extractBusinessSpecs($),
      features: extractBusinessFeatures($),
      variants: extractBusinessVariants($),
      description,
      breadcrumbs: breadcrumbs.length ? breadcrumbs : undefined,
      images,
    };

    console.log(
      `📦 [business] name="${meta.productName ?? "N/A"}", brand="${
        meta.brand ?? "N/A"
      }", exVat=${meta.priceExVat ?? "N/A"}, incVat=${
        meta.priceIncVat ?? "N/A"
      }, specs=${meta.specifications?.length ?? 0}, variants=${
        meta.variants?.length ?? 0
      }, images=${meta.images?.length ?? 0}`,
    );

    return meta;
  } catch (error) {
    console.error(
      "❌ [business] Error extracting metadata:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}

// =============================================================================
// Retail storefront — www.currys.co.uk
// =============================================================================

export function extractImagesFromJSONLD(html: string): string[] {
  console.log("🔍 [retail] Extracting images from JSON-LD...");
  const jsonLdRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;

  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) matches.push(match[1]);
  console.log(`📄 [retail] Found ${matches.length} JSON-LD script(s)`);

  const allImages: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    try {
      const jsonLd = JSON.parse(matches[i]);
      if (jsonLd["@type"] === "Product" && jsonLd.image) {
        const urls: string[] = Array.isArray(jsonLd.image)
          ? jsonLd.image.map((img: string) => img.split("?")[0].trim())
          : [jsonLd.image.split("?")[0].trim()];
        allImages.push(...urls);
      } else if (jsonLd["@type"] === "ProductGroup" && jsonLd.hasVariant) {
        for (const variant of jsonLd.hasVariant) {
          if (!variant.image) continue;
          const urls: string[] = Array.isArray(variant.image)
            ? variant.image.map((img: string) => img.split("?")[0].trim())
            : [variant.image.split("?")[0].trim()];
          allImages.push(...urls);
        }
      }
    } catch {
      /* skip invalid JSON */
    }
  }

  const uniqueImages = [...new Map(allImages.map((i) => [i, i])).values()];
  console.log(`✅ [retail] Total unique images: ${uniqueImages.length}`);
  return uniqueImages;
}

function extractRetailSpecs($: cheerio.CheerioAPI): CurrysSpec[] {
  const specs: CurrysSpec[] = [];

  $(".tech-specification-table").each((_, table) => {
    const $table = $(table);
    $table.find(".tech-specification-body").each((_, row) => {
      const $row = $(row);
      const key = $row.find(".tech-specification-th").first().text().trim();
      const value = $row.find(".tech-specification-td").first().text().trim();
      if (key && value) specs.push({ key, value });
    });
  });

  $(".pdp-item-features .item").each((_, el) => {
    const feature = $(el).text().trim();
    if (feature) specs.push({ key: "Key Feature", value: feature });
  });

  return specs;
}

async function extractRetailMetadata(url: string): Promise<CurrysMetadata> {
  console.log(`🔖 [retail] Extracting metadata from: ${url}`);
  try {
    const html = await fetchCurrysHtml(url);
    const $ = cheerio.load(html);

    const jsonLdRegex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    let bestName = "";
    let bestBrand = "";
    let bestPrice: number | undefined;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonLd = JSON.parse(match[1]);
        if (jsonLd["@type"] === "Product") {
          bestName = jsonLd.name || bestName;
          bestBrand = jsonLd.brand?.name || bestBrand;
          if (jsonLd.offers?.price) {
            const p = parseFloat(jsonLd.offers.price);
            if (!isNaN(p)) bestPrice = p;
          }
        } else if (jsonLd["@type"] === "ProductGroup") {
          bestName = jsonLd.name || bestName;
          bestBrand = jsonLd.brand?.name || bestBrand;
          if (jsonLd.hasVariant?.length) {
            for (const variant of jsonLd.hasVariant) {
              if (variant.name) bestName = variant.name;
              if (variant.brand?.name) bestBrand = variant.brand.name;
              if (variant.offers?.price) {
                const p = parseFloat(variant.offers.price);
                if (!isNaN(p)) bestPrice = p;
              }
            }
          }
        }
      } catch {
        /* skip */
      }
    }

    if (!bestName) {
      const titleSelectors = [
        "h1.product-name",
        'h1[data-test="product-title"]',
        "h1.pdp-product-title",
        ".product-name h1",
      ];
      for (const sel of titleSelectors) {
        const text = $(sel).first().text().trim();
        if (text) {
          bestName = text;
          break;
        }
      }
    }
    if (!bestBrand) {
      const brandSelectors = ["[data-brand]", ".product-brand", ".brand-name"];
      for (const sel of brandSelectors) {
        const brand = sel.startsWith("[")
          ? $(sel).attr("data-brand") || ""
          : $(sel).first().text().trim();
        if (brand) {
          bestBrand = brand;
          break;
        }
      }
    }
    if (!bestPrice) {
      const priceSelectors = [
        '[data-test="product-price"]',
        ".price .value",
        ".sales .value",
      ];
      for (const sel of priceSelectors) {
        const priceText = $(sel).first().text().trim();
        if (priceText) {
          const cleaned = priceText.replace(/[^0-9.]/g, "");
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            bestPrice = num;
            break;
          }
        }
      }
    }

    const specs = extractRetailSpecs($);
    const images = extractImagesFromJSONLD(html);

    console.log(
      `📦 [retail] name="${bestName || "N/A"}", brand="${
        bestBrand || "N/A"
      }", price="${bestPrice ?? "N/A"}", specs=${specs.length}, images=${
        images.length
      }`,
    );

    return {
      productName: bestName || undefined,
      brand: bestBrand || undefined,
      price: bestPrice,
      priceIncVat: bestPrice,
      specifications: specs.length ? specs : undefined,
      images,
    };
  } catch (error) {
    console.error(
      "❌ [retail] Error extracting metadata:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}
