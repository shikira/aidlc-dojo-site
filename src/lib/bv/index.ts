// index.ts — BV aggregator + report + disk runner (business-rules BV-1..5).
//
// `runAllBv` is the pure aggregator (unit-tested with fixtures). `runBvFromDisk`
// wires the REAL collections (parse.ts), the REAL dictionary, and the REAL UI
// sources, then runs every gate — this is what `scripts/bv.mjs` calls. Any
// error fails the build/CI (ci-gate contract); warnings are advisory.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { RawCollections } from '../content/types';
import { loadCollections } from '../content/parse';
import { dictionary } from '../../i18n/dictionary';
import { bv1 } from './bv1';
import { bv2 } from './bv2';
import { bv3 } from './bv3';
import { bv4, type UiSource } from './bv4';
import { bv5 } from './bv5';
import { hasError, type Finding } from './types';

export { hasError };
export type { Finding };

/** Directories scanned for hardcoded UI strings (BV-4). */
export const UI_SOURCE_DIRS = ['src/components', 'src/layouts', 'src/pages'];
const UI_EXTENSIONS = ['.astro', '.ts', '.tsx', '.mts', '.js', '.mjs'];

/** Run all five gates over in-memory inputs. Pure — no I/O. */
export function runAllBv(
  collections: RawCollections,
  dict: Record<string, Record<string, unknown>>,
  uiSources: readonly UiSource[] = [],
): Finding[] {
  return [
    ...bv1(collections),
    ...bv2(collections),
    ...bv3(collections),
    ...bv4({ dictionary: dict, uiSources }),
    ...bv5(collections),
  ];
}

/** Recursively read UI source files from the given directories. */
export function loadUiSources(
  dirs: readonly string[] = UI_SOURCE_DIRS,
): UiSource[] {
  const sources: UiSource[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (UI_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        sources.push({ path, content: readFileSync(path, 'utf8') });
      }
    }
  };
  for (const dir of dirs) {
    walk(dir);
  }
  return sources;
}

/** Load everything from disk and run every gate. Used by `scripts/bv.mjs`. */
export function runBvFromDisk(): Finding[] {
  const collections = loadCollections();
  const uiSources = loadUiSources();
  return runAllBv(collections, dictionary, uiSources);
}

/** Format findings as a human-readable report grouped by gate. */
export function formatReport(findings: readonly Finding[]): string {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const lines: string[] = ['AI-DLC DOJO — Business Validation (BV-1..5)', ''];

  if (findings.length === 0) {
    lines.push('✓ All gates passed. No findings.');
  } else {
    for (const finding of findings) {
      const mark = finding.severity === 'error' ? '✗ ERROR' : '! warn ';
      lines.push(`${mark} [${finding.gate}] ${finding.message}`);
    }
  }

  lines.push(
    '',
    `Summary: ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  return lines.join('\n');
}
