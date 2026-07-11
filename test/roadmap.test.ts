import { describe, expect, it } from 'vitest';
import {
  ROADMAP_ITEMS,
  ROADMAP_STATUS_ORDER,
  roadmapAnchorIds,
  roadmapSections,
  type RoadmapStatus,
} from '../src/lib/roadmap';
import { t } from '../src/i18n/t';

describe('roadmapSections (business-rules R-1 — 3 区分)', () => {
  const sections = roadmapSections();

  it('returns the three status groups in fixed order', () => {
    expect(sections.map((section) => section.status)).toEqual([
      'shipped',
      'planned',
      'later',
    ]);
  });

  it('every section has at least one item (no empty section renders)', () => {
    for (const section of sections) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('every item carries a non-empty anchorId and matches its section status', () => {
    for (const section of sections) {
      for (const roadmapItem of section.items) {
        expect(roadmapItem.anchorId).toBeTruthy();
        expect(roadmapItem.status).toBe(section.status);
      }
    }
  });

  it('partitions the whole dataset with no dropped or duplicated items', () => {
    const grouped = sections.flatMap((section) => section.items);
    expect(grouped).toHaveLength(ROADMAP_ITEMS.length);
  });
});

describe('roadmapAnchorIds (business-rules R-4 — landing-anchor contract)', () => {
  const ids = roadmapAnchorIds();

  it('is unique (zero duplicates)', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers exactly the frozen reserved-seat set', () => {
    const frozen = [
      // R1 shipped
      'learning-paths',
      'quiz',
      'version-tags',
      'news',
      'analytics',
      // R2 planned
      'exam',
      'ranking',
      'badges',
      'registration',
      'terms',
      // R3 later
      'level-check',
      'review',
      'daily-quiz',
      'sync',
      // R4 later
      'i18n',
    ];
    expect([...ids].sort()).toEqual([...frozen].sort());
  });

  it('includes the R2 inbound deep-link seats UW-04 targets', () => {
    for (const seat of ['exam', 'ranking', 'badges', 'registration', 'terms']) {
      expect(ids).toContain(seat);
    }
  });
});

describe('roadmap dictionary keys resolve (S-1 / NFR-9 — no missing keys)', () => {
  it('every item title/description key exists in the dictionary', () => {
    for (const roadmapItem of ROADMAP_ITEMS) {
      expect(() => t(roadmapItem.titleKey)).not.toThrow();
      expect(() => t(roadmapItem.descKey)).not.toThrow();
    }
  });

  it('every status has a label, a symbol, and a section-heading key', () => {
    const statuses: RoadmapStatus[] = [...ROADMAP_STATUS_ORDER];
    for (const status of statuses) {
      expect(() => t(`roadmap.status.${status}`)).not.toThrow();
      expect(() => t(`roadmap.status.${status}.symbol`)).not.toThrow();
      expect(() => t(`roadmap.section.${status}`)).not.toThrow();
    }
  });
});
