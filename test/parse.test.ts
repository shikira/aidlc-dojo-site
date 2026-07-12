import { describe, expect, it } from 'vitest';
import { loadCollections, parseFrontmatter } from '../src/lib/content/parse';

describe('parseFrontmatter', () => {
  it('splits YAML frontmatter from the body', () => {
    const { data, body } = parseFrontmatter(
      '---\nid: x\ntitle: T\n---\n## Section\n\ntext',
    );
    expect(data).toEqual({ id: 'x', title: 'T' });
    expect(body.trim()).toBe('## Section\n\ntext');
  });

  it('returns the whole file as body when there is no frontmatter', () => {
    const { data, body } = parseFrontmatter('no frontmatter here');
    expect(data).toEqual({});
    expect(body).toBe('no frontmatter here');
  });
});

describe('loadCollections (sample content)', () => {
  const collections = loadCollections();

  it('loads all four collections from disk', () => {
    expect(collections.units.length).toBeGreaterThanOrEqual(2);
    expect(collections.paths).toHaveLength(2);
    expect(collections.questions).toHaveLength(40);
    expect(collections.articles.length).toBeGreaterThanOrEqual(1);
  });

  it('parses unit frontmatter and body', () => {
    const unit = collections.units.find((u) => u.id === 'what-is-aidlc');
    expect(unit?.version).toBe('common');
    expect(unit?.body).toContain('## AI-DLCの定義と起源');
  });

  it('flattens the per-belt questions array into individual questions', () => {
    expect(collections.questions.every((q) => typeof q.id === 'string')).toBe(
      true,
    );
    expect(
      collections.questions.filter((q) => q.unitId === 'what-is-aidlc'),
    ).toHaveLength(4);
  });
});
