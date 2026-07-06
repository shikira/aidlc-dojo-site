// Frozen integration contract (frontend-components.md).
//
// This file is the SINGLE source of the prop/type contract that downstream
// units (UW-03/04/05) depend on. It is type-only (fully erased at build), so
// the shapes here are frozen without shipping any runtime code. Behaviour
// specs live in interaction-spec; this file carries props + type shapes only.
//
// The canonical `Unit` / `Path` / `Question` / belt domain entities are OWNED
// by UW-02 (domain-entities.md). UW-01 only *references* their shape to build
// display-view props; it never calls query functions. The minimal references
// below freeze the fields UW-01's contract depends on and will be superseded
// by UW-02's canonical module (same names) without breaking callers.

/** Version discriminator for a unit (project decision: v2 current, v1 legacy). */
export type Version = 'v1' | 'v2' | 'common';

/** Opaque belt identifier. The canonical belt enum is owned by UW-02. */
export type Belt = string;

// --- C2 BeltCard — belt-selection card (TopPage / graduation). ---
export interface BeltCardProps {
  belt: Belt;
  nameJa: string;
  nameEn: string;
  audience: string;
  unitCount: number;
  totalReadingMin: number;
  href: string;
}

// --- C3 PathList — units within a path (nav aria-label="学習パス"). ---
export interface PathListItem {
  unitId: string;
  title: string;
  version: Version;
  readingTimeMin: number;
  /** Path-context URL. */
  href: string;
}
export interface PathListProps {
  belt: Belt;
  items: PathListItem[];
  currentUnitId?: string;
}

// --- C4 VersionTag — v1/v2/common tag (label text comes from CT-5 dictionary). ---
export interface VersionTagProps {
  version: Version;
}

// --- C5 UnitNav — discriminated union (path-context / canonical). ---
export interface NavLink {
  title: string;
  /** Path-context URL. */
  href: string;
}
export interface PathRef {
  belt: Belt;
  nameJa: string;
  href: string;
}

/**
 * Position of a unit within its path (C5 — the four render states).
 * Derived by `resolveNavState`:
 * - `first`  → path-head note + next link
 * - `middle` → prev + next links
 * - `last`   → prev link + graduation banner
 * - `only`   → single-unit path: head note AND graduation banner (縮退/両立)
 *
 * NOTE (deviation): the `position` discriminant is an ADDITIVE derived field on
 * the path variant, not present in the frontend-components sketch. It is the
 * tested output of `resolveNavState` and lets UnitNav pick a render branch
 * without re-deriving null-ness. Downstream may ignore it.
 */
export type NavPosition = 'first' | 'middle' | 'last' | 'only';

export interface PathNavState {
  mode: 'path';
  belt: Belt;
  beltNameJa: string;
  pathHref: string;
  prev: NavLink | null;
  next: NavLink | null;
  position: NavPosition;
}
export interface CanonicalNavState {
  mode: 'canonical';
  pathsContaining: PathRef[];
}
export type NavState = PathNavState | CanonicalNavState;
export interface UnitNavProps {
  state: NavState;
}

// --- C6 ThemeToggle (3-value) / C7 LangSwitch. State lives in DOM/localStorage. ---
export type ThemeToggleProps = Record<string, never>;
export type LangSwitchProps = Record<string, never>;

// --- C9 TocDisclosure — entries supplied by UW-02's section extractor (BV-2). ---
export interface TocEntry {
  text: string;
  anchorId: string;
}
export interface TocDisclosureProps {
  entries: TocEntry[];
}

// --- SharedLayout (UI-7). ---
export interface SharedLayoutProps {
  title: string;
  description: string;
  /** rel=canonical target (UW-04's dual-URL generation supplies this). */
  canonicalUrl?: string;
}
