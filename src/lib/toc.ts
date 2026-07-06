// toc.ts — build-time table-of-contents extraction (C9 TocDisclosure).
//
// business-logic-model: extract h2 headings only and produce anchor ids with
// the SAME slugger the Markdown renderer uses, so TOC links can never dangle
// (link-breakage structurally excluded — single source). Duplicate slugs are
// disambiguated with a numeric suffix, matching github-slugger semantics.
import type { TocEntry } from '../components/contracts';

/** A heading record as produced by the Markdown pipeline (Astro getHeadings). */
export interface HeadingInput {
  /** Heading level: 1 for h1, 2 for h2, … */
  depth: number;
  text: string;
}

/**
 * Slugify heading text into an anchor id. Unicode-aware so Japanese headings
 * keep their characters. Shared between the TOC and the heading renderer.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/**
 * Extract an h2-only table of contents. Deeper/shallower headings are ignored
 * (A1 heading-hierarchy correctness is enforced by lint + authoring rules, not
 * here). Duplicate slugs get a `-1`, `-2`, … suffix so every anchor is unique.
 */
export function extractToc(headings: readonly HeadingInput[]): TocEntry[] {
  const seen = new Map<string, number>();
  const entries: TocEntry[] = [];
  for (const heading of headings) {
    if (heading.depth !== 2) {
      continue;
    }
    const base = slugify(heading.text);
    const priorCount = seen.get(base) ?? 0;
    seen.set(base, priorCount + 1);
    const anchorId = priorCount === 0 ? base : `${base}-${priorCount}`;
    entries.push({ text: heading.text, anchorId });
  }
  return entries;
}
