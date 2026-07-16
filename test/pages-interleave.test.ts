import { describe, expect, it } from 'vitest';
import {
  interleaveQuestions,
  splitSections,
  type RenderItem,
  type RenderSection,
} from '../src/lib/pages/interleave';
import type { Question } from '../src/lib/content/types';

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q',
    unitId: 'u',
    afterSection: 'intro',
    prompt: '?',
    choices: ['a', 'b'],
    answerIndex: 0,
    explanation: 'because',
    sourceUrl: 'https://example.com/',
    ...overrides,
  };
}

function section(overrides: Partial<RenderSection> = {}): RenderSection {
  return {
    index: 0,
    anchorId: 'intro',
    html: '<h2 id="intro">Intro</h2>',
    ...overrides,
  };
}

/** Pull the question ids in render order (sections render as their index). */
function order(items: RenderItem[]): string[] {
  return items.map((item) =>
    item.kind === 'section' ? `#${item.index}` : item.question.id,
  );
}

describe('splitSections (per-h2 split of rendered body HTML)', () => {
  it('splits a body into one section per h2, parsing the anchor id', () => {
    const html =
      '<h2 id="one">One</h2>\n<p>a</p>\n<h2 id="two">Two</h2>\n<p>b</p>';
    const sections = splitSections(html);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ index: 0, anchorId: 'one' });
    expect(sections[0]?.html).toContain('<p>a</p>');
    expect(sections[0]?.html).not.toContain('Two');
    expect(sections[1]).toMatchObject({ index: 1, anchorId: 'two' });
    expect(sections[1]?.html).toContain('<p>b</p>');
  });

  it('keeps unicode/hyphenated anchor ids (Japanese headings)', () => {
    const html = '<h2 id="ai-dlcの定義と起源">定義</h2>\n<p>x</p>';
    expect(splitSections(html)[0]?.anchorId).toBe('ai-dlcの定義と起源');
  });

  it('captures a preamble before the first h2 as an empty-anchor section', () => {
    const html = '<p>lead</p>\n<h2 id="one">One</h2>\n<p>a</p>';
    const sections = splitSections(html);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ index: 0, anchorId: '' });
    expect(sections[0]?.html).toBe('<p>lead</p>');
    expect(sections[1]).toMatchObject({ index: 1, anchorId: 'one' });
  });

  it('returns a single preamble section for a body with no h2', () => {
    const sections = splitSections('<p>just prose</p>');
    expect(sections).toEqual([
      { index: 0, anchorId: '', html: '<p>just prose</p>' },
    ]);
  });

  it('returns an empty array for an empty/blank body', () => {
    expect(splitSections('')).toEqual([]);
    expect(splitSections('   \n  ')).toEqual([]);
  });

  it('falls back to an empty anchorId for an h2 without an id attribute', () => {
    const sections = splitSections('<h2>No Id</h2>\n<p>a</p>');
    expect(sections).toEqual([
      { index: 0, anchorId: '', html: '<h2>No Id</h2>\n<p>a</p>' },
    ]);
  });
});

describe('interleaveQuestions (business-rules Z-1)', () => {
  const s0 = section({ index: 0, anchorId: 'intro' });
  const s1 = section({
    index: 1,
    anchorId: 'body',
    html: '<h2 id="body">Body</h2>',
  });
  const s2 = section({
    index: 2,
    anchorId: 'wrap',
    html: '<h2 id="wrap">Wrap</h2>',
  });

  it('places each question immediately after its matching section', () => {
    const items = interleaveQuestions(
      [s0, s1],
      [
        question({ id: 'q-intro', afterSection: 'intro' }),
        question({ id: 'q-body', afterSection: 'body' }),
      ],
    );
    expect(order(items)).toEqual(['#0', 'q-intro', '#1', 'q-body']);
  });

  it('renders a section with no matching question as just the section', () => {
    const items = interleaveQuestions(
      [s0, s1, s2],
      [question({ id: 'q-body', afterSection: 'body' })],
    );
    expect(order(items)).toEqual(['#0', '#1', 'q-body', '#2']);
  });

  it('keeps multiple questions per section in the given order', () => {
    const items = interleaveQuestions(
      [s0, s1],
      [
        question({ id: 'q-body-1', afterSection: 'body' }),
        question({ id: 'q-intro-1', afterSection: 'intro' }),
        question({ id: 'q-body-2', afterSection: 'body' }),
      ],
    );
    expect(order(items)).toEqual([
      '#0',
      'q-intro-1',
      '#1',
      'q-body-1',
      'q-body-2',
    ]);
  });

  it('appends out-of-range questions (unknown afterSection) after the last section', () => {
    const items = interleaveQuestions(
      [s0, s1],
      [
        question({ id: 'q-known', afterSection: 'intro' }),
        question({ id: 'q-orphan', afterSection: 'does-not-exist' }),
      ],
    );
    expect(order(items)).toEqual(['#0', 'q-known', '#1', 'q-orphan']);
  });

  it('returns just the sections when there are no questions', () => {
    const items = interleaveQuestions([s0, s1], []);
    expect(order(items)).toEqual(['#0', '#1']);
  });

  it('carries the full Question on quiz items (for build-time label mapping)', () => {
    const q = question({ id: 'q-body', afterSection: 'body' });
    const items = interleaveQuestions([s1], [q]);
    const quizItem = items.find((item) => item.kind === 'quiz');
    expect(quizItem).toEqual({ kind: 'quiz', question: q });
  });
});
