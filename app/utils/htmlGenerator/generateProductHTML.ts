// utils/htmlGenerator/generateProductHTML.ts
"use server";

import { getProductById } from "../d1/product/readProduct";
import { getCategoryBySlug } from "../d1/category/getCategoryBySlug";
import { getCategoryContent } from "../d1/getCategoryContent";
import LivePreview from "../../components/preview/LivePreview";

// Reuse the same data transformation as in EditProductForm
function buildPreviewData(product: any, category: any, categoryContent: any) {
  return {
    title: product.title,
    condition: product.condition,
    images: product.images || [],
    paragraphs: product.paragraphs || [],
    features: product.features || [],
    note: product.note,
    feedbacks: product.feedbacks || [],
    selectedCategory: product.category_slug,
    ebayLink: category?.ebay_store_link || "",
    categoryName: category?.name || product.category_slug,
    categoryContent: categoryContent?.content || [],
  };
}

export async function generateProductHTML(productId: string): Promise<string> {
  // Dynamically import server‑only modules
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");

  const product = await getProductById(productId, { transformToForm: true });
  if (!product) throw new Error("Product not found");

  const category = await getCategoryBySlug(product.selectedCategory);
  const categoryContent = await getCategoryContent(product.selectedCategory);

  const previewProps = buildPreviewData(product, category, categoryContent);

  const componentHtml = renderToStaticMarkup(
    createElement(LivePreview, previewProps),
  );

  const cleanedHtml = componentHtml.replace(
    /<link rel="preload" as="image" href="[^"]*"\/?>/g,
    "",
  );

  const cssUrl = "https://generator.rougetechnologies.co.uk/api/css";

  return `<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" type="text/css" href="${cssUrl}">
<meta charset="UTF-8">
<style>*{margin:0;padding:0;border:0;}</style>
${cleanedHtml}`;
}
