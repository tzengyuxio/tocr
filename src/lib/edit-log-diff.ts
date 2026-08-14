/** Bookkeeping columns; they change on every write and say nothing useful. */
const UNDIFFED_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

export type FieldDiff = { from: unknown; to: unknown };

/**
 * Field-level diff between the row as it was and as it is now, so the log shows
 * what an edit changed instead of only what it wrote. Both sides are full rows,
 * so derived columns (publishSort, foundedSort) are covered as well.
 */
export function diffChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>
): Record<string, FieldDiff> {
  const changes: Record<string, FieldDiff> = {};
  for (const [field, value] of Object.entries(after)) {
    if (UNDIFFED_FIELDS.has(field)) continue;
    const from = normalize(before?.[field]);
    const to = normalize(value);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from, to };
    }
  }
  return changes;
}

/** Dates and Decimals are not comparable -- or storable -- as themselves. */
function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  // Prisma returns Decimal columns (Issue.price) as Decimal.js instances.
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toFixed?: unknown }).toFixed === "function"
  ) {
    return String(value);
  }
  return value;
}

/**
 * Diff a set of related ids (an article's tags, its games).
 *
 * Relations are written separately from the row, so diffChanges -- which reads
 * the row -- cannot see them. Without this, an edit that only adds a tag has an
 * empty diff, and an empty diff now means "wrote nothing" and is not logged.
 *
 * Order is not meaningful, so both sides are sorted before comparing.
 */
export function diffIds(
  before: string[],
  after: string[]
): FieldDiff | null {
  const from = [...before].sort();
  const to = [...after].sort();
  if (JSON.stringify(from) === JSON.stringify(to)) return null;
  return { from, to };
}
