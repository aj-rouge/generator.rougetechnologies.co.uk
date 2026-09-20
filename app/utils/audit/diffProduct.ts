import { diff } from "./build";
import { diffChildren } from "./diffChildren";
import type { Diff } from "./types";

// Master fields we diff.
const MASTER_FIELDS = [
  "title",
  "sku",
  "ean",
  "asin",
  "baselinker_id",
  "shopify_id",
  "condition",
  "note",
  "vat_rate",
  "rrp",
  "weight",
  "quantity",
  "price_brutto",
  "shipping_method",
] as const;

/**
 * Collapse "empty" values to null so the read path (which returns "" for
 * empty text) and the write path (which returns null) compare equal.
 * Without this, a no-op save logs `old: "", new: null` for every text field.
 */
function normalizeValue(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v === "number" && Number.isNaN(v)) return null;
  return v;
}

function normalizeMaster(p: Record<string, any> | null): Record<string, any> {
  if (!p) return {};
  const out: Record<string, any> = {};
  for (const f of MASTER_FIELDS) {
    out[f] = normalizeValue(p[f]);
  }
  out.category = normalizeValue(p.selectedCategory ?? p.category ?? null);
  return out;
}

/**
 * Returns [] for create. For updates: master row diffs + per-child-key diffs.
 */
export function diffProduct(
  before: Record<string, any> | null | undefined,
  after: Record<string, any>,
): Diff[] {
  if (!before) return [];

  const changes: Diff[] = [];

  // 1. Master row
  changes.push(...diff(normalizeMaster(before), normalizeMaster(after)));

  // 2. Specifications — identity is `key`, value is `value`
  changes.push(
    ...diffChildren(
      "specifications",
      before.specifications,
      after.specifications,
      (s: any) => String(s.key ?? ""),
      (s: any) => normalizeValue(s.value),
    ),
  );

  // 3. Features — identity is `title`, value is `description`
  changes.push(
    ...diffChildren(
      "features",
      before.features,
      after.features,
      (f: any) => String(f.title ?? ""),
      (f: any) => normalizeValue(f.description),
    ),
  );

  // 4. Paragraphs — index-keyed, value is content
  type Paragraph = { idx: number; content: string };

  changes.push(
    ...diffChildren<Paragraph>(
      "paragraphs",
      ((before.paragraphs ?? []) as string[]).map(
        (content, i): Paragraph => ({ idx: i + 1, content }),
      ),
      ((after.paragraphs ?? []) as string[]).map(
        (content, i): Paragraph => ({ idx: i + 1, content }),
      ),
      (p) => String(p.idx),
      (p) => normalizeValue(p.content),
    ),
  );

  // 5. Images — identity is the s3 path (or url fallback), value is alt text
  changes.push(
    ...diffChildren(
      "images",
      before.images,
      after.images,
      (img: any) => String(img.s3_path ?? img.s3Path ?? img.url ?? ""),
      (img: any) => normalizeValue(img.alt_text ?? img.altText ?? null),
    ),
  );

  // 6. Feedbacks — identity is `name`, value is `content`
  changes.push(
    ...diffChildren(
      "feedbacks",
      before.feedbacks,
      after.feedbacks,
      (fb: any) => String(fb.name ?? ""),
      (fb: any) => normalizeValue(fb.content),
    ),
  );

  return changes;
}
