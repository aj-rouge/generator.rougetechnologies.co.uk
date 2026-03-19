export interface Product {
  id: string;
  slug: string;
  title: string;
  sku: string | null;
  ean: string | null;
  asin: string | null;
  baselinker_id: string | null;
  shopify_id: string | null;
  category: string;
  condition: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;

  // Relations (populated when needed)
  paragraphs?: ProductParagraph[];
  features?: ProductFeature[];
  images?: ProductImage[];
  feedbacks?: ProductFeedback[];
}

export interface ProductParagraph {
  id: number;
  product_id: string;
  paragraph_order: number;
  content: string;
  created_at: number;
}

export interface ProductFeature {
  id: number;
  product_id: string;
  feature_order: number;
  title: string;
  description: string;
  created_at: number;
}

export interface ProductImage {
  id: number;
  product_id: string;
  image_order: number;
  url: string;
  s3_path: string | null;
  alt_text: string | null;
  created_at: number;
}

export interface ProductFeedback {
  id: number;
  product_id: string;
  name: string;
  count: number;
  content: string;
  created_at: number;
}

export interface ProductFilter {
  category?: string;
  search?: string;
  minUpdated?: number;
  maxUpdated?: number;
  limit?: number;
  offset?: number;
  sortBy?: "created_at" | "updated_at";
  sortOrder?: "ASC" | "DESC";
}
