// interleave.ts — UnitPage body composition helpers
// (business-logic-model 純関数 L-3 / business-rules Z-1).
//
// The UnitPage renders a unit's Markdown body split into per-h2 sections and
// embeds each section's review questions (the UW-03 QuizBlock island)
// IMMEDIATELY after the matching section. These two pure functions own the
// section-splitting and the render ORDERING only; QuizLabels resolution (Z-2)
// and island mounting are the page's job. Pure + synchronous, so both are
// unit-tested to the src/**/*.ts coverage floor.
import type { Question } from '../content/types';

/**
 * One rendered h2 section of a unit body.
 * - `index`    — 0-based position among the sections (render order).
 * - `anchorId` — the section's h2 `id`, i.e. the SAME slug `Question.afterSection`
 *   and the TOC use (verified identical to `toc.ts` slugify at build time). A
 *   preamble before the first h2 carries an empty `anchorId` (no question can
 *   match it, since `afterSection` is always a non-empty slug — BV-2).
 * - `html`     — the section's rendered HTML (its `<h2>` up to the next h2).
 *
 * NOTE (deviation from the frontend-components sketch, which typed the input as
 * `{ index, html }`): the input section additionally carries `anchorId` so the
 * helper can match `Question.afterSection` — a slug — against the real content.
 * The OUTPUT `RenderItem` section variant stays exactly `{ kind, index, html }`.
 */
export interface RenderSection {
  index: number;
  anchorId: string;
  html: string;
}

/**
 * A single item in a unit body's render order (business-logic-model RenderItem).
 * A `section` carries its position + HTML; a `quiz` carries the source Question,
 * which the page maps to `QuizBlockProps` with build-time-resolved labels (Z-2).
 * Keeping the ordering helper label-free (it emits `Question`, not
 * `QuizBlockProps`) isolates i18n resolution in the page and keeps this function
 * a pure, easily-tested ordering concern.
 */
export type RenderItem =
  | { kind: 'section'; index: number; html: string }
  | { kind: 'quiz'; question: Question };

const H2_TAG = /<h2\b[^>]*>/gi;
const H2_ID = /<h2\b[^>]*\sid="([^"]*)"/i;

/**
 * Split rendered unit-body HTML into per-h2 sections. Each section spans from
 * one `<h2 …>` up to (but excluding) the next `<h2>` or the end of the body. Any
 * content before the first h2 becomes a leading preamble section with an empty
 * `anchorId`. The anchor id is parsed from each section's leading `<h2 id="…">`.
 * A body with no h2 yields a single preamble section; an empty body yields `[]`.
 */
export function splitSections(html: string): RenderSection[] {
  const heads: { start: number; anchorId: string }[] = [];
  let match: RegExpExecArray | null;
  H2_TAG.lastIndex = 0;
  while ((match = H2_TAG.exec(html)) !== null) {
    const idMatch = H2_ID.exec(match[0]);
    heads.push({ start: match.index, anchorId: idMatch?.[1] ?? '' });
  }

  const sections: RenderSection[] = [];

  const firstHead = heads[0];
  const preamble = html
    .slice(0, firstHead ? firstHead.start : html.length)
    .trim();
  if (preamble.length > 0) {
    sections.push({ index: sections.length, anchorId: '', html: preamble });
  }

  heads.forEach((head, i) => {
    const nextHead = heads[i + 1];
    const end = nextHead ? nextHead.start : html.length;
    sections.push({
      index: sections.length,
      anchorId: head.anchorId,
      html: html.slice(head.start, end).trim(),
    });
  });

  return sections;
}

/**
 * Build the UnitPage render order: every section in order, each immediately
 * followed by the questions whose `afterSection` equals that section's
 * `anchorId` (in the order given — `getQuestionsForUnit` pre-sorts them by
 * `afterSection`). Questions whose `afterSection` matches no section (out of
 * range; BV-2 normally prevents this) are appended after the final section, so
 * no question is ever dropped.
 */
export function interleaveQuestions(
  sections: readonly RenderSection[],
  questions: readonly Question[],
): RenderItem[] {
  const anchorIds = new Set(sections.map((section) => section.anchorId));
  const bySection = new Map<string, Question[]>();
  const unmatched: Question[] = [];

  for (const question of questions) {
    if (question.afterSection && anchorIds.has(question.afterSection)) {
      const list = bySection.get(question.afterSection) ?? [];
      list.push(question);
      bySection.set(question.afterSection, list);
    } else {
      unmatched.push(question);
    }
  }

  const items: RenderItem[] = [];
  for (const section of sections) {
    items.push({ kind: 'section', index: section.index, html: section.html });
    for (const question of bySection.get(section.anchorId) ?? []) {
      items.push({ kind: 'quiz', question });
    }
  }
  for (const question of unmatched) {
    items.push({ kind: 'quiz', question });
  }
  return items;
}
