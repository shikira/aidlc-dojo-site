// types.ts — canonical content-domain types (OWNED by UW-02, domain-entities.md).
//
// These are the single source of truth for the shapes the query layer, the BV
// validators, and downstream units (UW-03/04/05) depend on. They are pure
// TypeScript (no `astro:content` import) so the whole query/validation layer is
// unit-testable outside the Astro build. The Zod schemas in
// `src/content.config.ts` are the runtime (build-time) enforcement of these
// same shapes; the two are kept in lock-step by design (domain-entities.md
// "スキーマは厳格" — strict, no loose passthrough).

/** Version discriminator (NFR-8). Display "共通" is stored as the data value `common`. */
export type Version = 'v1' | 'v2' | 'common';

/** The three allowed version values, in canonical order. */
export const VERSIONS: readonly Version[] = ['v1', 'v2', 'common'] as const;

/** Belt identifier — the canonical belt enum owned by UW-02. URL-safe slug. */
export type Belt = 'white' | 'brown' | 'black';

/** The three belts, in learning order (white → brown → black). */
export const BELTS: readonly Belt[] = ['white', 'brown', 'black'] as const;

/**
 * A learning unit (CT-1). Frontmatter is `{ id, title, version }`; `body` is the
 * raw Markdown after the frontmatter. `readingTimeMin` is NOT stored — it is
 * derived at build time from `body` (BV-3), so it is absent here.
 */
export interface Unit {
  id: string;
  title: string;
  version: Version;
  /** Raw Markdown body (h2 sections). Char count drives BV-3 reading time. */
  body: string;
}

/** A learning path (CT-2). One file per belt; owns the unit ordering. */
export interface PathDef {
  belt: Belt;
  nameJa: string;
  nameEn: string;
  audience: string;
  /** Ordered unit ids. A unit does NOT know its paths (Q4) — this is the only link. */
  unitIds: string[];
}

/** A single review question (CT-3). Stored in per-belt question pools. */
export interface Question {
  id: string;
  unitId: string;
  /** The unit section (h2 slug/index) this question follows. */
  afterSection: string;
  prompt: string;
  /** 2–5 answer choices (BV-2). */
  choices: string[];
  /** Index into `choices` of the correct answer. */
  answerIndex: number;
  explanation: string;
  /** Verified https source URL (Q5; BV-2 checks https-format only). */
  sourceUrl: string;
}

/** An article / blog-style entry (CT-4). */
export interface Article {
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  version: Version;
  body: string;
}

/** The four raw collections as loaded from disk or from `getCollection`. */
export interface RawCollections {
  units: Unit[];
  paths: PathDef[];
  questions: Question[];
  articles: Article[];
}
