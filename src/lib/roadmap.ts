// roadmap.ts — the FROZEN roadmap dataset + grouping/anchor helpers
// (domain-entities.md RoadmapItem / 着地アンカー契約, business-rules R-1/R-4).
//
// This module OWNS the roadmap's static data. The `anchorId` set is UW-05's ONLY
// outward contract (domain-entities 着地アンカー契約): other units deep-link into
// `/roadmap/#<anchorId>` (UW-04 graduation display, path-end [reserved] seats),
// so the set is frozen here and its uniqueness is guarded by the
// `roadmapAnchorIds()` tests (R-4). Every title/description is a CT-5 dictionary
// key (NFR-9) — the .astro page resolves them through `t()`, so no roadmap label
// is ever hardcoded. Pure + synchronous → fully unit-testable outside the Astro
// build (src/**/*.ts coverage boundary).

/** Delivery status — the display grouping (business-logic-model S6, 3 区分). */
export type RoadmapStatus = 'shipped' | 'planned' | 'later';

/** Release band a roadmap item belongs to (requirements FR-4/5/6/7). */
export type Release = 'R1' | 'R2' | 'R3' | 'R4';

/** A single roadmap entry / reserved seat (domain-entities RoadmapItem). */
export interface RoadmapItem {
  /** Stable identifier. */
  id: string;
  /** Unique deep-link anchor — inbound links land at `/roadmap/#<anchorId>` (R-4). */
  anchorId: string;
  /** CT-5 dictionary key for the item title (NFR-9 — never hardcoded). */
  titleKey: string;
  /** CT-5 dictionary key for the item description. */
  descKey: string;
  /** Delivery status (drives the section grouping + StatusBadge). */
  status: RoadmapStatus;
  /** Release band. */
  release: Release;
}

/** A status-grouped block of roadmap items (domain-entities RoadmapSection). */
export interface RoadmapSection {
  status: RoadmapStatus;
  items: RoadmapItem[];
}

/** Section render order: shipped → planned → later (business-logic-model S6). */
export const ROADMAP_STATUS_ORDER: readonly RoadmapStatus[] = [
  'shipped',
  'planned',
  'later',
] as const;

/**
 * Convert a kebab-case `anchorId` to a dictionary-key-safe camelCase segment.
 * `anchorId` may contain hyphens (valid in an HTML `id`), but CT-5 keys forbid
 * them (BV-4 域.部品.用途 naming), so the two identifiers are derived, not shared.
 * e.g. `learning-paths` → `learningPaths`, `daily-quiz` → `dailyQuiz`.
 */
function toKeySegment(anchorId: string): string {
  return anchorId.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

/** Build a roadmap item, deriving its CT-5 title/description keys from `anchorId`. */
function item(
  anchorId: string,
  status: RoadmapStatus,
  release: Release,
): RoadmapItem {
  const segment = toKeySegment(anchorId);
  return {
    id: anchorId,
    anchorId,
    titleKey: `roadmap.item.${segment}.title`,
    descKey: `roadmap.item.${segment}.desc`,
    status,
    release,
  };
}

/**
 * The FROZEN roadmap dataset (domain-entities 着地アンカー契約). Array order is
 * the display order within each section. Adding an R2+ seat is a one-line append
 * here (domain-entities: 予約席の追加は静的データに1項目追記する定型作業).
 *
 * The `anchorId` strings are frozen — renaming one silently breaks inbound
 * deep-links (R-4), so changes require a coordinated cross-unit update.
 */
export const ROADMAP_ITEMS: readonly RoadmapItem[] = [
  // R1 — shipped (公開済み)
  item('learning-paths', 'shipped', 'R1'),
  item('quiz', 'shipped', 'R1'),
  item('version-tags', 'shipped', 'R1'),
  item('news', 'shipped', 'R1'),
  item('analytics', 'shipped', 'R1'),
  // R2 — planned (準備中)
  item('exam', 'planned', 'R2'),
  item('ranking', 'planned', 'R2'),
  item('badges', 'planned', 'R2'),
  item('registration', 'planned', 'R2'),
  item('terms', 'planned', 'R2'),
  // R3 — later (その後)
  item('level-check', 'later', 'R3'),
  item('review', 'later', 'R3'),
  item('daily-quiz', 'later', 'R3'),
  item('sync', 'later', 'R3'),
  // R4 — later (その後)
  item('i18n', 'later', 'R4'),
];

/**
 * Group the frozen dataset into the three display sections
 * (shipped/planned/later) in fixed order. For R1 every returned section has ≥1
 * item (guarded by tests), so the roadmap page never renders an empty section.
 */
export function roadmapSections(): RoadmapSection[] {
  return ROADMAP_STATUS_ORDER.map((status) => ({
    status,
    items: ROADMAP_ITEMS.filter((entry) => entry.status === status),
  }));
}

/**
 * Every `anchorId` in dataset order — the single source for the deep-link
 * landing contract (R-4). Tests assert uniqueness (zero duplicates) and
 * reserved-seat coverage so an inbound link can never point at a dead anchor.
 */
export function roadmapAnchorIds(): string[] {
  return ROADMAP_ITEMS.map((entry) => entry.anchorId);
}
