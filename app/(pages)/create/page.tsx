"use server";
import { notFound } from "next/navigation";
import ProductForm from "../../components/forms/ProductForm";
import { executeQuery } from "../../utils/d1/execute/executeQuery";

function transformD1ToFormData(product: any) {
  // paragraphs is already an array of strings in correct order
  const paragraphs = product.paragraphs || [];

  // features is already an array of {title, description}
  const features = product.features || [];

  // images: add UI state fields needed by ImagesManager
  const images = (product.images || []).map((img: any) => ({
    url: img.url,
    s3Path: img.s3_path,
    altText: img.alt_text,
    isUploaded: !!img.s3_path,
    needsUpload: false,
    uploadStatus: img.s3_path ? "completed" : "pending",
  }));

  const feedbacks = product.feedbacks || [];

  const categoryKeywords = product.category_keywords || [];
  const conditionGroup = product.condition_group || null;
  const ebayLink = product.ebayLink || "";

  const seoSectionData = {
    name: `${product.category_name || product.category_slug} at Rouge Technologies`,
    sections: product.seo_sections || [],
  };

  const cleanedNote = product.note === "null" ? null : product.note;

  return {
    // Core product fields
    id: product.id,
    slug: `${product.category_slug}/${product.slug}`,
    title: product.title,
    sku: product.sku || "",
    asin: product.asin || "",
    ean: product.ean || "",
    baselinker_id: product.baselinker_id || "",
    shopify_id: product.shopify_id || "",
    condition: product.product_condition || "New",
    note: cleanedNote,
    created_at: product.created_at,
    updated_at: product.updated_at,

    // Related data
    paragraphs,
    features,
    images,
    feedbacks,

    // Category fields
    selectedCategory: product.category_slug,
    category: product.category_name || product.category_slug,
    categoryKeywords,
    conditionGroup,
    ebayLink,
    seoSectionData,
  };
}
// Helper to safely parse JSON
function safeJSONParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value; // already parsed
}

// Recursively parse a category object
function parseCategory(cat) {
  const parsed = {
    ...cat,
    keywords: safeJSONParse<string[]>(cat.keywords, []),
    condition_group: cat.condition_group
      ? safeJSONParse<any>(cat.condition_group, null)
      : null,
  };

  if (cat.children) {
    const childrenArray = safeJSONParse<any[]>(cat.children, []);
    parsed.children = childrenArray.map((child: any) => parseCategory(child));
  } else {
    parsed.children = [];
  }

  return parsed;
}

export default async function CreatePage() {
  const rawCategories = await executeQuery(`
    SELECT * FROM v_category_tree
    ORDER BY id ASC
  `);

  // Parse all categories
  const categories = (rawCategories || []).map(parseCategory);

  console.log("📂 Parsed categories:", JSON.stringify(categories, null, 2));
  return <ProductForm categoriesAndAllRelatedData={categories} />;
}
