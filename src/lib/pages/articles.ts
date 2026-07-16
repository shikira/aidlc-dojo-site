// articles.ts — TopPage news-teaser helper (business-logic-model 純関数 L-1).
//
// UW-04 owns display helpers only; it CONSUMES UW-02's canonical `Article` and
// does not re-define it. `latestArticles` picks the newest `n` for the TopPage
// news teaser, which the page HIDES entirely when the result is empty
// (business-rules B-3 — never show an empty section). Pure + synchronous, so it
// is unit-tested to the src/**/*.ts coverage floor.
import type { Article } from '../content/types';

/** Default teaser size on the TopPage (M1 — newest three). */
export const DEFAULT_TEASER_COUNT = 3;

/**
 * The newest `n` articles by ISO `date`, descending. Returns a NEW array (the
 * input is not mutated); ties preserve input order (stable sort). An empty
 * input — or a non-positive `n` — yields an empty array, in which case the
 * TopPage renders no news section at all (B-3).
 */
export function latestArticles(
  articles: readonly Article[],
  n = DEFAULT_TEASER_COUNT,
): Article[] {
  if (n <= 0) {
    return [];
  }
  return [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}
