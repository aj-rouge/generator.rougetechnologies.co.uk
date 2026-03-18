// Type definitions for ProductSearch (optional, for TypeScript)
export interface ProductSearch {
  slug: string;
  title: string;
  sku: string;
  ean?: string;
  asin?: string;
  baselinker_id?: string;
  shopify_id?: string;
  category: string;
  created_at: number;
}
export interface SearchResult {
  slug: string;
  title: string;
  sku: string;
  ean: string | null;
  asin: string | null;
  baselinker_id: string | null;
  shopify_id: string | null;
  category: string;
  created_at: number;
  matchType?: "exact" | "prefix" | "fts";
  detectedType?: string;
  snippet?: {
    title: string;
  };
}

export interface SearchApiResponse {
  results: SearchResult[];
  nextCursor: string | null;
}

export type ProductSearchInsert = Omit<ProductSearch, "created_at"> & {
  created_at?: number; // Optional for insertion (can default to Date.now())
};
