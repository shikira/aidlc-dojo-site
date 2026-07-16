import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEASER_COUNT,
  latestArticles,
} from '../src/lib/pages/articles';
import type { Article } from '../src/lib/content/types';

function article(overrides: Partial<Article> = {}): Article {
  return {
    slug: 'sample',
    title: 'Sample',
    date: '2026-01-01',
    version: 'common',
    body: 'body',
    ...overrides,
  };
}

describe('latestArticles (business-rules — desc, empty, n>len, stable)', () => {
  it('returns the newest n by ISO date, descending', () => {
    const result = latestArticles(
      [
        article({ slug: 'a', date: '2026-01-01' }),
        article({ slug: 'b', date: '2026-03-01' }),
        article({ slug: 'c', date: '2026-02-01' }),
        article({ slug: 'd', date: '2026-04-01' }),
      ],
      3,
    );
    expect(result.map((entry) => entry.slug)).toEqual(['d', 'b', 'c']);
  });

  it('defaults to the newest three (DEFAULT_TEASER_COUNT)', () => {
    expect(DEFAULT_TEASER_COUNT).toBe(3);
    const result = latestArticles([
      article({ slug: 'a', date: '2026-01-01' }),
      article({ slug: 'b', date: '2026-02-01' }),
      article({ slug: 'c', date: '2026-03-01' }),
      article({ slug: 'd', date: '2026-04-01' }),
    ]);
    expect(result.map((entry) => entry.slug)).toEqual(['d', 'c', 'b']);
  });

  it('returns an empty array for an empty input (B-3 hidden section)', () => {
    expect(latestArticles([])).toEqual([]);
  });

  it('returns all articles when n exceeds the list length', () => {
    const result = latestArticles(
      [
        article({ slug: 'a', date: '2026-01-01' }),
        article({ slug: 'b', date: '2026-02-01' }),
      ],
      5,
    );
    expect(result.map((entry) => entry.slug)).toEqual(['b', 'a']);
  });

  it('returns an empty array for a non-positive n', () => {
    expect(latestArticles([article()], 0)).toEqual([]);
    expect(latestArticles([article()], -2)).toEqual([]);
  });

  it('is stable for equal dates (input order preserved)', () => {
    const result = latestArticles(
      [
        article({ slug: 'first', date: '2026-05-01' }),
        article({ slug: 'second', date: '2026-05-01' }),
        article({ slug: 'third', date: '2026-05-01' }),
      ],
      3,
    );
    expect(result.map((entry) => entry.slug)).toEqual([
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
    latestArticles(input, 1);
    expect(input.map((entry) => entry.slug)).toEqual(snapshot);
  });
});
