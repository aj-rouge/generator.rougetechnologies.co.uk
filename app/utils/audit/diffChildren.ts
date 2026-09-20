import type { Diff } from "./types";

type KeyFn<T> = (item: T) => string;
type ValueFn<T> = (item: T) => unknown;

/**
 * Diff two ordered lists by a stable identity key.
 * Emits changes as `fieldPath[key]` so the activity feed can render them
 * individually: "specifications[RAM]: 8GB → 16GB".
 */
export function diffChildren<T>(
  fieldPath: string,
  before: T[] | null | undefined,
  after: T[] | null | undefined,
  keyOf: KeyFn<T>,
  valueOf: ValueFn<T>,
): Diff[] {
  const b = before ?? [];
  const a = after ?? [];

  const bMap = new Map<string, T>();
  for (const item of b) bMap.set(keyOf(item), item);

  const aMap = new Map<string, T>();
  for (const item of a) aMap.set(keyOf(item), item);

  const changes: Diff[] = [];

  // Removals
  for (const [key, item] of bMap) {
    if (!aMap.has(key)) {
      changes.push({
        field: `${fieldPath}[${key}]`,
        old: valueOf(item),
        new: null,
      });
    }
  }

  // Additions and modifications
  for (const [key, aItem] of aMap) {
    const bItem = bMap.get(key);
    if (!bItem) {
      changes.push({
        field: `${fieldPath}[${key}]`,
        old: null,
        new: valueOf(aItem),
      });
      continue;
    }
    if (JSON.stringify(valueOf(bItem)) !== JSON.stringify(valueOf(aItem))) {
      changes.push({
        field: `${fieldPath}[${key}]`,
        old: valueOf(bItem),
        new: valueOf(aItem),
      });
    }
  }

  return changes;
}
