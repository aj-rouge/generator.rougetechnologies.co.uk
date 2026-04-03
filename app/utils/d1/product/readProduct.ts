import { executeQuery } from "../execute/executeQuery";

/**
 * Parses a JSON string into a JavaScript value.
 * If the input is not a string or cannot be parsed, returns the original value.
 * Used to convert JSON columns from the database into usable objects/arrays.
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
 * Transforms a D1 product object into the format expected by the edit form.
 * This includes adding UI state fields and restructuring data as needed.
 *
 * @param product - The raw product object from the database
 * @returns Formatted product data ready for the edit form
 */
export function transformD1ToFormData(product: any) {
  // Helper to convert "null" string to empty string
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
    selectedCategory: product.category_slug,
  };
}

/**
 * Retrieve a complete product by any unique identifier field.
 *
 * This function queries the `v_product_complete` view, which joins:
 *   - products (core product data)
 *   - categories (category details, keywords, eBay link)
 *   - category_content (SEO sections, as JSON)
 *   - product_paragraphs (as JSON array)
 *   - product_features (as JSON array)
 *   - product_images (as JSON array)
 *   - product_feedbacks (as JSON array)
 *   - conditions & condition_options (condition group with options)
 *
 * The view returns one row per product, with child records aggregated into JSON strings.
 * This function:
 *   1. Parses all JSON fields into JavaScript arrays/objects.
 *   2. Reconstructs the condition group object from flattened fields.
 *   3. Removes temporary raw JSON fields.
 *
 * @param field - The column name to search by. Must be a unique identifier:
 *                'id', 'slug', 'sku', 'ean', 'asin', 'baselinker_id', 'shopify_id'
 * @param value - The value to match (as string).
 * @param transform - Whether to transform the result to form format (default: false)
 * @returns The complete product object with all related data, or `null` if no product matches.
 *
 * @example
 * // Get product by SKU
 * const product = await getProductBySku('ABC-123');
 * console.log(product.title);              // "Awesome Gadget"
 * console.log(product.features);            // [{ title: "Fast", description: "..." }, ...]
 * console.log(product.images[0].url);       // "https://..."
 * console.log(product.condition_group);     // { group_key: "electronics", group_name: "Electronics", options: ["New", "Used", ...] }
 *
 * @example
 * // Get product by ASIN for edit form
 * const product = await getProductByAsin('B08N5WRWNW', { transformToForm: true });
 * // product now has UI state fields like images[0].isUploaded, etc.
 */
export const getProductByField = async (
  field: string,
  value: string,
  options?: { transformToForm?: boolean },
): Promise<any | null> => {
  const query = `SELECT * FROM v_product_complete WHERE ${field} = ?`;
  const results = await executeQuery(query, [value]);
  if (!results || results.length === 0) return null;

  const product = results[0];

  // Parse all JSON fields
  product.seo_sections = parseJSON(product.seo_sections) || [];
  product.paragraphs = parseJSON(product.paragraphs) || [];
  product.features = parseJSON(product.features) || [];
  product.images = parseJSON(product.images) || [];
  product.feedbacks = parseJSON(product.feedbacks) || [];
  product.category_keywords = parseJSON(product.category_keywords_json) || [];
  product.condition_options = parseJSON(product.condition_options) || [];

  // Reconstruct condition group
  if (product.condition_group_key) {
    product.condition_group = {
      group_key: product.condition_group_key,
      group_name: product.condition_group_name,
      options: product.condition_options,
    };
    // Optionally remove flattened fields
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
