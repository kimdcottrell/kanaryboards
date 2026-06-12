import { generateKeyBetween } from "fractional-indexing";

interface Ordered {
  id: string;
  order: string;
}

// Stable 3-way comparator on `order`. Returns 0 on equal so items that share an
// order (e.g. legacy data with empty orders) keep their original array position
// under JS's stable sort.
export const byOrder = (a: Ordered, b: Ordered): number =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : 0;

// Fractional key that places `movedId` immediately before `beforeId`, or at the
// end of the list when `beforeId` is null. Returns null for an invalid/no-op
// move (missing item or dropping onto itself) so the caller can bail.
export function reorderKey(
  list: Ordered[],
  movedId: string,
  beforeId: string | null,
): string | null {
  if (movedId === beforeId) return null;
  const sorted = list
    .filter((i) => i.id !== movedId)
    .sort(byOrder);
  if (beforeId === null) {
    const last = sorted[sorted.length - 1];
    return generateKeyBetween(last?.order ?? null, null);
  }
  const idx = sorted.findIndex((i) => i.id === beforeId);
  if (idx === -1) return null;
  const prev = sorted[idx - 1]?.order ?? null;
  const next = sorted[idx].order;
  return generateKeyBetween(prev, next);
}

// Fractional key for a new item inserted at `insertBeforeIndex` in an
// order-sorted list (appended to the end when the index is omitted).
export function insertKey(
  list: Ordered[],
  insertBeforeIndex?: number,
): string {
  const sorted = [...list].sort(byOrder);
  const at = insertBeforeIndex ?? sorted.length;
  const prev = sorted[at - 1]?.order ?? null;
  const next = sorted[at]?.order ?? null;
  return generateKeyBetween(prev, next);
}
