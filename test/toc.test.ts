import { describe, expect, it } from 'vitest';
import { extractToc, slugify } from '../src/lib/toc';

describe('slugify (shared with the heading renderer)', () => {
  it('lowercases and hyphenates whitespace', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('keeps unicode letters (Japanese headings)', () => {
    expect(slugify('概要 と 目的')).toBe('概要-と-目的');
  });

  it('drops punctuation but preserves internal hyphens', () => {
    expect(slugify('What is AI-DLC?')).toBe('what-is-ai-dlc');
  });
});

describe('extractToc (C9 — h2 only, build-time)', () => {
  it('extracts h2 headings only, in document order', () => {
    const toc = extractToc([
      { depth: 1, text: 'Title' },
      { depth: 2, text: 'Overview' },
      { depth: 3, text: 'Detail' },
      { depth: 2, text: 'Usage' },
    ]);
    expect(toc).toEqual([
      { text: 'Overview', anchorId: 'overview' },
      { text: 'Usage', anchorId: 'usage' },
    ]);
  });

  it('returns an empty array when there are no h2 headings', () => {
    expect(extractToc([{ depth: 1, text: 'Only Title' }])).toEqual([]);
    expect(extractToc([])).toEqual([]);
  });

  it('disambiguates duplicate anchors with a numeric suffix', () => {
    const toc = extractToc([
      { depth: 2, text: '概要' },
      { depth: 2, text: '概要' },
      { depth: 2, text: '概要' },
    ]);
    expect(toc.map((entry) => entry.anchorId)).toEqual([
      '概要',
      '概要-1',
      '概要-2',
    ]);
  });
});
