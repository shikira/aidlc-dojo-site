// articles.ts — display helpers over UW-02's Article (business-logic-model 純関数).
//
// UW-05 CONSUMES UW-02's canonical `Article` ({ slug, title, date, version, body })
// and does NOT re-define it (domain-entities: 型を二重定義しない). These two pure
// functions shape articles for the `/news/` list: a stable, date-descending sort
// and a plaintext excerpt derived from the Markdown body — CT-4 has no `summary`
// field, so the excerpt is body-derived (business-logic-model). Pure +
// synchronous → unit-tested to the src/**/*.ts coverage floor.
import type { Article } from './content/types';

/** Default excerpt length (characters) for the `/news/` list cards. */
export const DEFAULT_EXCERPT_CHARS = 120;

/**
 * Sort articles newest-first by ISO `date` (YYYY-MM-DD compares lexicographically),
 * preserving input order among equal dates (stable). Returns a NEW array; the
 * input is not mutated. An empty input yields an empty array — the caller renders
 * the `/news/` empty state rather than an empty list (R-3).
 */
export function sortArticlesForList(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * A single-line plaintext excerpt from an article's Markdown `body`: strip
 * Markdown/HTML markup and collapse whitespace, then take the first `maxChars`
 * characters. Appends an ellipsis (…) ONLY when the plaintext was truncated; a
 * body shorter than `maxChars` is returned in full with no ellipsis.
 */
export function articleExcerpt(
  article: Article,
  maxChars = DEFAULT_EXCERPT_CHARS,
): string {
  const plain = toPlainText(article.body);
  if (plain.length <= maxChars) {
    return plain;
  }
  return `${plain.slice(0, maxChars).trimEnd()}…`;
}

/**
 * Reduce a Markdown/HTML body to a single-line plaintext string. Conservative
 * and dependency-free: it removes structural markup (comments, code fences,
 * headings, lists, blockquotes, emphasis) and keeps human-readable link/text
 * content, then collapses all whitespace to single spaces.
 */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, ' ') // HTML/Astro comments
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code → its text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images → drop
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // ATX headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // unordered list markers
    .replace(/^\s{0,3}\d+\.\s+/gm, '') // ordered list markers
    .replace(/[*_~]/g, '') // emphasis / strikethrough marks
    .replace(/<[^>]+>/g, ' ') // stray HTML tags
    .replace(/\s+/g, ' ') // collapse whitespace/newlines
    .trim();
}
