import { describe, expect, it } from 'vitest';
import { navPosition, resolveNavState } from '../src/lib/resolveNavState';
import type { NavLink } from '../src/components/contracts';

const prev: NavLink = { title: '前の単元', href: '/paths/white/prev/' };
const next: NavLink = { title: '次の単元', href: '/paths/white/next/' };
const base = {
  belt: 'white',
  beltNameJa: '白帯',
  pathHref: '/paths/white/',
};

describe('resolveNavState (C5 — 4 states)', () => {
  it('先頭: no prev, has next → position "first"', () => {
    const state = resolveNavState({ ...base, prev: null, next });
    expect(state.mode).toBe('path');
    expect(state.position).toBe('first');
  });

  it('中間: has prev and next → position "middle"', () => {
    const state = resolveNavState({ ...base, prev, next });
    expect(state.position).toBe('middle');
  });

  it('卒業: has prev, no next → position "last"', () => {
    const state = resolveNavState({ ...base, prev, next: null });
    expect(state.position).toBe('last');
  });

  it('縮退(両立): no prev, no next → position "only"', () => {
    const state = resolveNavState({ ...base, prev: null, next: null });
    expect(state.position).toBe('only');
  });
});

describe('navPosition', () => {
  it('classifies all four prev/next combinations', () => {
    expect(navPosition(null, next)).toBe('first');
    expect(navPosition(prev, next)).toBe('middle');
    expect(navPosition(prev, null)).toBe('last');
    expect(navPosition(null, null)).toBe('only');
  });
});
