import { describe, expect, it } from 'vitest';
import { articleExcerpt, sortArticlesForList } from '../src/lib/articles';
import type { Article } from '../src/lib/content/types';

function article(overrides: Partial<Article> = {}): Article {
  return {
    slug: 'sample',
    title: 'Sample',
    date: '2026-01-01',
    version: 'common',
    body: 'body text',
    ...overrides,
  };
}

describe('sortArticlesForList (business-rules — date desc, empty, stable)', () => {
  it('sorts newest-first by ISO date', () => {
    const sorted = sortArticlesForList([
      article({ slug: 'a', date: '2026-01-01' }),
      article({ slug: 'b', date: '2026-03-01' }),
      article({ slug: 'c', date: '2026-02-01' }),
    ]);
    expect(sorted.map((entry) => entry.slug)).toEqual(['b', 'c', 'a']);
  });

  it('returns an empty array unchanged (empty-state branch — R-3)', () => {
    expect(sortArticlesForList([])).toEqual([]);
  });

  it('is stable for equal dates (input order preserved)', () => {
    const sorted = sortArticlesForList([
      article({ slug: 'first', date: '2026-05-01' }),
      article({ slug: 'second', date: '2026-05-01' }),
      article({ slug: 'third', date: '2026-05-01' }),
    ]);
    expect(sorted.map((entry) => entry.slug)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [
      article({ slug: 'a', date: '2026-01-01' }),
      article({ slug: 'b', date: '2026-02-01' }),
    ];
    const snapshot = input.map((entry) => entry.slug);
    sortArticlesForList(input);
    expect(input.map((entry) => entry.slug)).toEqual(snapshot);
  });
});

describe('articleExcerpt (business-rules — body-derived, ellipsis, strip)', () => {
  it('truncates a long body and appends an ellipsis', () => {
    const excerpt = articleExcerpt(article({ body: 'あ'.repeat(200) }), 120);
    expect(excerpt).toHaveLength(121); // 120 chars + the ellipsis
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('returns the full text (no ellipsis) when shorter than maxChars', () => {
    const excerpt = articleExcerpt(article({ body: 'short body' }), 120);
    expect(excerpt).toBe('short body');
    expect(excerpt.endsWith('…')).toBe(false);
  });

  it('uses the default maxChars (120) when none is given', () => {
    const excerpt = articleExcerpt(article({ body: 'x'.repeat(300) }));
    expect(excerpt).toHaveLength(121);
  });

  it('strips markdown/HTML markup and collapses whitespace', () => {
    const body = [
      '<!-- a hidden comment -->',
      '## 見出し',
      '',
      'これは **強調** と `inline` と [リンク](https://example.com) の段落。',
      '',
      '- 箇条書き1',
      '- 箇条書き2',
      '',
      '```',
      'const dropped = 1;',
      '```',
    ].join('\n');
    const excerpt = articleExcerpt(article({ body }), 200);

    // markup characters are gone
    expect(excerpt).not.toContain('#');
    expect(excerpt).not.toContain('*');
    expect(excerpt).not.toContain('`');
    expect(excerpt).not.toContain('[');
    expect(excerpt).not.toContain('<!--');
    expect(excerpt).not.toContain('\n');
    // fenced code block content is dropped entirely
    expect(excerpt).not.toContain('const dropped');
    // human-readable text (incl. link text) is preserved
    expect(excerpt).toContain('見出し');
    expect(excerpt).toContain('強調');
    expect(excerpt).toContain('リンク');
    expect(excerpt).toContain('箇条書き1');
  });
});
