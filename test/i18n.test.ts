import { describe, expect, it } from 'vitest';
import { MissingTranslationError, t } from '../src/i18n/t';

describe('t() build-time string lookup (NFR-9 fail-fast)', () => {
  it('resolves an existing key', () => {
    expect(t('site.name')).toBe('AI-DLC DOJO');
  });

  it('defaults to the ja locale when none is given', () => {
    expect(t('site.name')).toBe(t('site.name', 'ja'));
  });

  it('throws on an undefined key (build error)', () => {
    expect(() => t('does.not.exist')).toThrow(MissingTranslationError);
  });

  it('throws for a locale that lacks the key — no silent fallback', () => {
    // `en` is reserved/empty for R1 (the EN switch is aria-disabled), so any
    // en lookup fails fast, which is the intended contract.
    expect(() => t('site.name', 'en')).toThrow(MissingTranslationError);
  });
});
