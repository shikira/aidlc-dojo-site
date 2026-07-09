// routes.ts — URL dual-generation (business-logic-model URL二重生成 / US-R1-09).
//
// Every unit is reachable two ways: a path-context route `/paths/{belt}/{id}/`
// (breadcrumb + prev/next) and its canonical route `/units/{id}/`. Path-context
// pages point `<link rel="canonical">` at the canonical route to avoid SEO
// duplication. This module OWNS the enumeration + canonical logic; the pages
// themselves (getStaticPaths) are UW-04 — this provides the route list and the
// props shape those pages consume. Pure and unit-testable.
import type { Belt, PathDef } from './content/types';
import type {
  ContentModel,
  Neighbors,
  UnitWithReadingTime,
} from './content/model';

/** Canonical URL for a unit (single source of truth for rel=canonical). */
export function canonicalUrl(unitId: string): string {
  return `/units/${unitId}/`;
}

/** URL for a unit within a path context. */
export function pathUnitUrl(belt: Belt, unitId: string): string {
  return `/paths/${belt}/${unitId}/`;
}

/** Props for a path-context page (`/paths/{belt}/{unitId}/`). */
export interface PathRouteProps {
  unit: UnitWithReadingTime;
  path: PathDef;
  neighbors: Neighbors;
  /** rel=canonical target — always the unit's canonical route. */
  canonicalUrl: string;
}

/** Props for a canonical unit page (`/units/{unitId}/`) — no breadcrumb. */
export interface CanonicalRouteProps {
  unit: UnitWithReadingTime;
  /** Learning paths that contain this unit (may be empty for an orphan). */
  pathsContaining: PathDef[];
}

/** A route to be emitted by UW-04's getStaticPaths, tagged by kind. */
export type RoutePair =
  | {
      kind: 'path';
      url: string;
      params: { belt: Belt; unitId: string };
      props: PathRouteProps;
    }
  | {
      kind: 'canonical';
      url: string;
      params: { unitId: string };
      props: CanonicalRouteProps;
    };

/**
 * Enumerate every route the site emits: one path-context route per
 * (path, unitId) pair, plus one canonical route per unit. Order is stable:
 * all path-context routes (in path/unit order) followed by canonical routes.
 */
export function getRoutePairs(model: ContentModel): RoutePair[] {
  const routes: RoutePair[] = [];

  for (const path of model.getAllPaths()) {
    for (const unitId of path.unitIds) {
      routes.push({
        kind: 'path',
        url: pathUnitUrl(path.belt, unitId),
        params: { belt: path.belt, unitId },
        props: {
          unit: model.getUnit(unitId),
          path,
          neighbors: model.neighborsInPath(path.belt, unitId),
          canonicalUrl: canonicalUrl(unitId),
        },
      });
    }
  }

  for (const unit of model.getAllUnits()) {
    routes.push({
      kind: 'canonical',
      url: canonicalUrl(unit.id),
      params: { unitId: unit.id },
      props: {
        unit,
        pathsContaining: model.getPathsContaining(unit.id),
      },
    });
  }

  return routes;
}
