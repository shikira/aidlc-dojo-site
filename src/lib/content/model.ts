// model.ts — the content query layer (business-logic-model クエリ関数).
//
// `createContentModel` takes the four raw collections (from disk via parse.ts,
// or from `getCollection` in an Astro page) and returns a query API. All lookups
// are build-time fail-fast (Q1): a missing id throws, so a broken reference can
// never reach a rendered page — it fails the build instead. Pure and
// synchronous, so the whole API is unit-testable without the Astro runtime.
import type {
  Article,
  Belt,
  PathDef,
  Question,
  RawCollections,
  Unit,
} from './types';

/** A unit with its build-time-derived reading time (BV-3). */
export interface UnitWithReadingTime extends Unit {
  /** ceil(body char count / 600). Derived, never stored (domain-entities). */
  readingTimeMin: number;
}

/** prev/next neighbours within a path; `null` at the boundaries (C5). */
export interface Neighbors {
  prev: UnitWithReadingTime | null;
  next: UnitWithReadingTime | null;
}

/** Characters read per minute (business-logic-model: ceil(chars / 600)). */
export const CHARS_PER_MINUTE = 600;

/**
 * Derive reading time in minutes from a body string: `ceil(chars / 600)`.
 * Same computation used for display (US-R1-11) and the BV-3 20-minute gate, so
 * the shown value and the validated value can never diverge (domain-entities).
 */
export function readingTime(body: string): number {
  return Math.ceil(body.length / CHARS_PER_MINUTE);
}

/** The query API returned by `createContentModel`. */
export interface ContentModel {
  getAllUnits(): UnitWithReadingTime[];
  getUnit(id: string): UnitWithReadingTime;
  getAllPaths(): PathDef[];
  getUnitsForPath(belt: Belt): UnitWithReadingTime[];
  getPathsContaining(unitId: string): PathDef[];
  neighborsInPath(belt: Belt, unitId: string): Neighbors;
  getQuestionsForUnit(unitId: string): Question[];
  getArticles(): Article[];
  getArticle(slug: string): Article;
}

/** Attach the derived reading time to a unit. */
function withReadingTime(unit: Unit): UnitWithReadingTime {
  return { ...unit, readingTimeMin: readingTime(unit.body) };
}

/**
 * Build the query model from raw collections. Constructs the id index and the
 * `unitId → Path[]` reverse index once (business-logic-model step [4]) so
 * `getPathsContaining` is O(1).
 */
export function createContentModel(collections: RawCollections): ContentModel {
  const units = collections.units.map(withReadingTime);
  const unitById = new Map<string, UnitWithReadingTime>();
  for (const unit of units) {
    unitById.set(unit.id, unit);
  }

  const paths = collections.paths;
  const pathByBelt = new Map<Belt, PathDef>();
  const pathsByUnitId = new Map<string, PathDef[]>();
  for (const path of paths) {
    pathByBelt.set(path.belt, path);
    for (const unitId of path.unitIds) {
      const list = pathsByUnitId.get(unitId) ?? [];
      list.push(path);
      pathsByUnitId.set(unitId, list);
    }
  }

  function getUnit(id: string): UnitWithReadingTime {
    const unit = unitById.get(id);
    if (!unit) {
      throw new Error(
        `getUnit(): no unit with id "${id}". Build fail-fast — check the ` +
          `unit's frontmatter id or the reference that requested it.`,
      );
    }
    return unit;
  }

  function getPath(belt: Belt): PathDef {
    const path = pathByBelt.get(belt);
    if (!path) {
      throw new Error(
        `getUnitsForPath(): no path for belt "${belt}". Build fail-fast — ` +
          `add src/content/paths/${belt}.yaml or fix the belt reference.`,
      );
    }
    return path;
  }

  return {
    getAllUnits: () => [...units],

    getUnit,

    getAllPaths: () => [...paths],

    getUnitsForPath: (belt) => getPath(belt).unitIds.map(getUnit),

    getPathsContaining: (unitId) => [...(pathsByUnitId.get(unitId) ?? [])],

    neighborsInPath: (belt, unitId) => {
      const path = getPath(belt);
      const index = path.unitIds.indexOf(unitId);
      if (index === -1) {
        throw new Error(
          `neighborsInPath(): unit "${unitId}" is not in path "${belt}". ` +
            `Build fail-fast.`,
        );
      }
      const prevId = index > 0 ? path.unitIds[index - 1] : undefined;
      const nextId =
        index < path.unitIds.length - 1 ? path.unitIds[index + 1] : undefined;
      return {
        prev: prevId ? getUnit(prevId) : null,
        next: nextId ? getUnit(nextId) : null,
      };
    },

    getQuestionsForUnit: (unitId) =>
      collections.questions
        .filter((question) => question.unitId === unitId)
        .sort((a, b) =>
          a.afterSection.localeCompare(b.afterSection, undefined, {
            numeric: true,
          }),
        ),

    getArticles: () =>
      [...collections.articles].sort((a, b) => b.date.localeCompare(a.date)),

    getArticle: (slug) => {
      const article = collections.articles.find((a) => a.slug === slug);
      if (!article) {
        throw new Error(
          `getArticle(): no article with slug "${slug}". Build fail-fast.`,
        );
      }
      return article;
    },
  };
}
