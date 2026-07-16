import { describe, expect, it } from 'vitest';
import { loadCollections } from '../src/lib/content/parse';
import { createContentModel } from '../src/lib/content/model';
import { canonicalUrl, getRoutePairs, pathUnitUrl } from '../src/lib/routes';

const model = createContentModel(loadCollections());
const routes = getRoutePairs(model);

describe('URL helpers', () => {
  it('canonicalUrl points at /units/{id}/', () => {
    expect(canonicalUrl('what-is-aidlc')).toBe('/units/what-is-aidlc/');
  });

  it('pathUnitUrl points at /paths/{belt}/{id}/', () => {
    expect(pathUnitUrl('white', 'what-is-aidlc')).toBe(
      '/paths/white/what-is-aidlc/',
    );
  });
});

describe('getRoutePairs (URL dual-generation — US-R1-09)', () => {
  it('emits a path-context route per (path, unit) pair', () => {
    const pathRoutes = routes.filter((route) => route.kind === 'path');
    expect(pathRoutes.map((route) => route.url)).toEqual([
      '/paths/black/operations-and-improvement/',
      '/paths/black/rule-customization/',
      '/paths/black/v1-to-v2-evolution/',
      '/paths/black/team-adoption-and-scaling/',
      '/paths/black/antipatterns-and-pitfalls/',
      '/paths/brown/gates-and-human-oversight/',
      '/paths/brown/setup-and-first-intent/',
      '/paths/brown/inception-in-practice/',
      '/paths/brown/construction-in-practice/',
      '/paths/brown/steering-rules-structure/',
      '/paths/brown/harness-integration/',
      '/paths/white/what-is-aidlc/',
      '/paths/white/why-aidlc-vs-traditional/',
      '/paths/white/core-concepts/',
      '/paths/white/phases-overview/',
      '/paths/white/gates-and-human-oversight/',
    ]);
  });

  it('emits a canonical route per unit', () => {
    const canonicalRoutes = routes.filter(
      (route) => route.kind === 'canonical',
    );
    expect(canonicalRoutes.map((route) => route.url).sort()).toEqual(
      [
        '/units/antipatterns-and-pitfalls/',
        '/units/construction-in-practice/',
        '/units/core-concepts/',
        '/units/gates-and-human-oversight/',
        '/units/harness-integration/',
        '/units/inception-in-practice/',
        '/units/operations-and-improvement/',
        '/units/phases-overview/',
        '/units/rule-customization/',
        '/units/setup-and-first-intent/',
        '/units/steering-rules-structure/',
        '/units/team-adoption-and-scaling/',
        '/units/v1-to-v2-evolution/',
        '/units/what-is-aidlc/',
        '/units/why-aidlc-vs-traditional/',
      ].sort(),
    );
  });

  it('path-context routes carry a canonical link to the unit page', () => {
    const first = routes.find(
      (route) =>
        route.kind === 'path' && route.params.unitId === 'what-is-aidlc',
    );
    expect(first?.kind).toBe('path');
    if (first?.kind === 'path') {
      expect(first.props.canonicalUrl).toBe('/units/what-is-aidlc/');
      expect(first.props.neighbors.prev).toBeNull();
      expect(first.props.neighbors.next?.id).toBe('why-aidlc-vs-traditional');
    }
  });

  it('canonical routes carry the containing paths', () => {
    const canonical = routes.find(
      (route) =>
        route.kind === 'canonical' && route.params.unitId === 'what-is-aidlc',
    );
    if (canonical?.kind === 'canonical') {
      expect(canonical.props.pathsContaining.map((p) => p.belt)).toEqual([
        'white',
      ]);
    }
  });
});

describe('route inventory snapshot (UW-04 dual-generated pages)', () => {
  // With UW-04 the path-context (/paths/{belt}/{unit}/) and canonical
  // (/units/{unit}/) pages are all generated; lock the counts so an accidental
  // content/route change surfaces here. 16 (path,unit) pairs — white 5 + brown 6
  // + black 5, gates-and-human-oversight shared across white & brown — and 15
  // unique units.
  it('emits 16 path-context routes and 15 canonical routes', () => {
    expect(routes.filter((route) => route.kind === 'path')).toHaveLength(16);
    expect(routes.filter((route) => route.kind === 'canonical')).toHaveLength(
      15,
    );
  });

  it('has one canonical route per unique unit (no duplicate unit pages)', () => {
    const canonicalIds = routes
      .filter((route) => route.kind === 'canonical')
      .map((route) => route.params.unitId);
    expect(new Set(canonicalIds).size).toBe(canonicalIds.length);
  });

  it('every path-context route has a matching canonical route (dual generation)', () => {
    const canonicalIds = new Set(
      routes
        .filter((route) => route.kind === 'canonical')
        .map((route) => route.params.unitId),
    );
    for (const route of routes.filter((r) => r.kind === 'path')) {
      expect(canonicalIds.has(route.params.unitId)).toBe(true);
    }
  });
});
