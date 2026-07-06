// t.ts — CT-5 string lookup, resolved at BUILD time (NFR-9).
//
// A missing key throws (build-time fail-fast, reliability REL-4): the site can
// never render a blank or `undefined` label at runtime, and hardcoded UI
// strings are structurally discouraged because every label must exist in the
// dictionary (S2; BV-4 checks the frozen contract). There is NO silent locale
// fallback — an unknown key or an empty target locale fails loudly.
import { DEFAULT_LOCALE, dictionary, type Locale } from './dictionary';

/** Thrown when a translation key is absent — surfaced as a build error. */
export class MissingTranslationError extends Error {
  constructor(key: string, locale: Locale) {
    super(
      `t(): missing translation for key "${key}" in locale "${locale}". ` +
        `Add it to src/i18n/dictionary.ts (keys follow 域.部品.用途).`,
    );
    this.name = 'MissingTranslationError';
  }
}

/**
 * Resolve a dictionary key to its localized string. Defaults to `ja`.
 * Throws `MissingTranslationError` if the key is undefined for the locale.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const table = dictionary[locale];
  const value = table[key];
  if (value === undefined) {
    throw new MissingTranslationError(key, locale);
  }
  return value;
}
