// app/[category]/[slug]/edit/page.tsx
import { notFound } from "next/navigation";
import ProductForm from "../../../components/ProductForm";
import { getProductBySlug } from "../../../utils/d1/product/getProductBySlug";
import EditProductForm from "../../../components/EditProductForm";

/**
 * Transforms the D1 product data (snake_case + relations) into the
 * camelCase format expected by the ProductForm component.
 */
function transformD1ToFormData(product: any) {
  // Extract paragraphs content in correct order
  const paragraphs = (product.paragraphs || [])
    .sort((a: any, b: any) => a.paragraph_order - b.paragraph_order)
    .map((p: any) => p.content);

  // Extract features
  const features = (product.features || [])
    .sort((a: any, b: any) => a.feature_order - b.feature_order)
    .map((f: any) => ({
      title: f.title,
      description: f.description,
    }));

  // Extract images – map snake_case to camelCase AND add UI state fields
  const images = (product.images || [])
    .sort((a: any, b: any) => a.image_order - b.image_order)
    .map((img: any) => ({
      url: img.url, // original source URL
      s3Path: img.s3_path, // R2 path (if any)
      altText: img.alt_text,
      // UI state fields needed by ImagesManager
      isUploaded: !!img.s3_path, // true if already in R2
      needsUpload: false, // false for existing images
      uploadStatus: img.s3_path ? "completed" : "pending", // "completed" for existing images
    }));

  // Extract feedbacks
  const feedbacks = (product.feedbacks || []).map((fb: any) => ({
    name: fb.name,
    count: fb.count,
    content: fb.content,
  }));

  // Parse category keywords from the category_data added in getProductBySlug
  const categoryKeywords = product.category_data?.keywords || [];

  // Get condition group info
  const conditionGroup = product.condition_group || null;

  // Get eBay link from category data
  const ebayLink = product.category_data?.ebay_store_link || "";

  // Get category content for SEO sections
  const seoSectionData = {
    name: `${product.category_name || product.category} at Rouge Technologies`,
    sections: product.category_content || [],
  };

  // Clean the note field if it's the string "null"
  const cleanedNote = product.note === "null" ? null : product.note;

  return {
    // Core product fields
    id: product.id,
    slug: `${product.category}/${product.slug}`,
    title: product.title,
    sku: product.sku || "",
    asin: product.asin || "",
    ean: product.ean || "",
    baselinker_id: product.baselinker_id || "",
    shopify_id: product.shopify_id || "",
    condition: product.condition || "New",
    note: cleanedNote,
    created_at: product.created_at,
    updated_at: product.updated_at,

    // Related data
    paragraphs,
    features,
    images,
    feedbacks,

    // Category fields (renamed to match ProductForm expectations)
    selectedCategory: product.category, // This matches what ProductForm uses
    category: product.category_name || product.category, // Keep for backward compatibility

    // Additional fields needed by ProductForm
    categoryKeywords: categoryKeywords,
    conditionGroup: conditionGroup,
    ebayLink: ebayLink,
    seoSectionData: seoSectionData,
  };
}

export default async function EditPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  // In Next.js 15+, params is a Promise
  const { category, slug } = await params;
  const fullSlug = `${category}/${slug}`;

  console.log(`🔍 Fetching product from D1: ${fullSlug}`);

  // Fetch product with all relations and enhanced category data
  const product = await getProductBySlug(slug);

  console.log(
    `📦 Product fetched from D1: ${JSON.stringify(product, null, 2)}`,
  );

  if (!product) {
    console.log(`❌ Product not found for slug: ${slug}`);
    notFound();
  }

  // Transform D1 data to match ProductForm's expected structure
  const initialData = transformD1ToFormData(product);

  console.log(`✨ Transformed data: ${JSON.stringify(initialData, null, 2)}`);

  return <EditProductForm initialData={initialData} />;
}
