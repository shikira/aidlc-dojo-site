// bv4.ts — BV-4 dictionary format contract + hardcoded-UI scan (NFR-9 / Q3).
//
// Two deterministic checks:
//  1. The FROZEN dictionary format contract (business-rules Q3): per-locale flat
//     string maps, keys named `域.部品.用途` (dotted, ≥2 segments), and ja/en
//     key-shape parity — parity is only enforced once `en` is populated, because
//     `en` is an intentionally-empty reserved seat for R1 (dictionary.ts).
//  2. A CONSERVATIVE scan for hardcoded Japanese UI strings that bypass t().
//     Comments are stripped first (all legitimate Japanese in source lives in
//     comments), so only Japanese in live code/markup is flagged — no false
//     positives on the existing UW-01 files, which route every label through t().
import { error, type Finding } from './types';

/** A UI source file to scan for hardcoded strings. */
export interface UiSource {
  path: string;
  content: string;
}

const KEY_PATTERN = /^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/;
const JAPANESE = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/;

/** Validate the frozen dictionary format contract. */
export function bv4Dictionary(
  dictionary: Record<string, Record<string, unknown>>,
): Finding[] {
  const findings: Finding[] = [];
  const localeKeys: Record<string, string[]> = {};

  for (const [locale, table] of Object.entries(dictionary)) {
    if (table === null || typeof table !== 'object' || Array.isArray(table)) {
      findings.push(
        error(
          'BV-4',
          `dictionary locale "${locale}" is not a flat key-value object.`,
        ),
      );
      continue;
    }
    const keys = Object.keys(table);
    localeKeys[locale] = keys;
    for (const key of keys) {
      if (typeof table[key] !== 'string') {
        findings.push(
          error(
            'BV-4',
            `dictionary["${locale}"]["${key}"] is not a string (flat contract violated).`,
          ),
        );
      }
      if (!KEY_PATTERN.test(key)) {
        findings.push(
          error(
            'BV-4',
            `dictionary key "${key}" (locale "${locale}") violates the 域.部品.用途 naming convention.`,
          ),
        );
      }
    }
  }

  // ja/en key-shape parity — only when `en` is populated (reserved-seat rule).
  const ja = localeKeys.ja ?? [];
  const en = localeKeys.en ?? [];
  if (en.length > 0) {
    const jaSet = new Set(ja);
    const enSet = new Set(en);
    for (const key of ja) {
      if (!enSet.has(key)) {
        findings.push(
          error(
            'BV-4',
            `key "${key}" exists in ja but is missing from en (parity violation).`,
          ),
        );
      }
    }
    for (const key of en) {
      if (!jaSet.has(key)) {
        findings.push(
          error(
            'BV-4',
            `key "${key}" exists in en but is missing from ja (parity violation).`,
          ),
        );
      }
    }
  }

  return findings;
}

/** Remove comments so only live code/markup is scanned. */
export function stripComments(content: string): string {
  return content
    .replace(/<!--[\s\S]*?-->/g, '') // HTML/Astro comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '')) // line comments
    .join('\n');
}

/** Conservative scan for hardcoded Japanese UI strings that bypass t(). */
export function bv4HardcodedStrings(sources: readonly UiSource[]): Finding[] {
  const findings: Finding[] = [];
  for (const source of sources) {
    const lines = stripComments(source.content).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (JAPANESE.test(line)) {
        findings.push(
          error(
            'BV-4',
            `hardcoded Japanese UI string in ${source.path}:${index + 1} — route it through t() and the dictionary.`,
          ),
        );
      }
    });
  }
  return findings;
}

/** Run both BV-4 checks. `uiSources` is optional (empty skips the scan). */
export function bv4(input: {
  dictionary: Record<string, Record<string, unknown>>;
  uiSources?: readonly UiSource[];
}): Finding[] {
  const findings = bv4Dictionary(input.dictionary);
  if (input.uiSources && input.uiSources.length > 0) {
    findings.push(...bv4HardcodedStrings(input.uiSources));
  }
  return findings;
}
