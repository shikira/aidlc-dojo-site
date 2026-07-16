import { describe, expect, it } from 'vitest';
import { pathTotalReadingMin } from '../src/lib/pages/reading';

describe('pathTotalReadingMin (business-rules — sum, empty, single)', () => {
  it('sums the reading time across a path', () => {
    expect(
      pathTotalReadingMin([
        { readingTimeMin: 3 },
        { readingTimeMin: 5 },
        { readingTimeMin: 2 },
      ]),
    ).toBe(10);
  });

  it('totals 0 for an empty path', () => {
    expect(pathTotalReadingMin([])).toBe(0);
  });

  it('returns the single unit’s time for a one-unit path', () => {
    expect(pathTotalReadingMin([{ readingTimeMin: 7 }])).toBe(7);
  });

  it('does not mutate its input', () => {
    const units = [{ readingTimeMin: 1 }, { readingTimeMin: 2 }];
    pathTotalReadingMin(units);
    expect(units).toEqual([{ readingTimeMin: 1 }, { readingTimeMin: 2 }]);
  });
});
