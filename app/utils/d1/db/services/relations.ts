import { executeQuery } from "../client";

export const addParagraphs = async (
  productId: string,
  paragraphs: string[],
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < paragraphs.length; i++) {
    await executeQuery(
      "INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at) VALUES (?, ?, ?, ?)",
      [productId, i, paragraphs[i], now],
    );
  }
};

export const addFeatures = async (
  productId: string,
  features: Array<{ title: string; description: string }>,
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    await executeQuery(
      "INSERT INTO product_features (product_id, feature_order, title, description, created_at) VALUES (?, ?, ?, ?, ?)",
      [productId, i, feature.title, feature.description, now],
    );
  }
};

export const addImages = async (
  productId: string,
  images: Array<{
    url: string;
    s3_path?: string;
    alt_text?: string;
    warnings?: string | null;
  }>,
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    await executeQuery(
      "INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, warnings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        productId,
        i,
        img.url,
        img.s3_path || null,
        img.alt_text || null,
        img.warnings || null,
        now,
      ],
    );
  }
};

export const addFeedbacks = async (
  productId: string,
  feedbacks: Array<{ name: string; count: number; content: string }>,
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  for (const feedback of feedbacks) {
    await executeQuery(
      "INSERT INTO product_feedbacks (product_id, name, count, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [productId, feedback.name, feedback.count, feedback.content, now],
    );
  }
};

export const updateRelations = async (
  productId: string,
  data: {
    paragraphs?: string[];
    features?: Array<{ title: string; description: string }>;
    images?: Array<{ url: string; s3_path?: string; alt_text?: string }>;
    feedbacks?: Array<{ name: string; count: number; content: string }>;
  },
): Promise<void> => {
  if (data.paragraphs) {
    await executeQuery("DELETE FROM product_paragraphs WHERE product_id = ?", [
      productId,
    ]);
    await addParagraphs(productId, data.paragraphs);
  }

  if (data.features) {
    await executeQuery("DELETE FROM product_features WHERE product_id = ?", [
      productId,
    ]);
    await addFeatures(productId, data.features);
  }

  if (data.images) {
    await executeQuery("DELETE FROM product_images WHERE product_id = ?", [
      productId,
    ]);
    await addImages(productId, data.images);
  }

  if (data.feedbacks) {
    await executeQuery("DELETE FROM product_feedbacks WHERE product_id = ?", [
      productId,
    ]);
    await addFeedbacks(productId, data.feedbacks);
  }
};