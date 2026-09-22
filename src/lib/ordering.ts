/**
 * Items are ordered by a floating point `position`. Dropping an item computes a value
 * midway between its two new neighbours, so a reorder writes one row instead of
 * renumbering the whole column.
 *
 * Repeated drops into the same gap halve it each time, so after enough moves the
 * midpoint stops being distinguishable in a double. `needsReindex` catches that and
 * the caller renumbers the column once, which is cheap for lists this size.
 */
export const POSITION_GAP = 1024

/** Below this a gap is close enough to the limits of double precision to renumber. */
const MIN_GAP = 1e-6

export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_GAP
  if (before === undefined) return after! - POSITION_GAP
  if (after === undefined) return before + POSITION_GAP
  return (before + after) / 2
}

export function needsReindex(before: number | undefined, after: number | undefined): boolean {
  if (before === undefined || after === undefined) return false
  return Math.abs(after - before) < MIN_GAP
}

/** Evenly spaced positions for a whole column, used after a reindex. */
export function reindexed<T>(items: T[]): { item: T; position: number }[] {
  return items.map((item, index) => ({ item, position: (index + 1) * POSITION_GAP }))
}
