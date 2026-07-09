// bv2.ts — BV-2 question quality (FR-2.1 / FR-2.2 / business-rules).
//
// Per unit: 3–8 questions, every h2 section covered by ≥1 question, and per
// question: explanation + sourceUrl present, answerIndex within the choices
// range, 2–5 choices, and sourceUrl a well-formed https URL. Q5: URL FORMAT
// only — no network/reachability check (no external dependency in the build).
import type { Question, RawCollections } from '../content/types';
import { slugify } from '../toc';
import { error, type Finding } from './types';

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 8;
const MIN_CHOICES = 2;
const MAX_CHOICES = 5;

/** Slugs of the h2 sections in a Markdown body (matches afterSection values). */
export function sectionSlugs(body: string): string[] {
  const slugs: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match && !line.startsWith('###')) {
      slugs.push(slugify(match[1] ?? ''));
    }
  }
  return slugs;
}

/** True iff `value` parses as an https URL. */
export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function checkQuestion(question: Question): Finding[] {
  const findings: Finding[] = [];
  const where = `question "${question.id}" (unit "${question.unitId}")`;

  if (
    question.choices.length < MIN_CHOICES ||
    question.choices.length > MAX_CHOICES
  ) {
    findings.push(
      error(
        'BV-2',
        `${where} has ${question.choices.length} choices; must be ${MIN_CHOICES}–${MAX_CHOICES}.`,
      ),
    );
  }
  if (
    question.answerIndex < 0 ||
    question.answerIndex >= question.choices.length
  ) {
    findings.push(
      error(
        'BV-2',
        `${where} answerIndex ${question.answerIndex} is out of range for ${question.choices.length} choices.`,
      ),
    );
  }
  if (!question.explanation || question.explanation.trim().length === 0) {
    findings.push(error('BV-2', `${where} is missing an explanation.`));
  }
  if (!isHttpsUrl(question.sourceUrl)) {
    findings.push(
      error(
        'BV-2',
        `${where} sourceUrl is missing or not a well-formed https URL (${JSON.stringify(question.sourceUrl)}).`,
      ),
    );
  }
  return findings;
}

export function bv2(collections: RawCollections): Finding[] {
  const findings: Finding[] = [];

  const byUnit = new Map<string, Question[]>();
  for (const question of collections.questions) {
    const list = byUnit.get(question.unitId) ?? [];
    list.push(question);
    byUnit.set(question.unitId, list);
    findings.push(...checkQuestion(question));
  }

  for (const unit of collections.units) {
    const questions = byUnit.get(unit.id) ?? [];
    if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
      findings.push(
        error(
          'BV-2',
          `unit "${unit.id}" has ${questions.length} questions; must be ${MIN_QUESTIONS}–${MAX_QUESTIONS}.`,
        ),
      );
    }
    const covered = new Set(questions.map((question) => question.afterSection));
    for (const slug of sectionSlugs(unit.body)) {
      if (!covered.has(slug)) {
        findings.push(
          error(
            'BV-2',
            `unit "${unit.id}" section "${slug}" has no question after it.`,
          ),
        );
      }
    }
  }

  return findings;
}
