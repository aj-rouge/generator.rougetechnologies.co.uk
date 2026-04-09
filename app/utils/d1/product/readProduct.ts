// utils/d1/product/readProduct.ts

import { executeQuery } from "../execute/executeQuery";

/**
 * Parses a JSON string into a JavaScript value.
 */
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

/**
 * Generates a temporary unique ID for client‑side specification rows.
 * This matches the format used in SpecificationsManager.
 */
function generateTempSpecId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Transforms a D1 product object into the format expected by the edit form.
 */
export function transformD1ToFormData(product: any) {
  const sanitize = (value: any): any => {
    if (value === "null") return "";
    return value;
  };

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

  // 🆕 Parse and transform specifications
  const rawSpecs = parseJSON(product.specifications) || []; // array of [key, value]
  const specifications = rawSpecs.map((pair: [string, string]) => ({
    id: generateTempSpecId(),
    key: pair[0] || "",
    value: pair[1] || "",
  }));

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
    created_at: product.created_at,
    updated_at: product.updated_at,
    paragraphs,
    features,
    images,
    feedbacks,
    specifications, // 🆕 added
    selectedCategory: product.category_slug,
  };
}

export const getProductByField = async (
  field: string,
  value: string,
  options?: { transformToForm?: boolean },
): Promise<any | null> => {
  const query = `SELECT * FROM v_product_complete WHERE ${field} = ?`;
  const results = await executeQuery(query, [value]);
  if (!results || results.length === 0) return null;

  const product = results[0];

  // Parse all JSON fields (including the new specifications)
  product.seo_sections = parseJSON(product.seo_sections) || [];
  product.paragraphs = parseJSON(product.paragraphs) || [];
  product.features = parseJSON(product.features) || [];
  product.images = parseJSON(product.images) || [];
  product.feedbacks = parseJSON(product.feedbacks) || [];
  product.specifications = parseJSON(product.specifications) || []; // 🆕
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
  // console.log(
  //   "Fetched product:",
  //   JSON.stringify(transformD1ToFormData(product), null, 2),
  // );
  // Transform to form format if requested
  if (options?.transformToForm) {
    return transformD1ToFormData(product);
  }

  return product;
};

// Convenience wrappers for each identifier
export const getProductById = (
  id: string,
  options?: { transformToForm?: boolean },
) => getProductByField("id", id, options);

export const getProductByAsin = (
  asin: string,
  options?: { transformToForm?: boolean },
) => getProductByField("asin", asin, options);

export const getProductByEan = (
  ean: string,
  options?: { transformToForm?: boolean },
) => getProductByField("ean", ean, options);

export const getProductBySku = (
  sku: string,
  options?: { transformToForm?: boolean },
) => getProductByField("sku", sku, options);

export const getProductByBaselinkerId = (
  baselinkerId: string,
  options?: { transformToForm?: boolean },
) => getProductByField("baselinker_id", baselinkerId, options);

export const getProductByShopifyId = (
  shopifyId: string,
  options?: { transformToForm?: boolean },
) => getProductByField("shopify_id", shopifyId, options);
