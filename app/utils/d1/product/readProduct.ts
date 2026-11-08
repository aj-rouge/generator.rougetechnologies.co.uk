// utils/d1/product/readProduct.ts
import { executeQuery } from "../execute";
import type { D1Database } from "@cloudflare/workers-types";

export type AllowedProductLookupFields =
  | "id"
  | "slug"
  | "sku"
  | "ean"
  | "asin"
  | "baselinker_id"
  | "shopify_id";

function parseJSON(value: any): any {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

const sanitize = (value: any): any => {
  if (value === "null" || value === null) return "";
  return value;
};

const sanitizeNullableText = (value: any): string | null => {
  if (value === "null" || value === null || value === undefined) return null;
  return value;
};

const getProductByField = async (
  field: AllowedProductLookupFields,
  value: string,
  options: {
    db: D1Database;
    transformToForm?: boolean;
  },
): Promise<any | null> => {
  const { db, transformToForm } = options;

  const query = `SELECT * FROM v_product_complete WHERE ${field} = ?`;
  const results = await executeQuery(query, [value], db);
  if (!results || results.length === 0) return null;

  const product = results[0];

  // Parse all JSON fields
  product.seo_sections = parseJSON(product.seo_sections) || [];
  product.paragraphs = parseJSON(product.paragraphs) || [];
  product.features = parseJSON(product.features) || [];
  product.images = parseJSON(product.images) || [];
  product.feedbacks = parseJSON(product.feedbacks) || [];
  product.specifications = parseJSON(product.specifications) || [];
  product.thresholds = parseJSON(product.thresholds) || [];
  product.category_keywords = parseJSON(product.category_keywords_json) || [];
  product.condition_options = parseJSON(product.condition_options) || [];

  if (product.condition_group_key) {
    product.condition_group = {
      group_key: product.condition_group_key,
      group_name: product.condition_group_name,
      options: product.condition_options,
    };
    delete product.condition_group_key;
    delete product.condition_group_name;
    delete product.condition_options;
  }

  delete product.category_keywords_json;

  if (transformToForm) {
    const paragraphs = product.paragraphs || [];
    const features = product.features || [];
    const images = (product.images || []).map((img: any) => ({
      url: img.url,
      s3Path: img.s3_path,
      altText: img.alt_text,
      isUploaded: !!img.s3_path,
      needsUpload: false,
      uploadStatus: img.s3_path ? "completed" : "pending",
    }));
    const feedbacks = product.feedbacks || [];
    const cleanedNote = product.note === "null" ? null : product.note;

    const rawSpecs = parseJSON(product.specifications) || [];
    const specifications = rawSpecs.map((pair: [string, string]) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      key: pair[0] || "",
      value: pair[1] || "",
    }));

    const seoSectionData = parseJSON(product.seo_sections) || {
      name: "",
      sections: [],
    };

    const toNumber = (val: any, defaultValue = 0): number => {
      if (val === null || val === undefined || val === "") return defaultValue;
      const num = Number(val);
      return isNaN(num) ? defaultValue : num;
    };

    return {
      id: product.id,
      slug: `${product.category_slug}/${product.slug}`,
      title: product.title,
      sku: sanitize(product.sku || ""),
      asin: sanitize(product.asin || ""),
      ean: sanitize(product.ean || ""),
      baselinker_id: sanitize(product.baselinker_id || ""),
      shopify_id: sanitize(product.shopify_id || ""),
      condition: product.product_condition || "New",
      note: cleanedNote,
      additional_description_1: sanitizeNullableText(
        product.additional_description_1,
      ),
      additional_description_2: sanitizeNullableText(
        product.additional_description_2,
      ),
      additional_description_3: sanitizeNullableText(
        product.additional_description_3,
      ),
      created_at: product.created_at,
      updated_at: product.updated_at,
      paragraphs,
      features,
      images,
      feedbacks,
      specifications,
      thresholds: product.thresholds || [],
      selectedCategory: product.category_slug,
      vat_rate: toNumber(product.vat_rate, 0),
      price_brutto: toNumber(product.price_brutto, 0),
      rrp: toNumber(product.rrp, 0),
      weight: toNumber(product.weight, 0),
      quantity: toNumber(product.quantity, 0),
      shipping_method: product.shipping_method || "",
      ebayLink: product.ebay_link || "",
      seoSectionData,
    };
  }
  return product;
};

export const getProductById = (
  id: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("id", id, options);

export const getProductByAsin = (
  asin: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("asin", asin, options);

export const getProductByEan = (
  ean: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("ean", ean, options);

export const getProductBySku = (
  sku: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("sku", sku, options);

export const getProductByBaselinkerId = (
  baselinkerId: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("baselinker_id", baselinkerId, options);

export const getProductByShopifyId = (
  shopifyId: string,
  options: { db: D1Database; transformToForm?: boolean },
) => getProductByField("shopify_id", shopifyId, options);
