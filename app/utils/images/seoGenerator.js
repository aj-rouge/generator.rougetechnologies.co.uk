export function generateSeoSlug(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and") // Replace "&" with "and" first
    .replace(/[^\w\s-]/g, "") // Remove non-word, non-space, non-hyphen characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Collapse multiple consecutive hyphens to single hyphen
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start/end
}

export function generateSeoFileName(
  category,
  productTitle,
  imageNumber,
  fileExtension = "webp",
) {
  if (!category || !productTitle || !imageNumber) return "";

  const categorySlug = generateSeoSlug(category);
  const productSlug = generateSeoSlug(productTitle);
  return `${categorySlug}/${productSlug}/${productSlug}-image-${imageNumber}.${fileExtension}`;
}

export function generateSeoAltText(productTitle, imageNumber) {
  if (!productTitle) return "";
  return `Check out the ${productTitle} at Rouge Technologies - image ${imageNumber}`;
}
