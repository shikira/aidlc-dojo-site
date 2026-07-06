import { describe, expect, it } from 'vitest';
import {
  INLINE_SCRIPT,
  THEME_STORAGE_KEY,
  nextTheme,
  resolveTheme,
} from '../src/theme-init';

describe('resolveTheme (REL-3, 1-arg pure fn)', () => {
  it('returns null for null (system = attribute absent)', () => {
    expect(resolveTheme(null)).toBeNull();
  });

  it('returns "light" for the stored value "light"', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('returns "dark" for the stored value "dark"', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('falls back to null (system) for any invalid value', () => {
    expect(resolveTheme('banana')).toBeNull();
    expect(resolveTheme('')).toBeNull();
    expect(resolveTheme('System')).toBeNull();
  });
});

describe('nextTheme (3-value cycle)', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('INLINE_SCRIPT (the single client-JS inventory item, S1)', () => {
  it('reads the aidlc-theme storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('aidlc-theme');
    expect(INLINE_SCRIPT).toContain('aidlc-theme');
  });

  it('registers a document-level delegate on the toggle hook', () => {
    expect(INLINE_SCRIPT).toContain('[data-theme-toggle]');
    expect(INLINE_SCRIPT).toContain("addEventListener('click'");
  });

  it('adds no media-query listener (system is CSS-driven, not JS)', () => {
    expect(INLINE_SCRIPT).not.toContain('matchMedia');
    expect(INLINE_SCRIPT).not.toContain('prefers-color-scheme');
  });
});
