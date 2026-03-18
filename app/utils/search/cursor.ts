export interface CursorData {
  lastSortValue: number; // last created_at or updated_at value
  lastSlug: string;
  sortColumn: "created_at" | "updated_at";
  sortOrder: "ASC" | "DESC";
  lastId?: string; // optional for UUID-based pagination
  lastScore?: number; // optional for relevance-based sorting
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const data = JSON.parse(Buffer.from(cursor, "base64").toString());
    // Validate required fields
    if (
      typeof data.lastSortValue === "number" &&
      typeof data.lastSlug === "string" &&
      (data.sortColumn === "created_at" || data.sortColumn === "updated_at") &&
      (data.sortOrder === "ASC" || data.sortOrder === "DESC")
    ) {
      return {
        lastSortValue: data.lastSortValue,
        lastSlug: data.lastSlug,
        sortColumn: data.sortColumn,
        sortOrder: data.sortOrder,
        lastId: data.lastId,
        lastScore: data.lastScore,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Helper for creating a cursor (defaults to created_at DESC for legacy compatibility)
export function createCursorFromProduct(
  product: any,
  sortColumn: "created_at" | "updated_at" = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
): string {
  return encodeCursor({
    lastSortValue: product[sortColumn],
    lastSlug: product.slug,
    sortColumn,
    sortOrder,
    lastId: product.id,
    lastScore: product.relevance_score, // if applicable
  });
}
