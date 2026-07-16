// reading.ts — PathPage total-reading-time helper (business-logic-model 純関数 / US-R1-11).
//
// The per-unit reading time is DERIVED by UW-02 (readingTime = ceil(chars/600),
// BV-3); UW-04 only SUMS it for the path header, so the summed value can never
// diverge from the per-unit values shown in the list. Pure + synchronous, so it
// is unit-tested to the src/**/*.ts coverage floor.

/**
 * The single field this helper needs — any unit carrying a build-time-derived
 * reading time (`UnitWithReadingTime` satisfies it). Interface-segregated so
 * tests need not construct a full unit.
 */
export interface HasReadingTime {
  readingTimeMin: number;
}

/**
 * Sum the reading time (minutes) across a path's units. An empty path totals 0
 * (the PathPage empty state — B-4 — handles a unit-less belt separately, so this
 * only ever returns 0 for a genuinely empty input). Does not mutate its input.
 */
export function pathTotalReadingMin(units: readonly HasReadingTime[]): number {
  return units.reduce((total, unit) => total + unit.readingTimeMin, 0);
}
