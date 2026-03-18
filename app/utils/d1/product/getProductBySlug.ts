// utils/d1/product/getProductBySlug.ts
import { executeQuery } from "../db/client";

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

export const getProductBySlug = async (slug: string): Promise<any | null> => {
  // 1. Fetch product with category display name
  const productQuery = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category = c.slug
    WHERE p.slug = ?
  `;

  const productResults = await executeQuery(productQuery, [slug]);
  if (!productResults || productResults.length === 0) return null;

  const product = productResults[0];

  // 2. Fetch related data in parallel
  const [paragraphs, features, images, feedbacks] = await Promise.all([
    executeQuery(
      "SELECT * FROM product_paragraphs WHERE product_id = ? ORDER BY paragraph_order",
      [product.id],
    ),
    executeQuery(
      "SELECT * FROM product_features WHERE product_id = ? ORDER BY feature_order",
      [product.id],
    ),
    executeQuery(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY image_order",
      [product.id],
    ),
    executeQuery("SELECT * FROM product_feedbacks WHERE product_id = ?", [
      product.id,
    ]),
  ]);

  product.paragraphs = paragraphs || [];
  product.features = features || [];
  product.images = images || [];
  product.feedbacks = feedbacks || [];

  // 3. Fetch category data directly from categories table with condition info
  const categoryQuery = `
    SELECT 
      c.*,
      cond.group_key,
      cond.group_name,
      (
        SELECT json_group_array(option_value ORDER BY option_order)
        FROM condition_options 
        WHERE condition_group_id = c.condition_group_id
      ) as condition_options
    FROM categories c
    LEFT JOIN conditions cond ON c.condition_group_id = cond.id
    WHERE c.slug = ?
  `;

  const categoryResults = await executeQuery(categoryQuery, [product.category]);
  if (categoryResults && categoryResults.length > 0) {
    const cat = categoryResults[0];

    // Parse keywords JSON
    const keywords = parseJSON(cat.keywords);

    // Build condition group object if condition info exists
    let conditionGroup = null;
    if (cat.condition_group_id && cat.group_key) {
      const options = parseJSON(cat.condition_options);
      conditionGroup = {
        group_key: cat.group_key,
        group_name: cat.group_name,
        options: Array.isArray(options) ? options : [],
      };
    }

    product.category_data = {
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      parent_category: cat.parent_category,
      condition_group_id: cat.condition_group_id,
      ebay_store_link: cat.ebay_store_link,
      keywords: Array.isArray(keywords) ? keywords : [],
      condition_group: conditionGroup,
    };

    // Also attach condition group directly for easy access
    product.condition_group = conditionGroup;
  } else {
    // Fallback: minimal category data (no condition group, keywords, etc.)
    product.category_data = {
      slug: product.category,
      name: product.category_name || product.category,
      keywords: [],
      ebay_store_link: null,
      condition_group: null,
    };
    product.condition_group = null;
  }

  // 4. Fetch category content (SEO sections)
  const contentResults = await executeQuery(
    `SELECT * FROM category_content WHERE category_slug = ? ORDER BY section_order`,
    [product.category],
  );

  if (contentResults && contentResults.length > 0) {
    product.category_content = contentResults.map((row: any) => ({
      id: row.id,
      section_order: row.section_order,
      subheading: row.subheading,
      paragraphs: parseJSON(row.paragraphs) || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } else {
    product.category_content = [];
  }

  return product;
};
