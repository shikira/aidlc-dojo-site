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
        '/units/core-concepts/',
        '/units/gates-and-human-oversight/',
        '/units/phases-overview/',
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
