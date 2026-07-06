// resolveNavState.ts — UnitNav path-context state resolution (C5).
//
// business-logic-model: `resolveNavState` is a pure function covering the four
// prev/next null combinations. Its derived `position` selects which render
// branch UnitNav shows: path-head note, graduation banner, both (single-unit
// path), or plain prev/next links.
import type {
  Belt,
  NavLink,
  NavPosition,
  PathNavState,
} from '../components/contracts';

/**
 * Classify a unit's position within its path from its neighbour links.
 * Pure — the four states are the C5 test matrix.
 */
export function navPosition(
  prev: NavLink | null,
  next: NavLink | null,
): NavPosition {
  if (prev && next) {
    return 'middle';
  }
  if (!prev && next) {
    return 'first';
  }
  if (prev && !next) {
    return 'last';
  }
  return 'only';
}

/** Inputs for the path-context UnitNav variant (neighbours from CT-2/UW-02). */
export interface PathNavInput {
  belt: Belt;
  beltNameJa: string;
  pathHref: string;
  prev: NavLink | null;
  next: NavLink | null;
}

/**
 * Build the path-context UnitNav state, deriving `position` from the neighbour
 * links. Pure function — unit-tested across all four states (先頭/中間/卒業/縮退).
 */
export function resolveNavState(input: PathNavInput): PathNavState {
  return {
    mode: 'path',
    belt: input.belt,
    beltNameJa: input.beltNameJa,
    pathHref: input.pathHref,
    prev: input.prev,
    next: input.next,
    position: navPosition(input.prev, input.next),
  };
}
