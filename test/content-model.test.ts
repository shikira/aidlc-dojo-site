import { describe, expect, it } from 'vitest';
import { loadCollections } from '../src/lib/content/parse';
import {
  CHARS_PER_MINUTE,
  createContentModel,
  readingTime,
} from '../src/lib/content/model';

const model = createContentModel(loadCollections());

describe('readingTime (BV-3 derivation — ceil(chars / 600))', () => {
  it('rounds up to the next whole minute', () => {
    expect(readingTime('a'.repeat(CHARS_PER_MINUTE))).toBe(1);
    expect(readingTime('a'.repeat(CHARS_PER_MINUTE + 1))).toBe(2);
    expect(readingTime('')).toBe(0);
  });
});

describe('getAllUnits / getUnit (fail-fast)', () => {
  it('returns every sample unit with a derived reading time', () => {
    const ids = model.getAllUnits().map((unit) => unit.id);
    expect(ids).toContain('what-is-aidlc');
    expect(ids).toContain('gates-and-human-oversight');
    for (const unit of model.getAllUnits()) {
      expect(unit.readingTimeMin).toBeGreaterThan(0);
    }
  });

  it('getUnit returns the requested unit', () => {
    expect(model.getUnit('what-is-aidlc').title).toBe('AI-DLCとは何か');
  });

  it('getUnit throws on a missing id (build fail-fast)', () => {
    expect(() => model.getUnit('nope')).toThrow(/no unit with id "nope"/);
  });
});

describe('paths and reverse index', () => {
  it('getAllPaths returns the white path', () => {
    expect(model.getAllPaths().map((path) => path.belt)).toEqual(['white']);
  });

  it('getUnitsForPath returns units in unitIds order', () => {
    expect(model.getUnitsForPath('white').map((unit) => unit.id)).toEqual([
      'what-is-aidlc',
      'why-aidlc-vs-traditional',
      'core-concepts',
      'phases-overview',
      'gates-and-human-oversight',
    ]);
  });

  it('getUnitsForPath throws for an unknown belt', () => {
    expect(() => model.getUnitsForPath('black')).toThrow(
      /no path for belt "black"/,
    );
  });

  it('getPathsContaining uses the CT-2 reverse index (O(1))', () => {
    expect(
      model.getPathsContaining('what-is-aidlc').map((p) => p.belt),
    ).toEqual(['white']);
    expect(model.getPathsContaining('orphan-xyz')).toEqual([]);
  });
});

describe('neighborsInPath (boundary nulls — C5)', () => {
  it('null prev at the head, unit next', () => {
    const neighbors = model.neighborsInPath('white', 'what-is-aidlc');
    expect(neighbors.prev).toBeNull();
    expect(neighbors.next?.id).toBe('why-aidlc-vs-traditional');
  });

  it('unit prev at the tail, null next', () => {
    const neighbors = model.neighborsInPath(
      'white',
      'gates-and-human-oversight',
    );
    expect(neighbors.prev?.id).toBe('phases-overview');
    expect(neighbors.next).toBeNull();
  });

  it('throws when the unit is not in the path', () => {
    expect(() => model.neighborsInPath('white', 'nope')).toThrow(
      /not in path "white"/,
    );
  });
});

describe('getQuestionsForUnit (sorted by afterSection)', () => {
  it('returns exactly this unit’s questions', () => {
    const questions = model.getQuestionsForUnit('what-is-aidlc');
    expect(questions).toHaveLength(4);
    expect(questions.every((q) => q.unitId === 'what-is-aidlc')).toBe(true);
  });

  it('returns an empty array for a unit with no questions', () => {
    expect(model.getQuestionsForUnit('nope')).toEqual([]);
  });
});

describe('articles', () => {
  it('getArticles returns the sample article', () => {
    expect(model.getArticles().map((a) => a.slug)).toContain('getting-started');
  });

  it('getArticle returns the requested article', () => {
    expect(model.getArticle('getting-started').version).toBe('common');
  });

  it('getArticle throws on a missing slug', () => {
    expect(() => model.getArticle('nope')).toThrow(
      /no article with slug "nope"/,
    );
  });
});
