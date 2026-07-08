// bv3.ts — BV-3 reading time (FR-1.5 / business-rules).
//
// readingTimeMin = ceil(body chars / 600) — the SAME derivation used for
// display (US-R1-11), so the shown value and the gate can never diverge.
// > 20 minutes is a build ERROR (hard cap); < 15 minutes is a WARNING (soft
// target miss), which does not block the build.
import type { RawCollections } from '../content/types';
import { readingTime } from '../content/model';
import { error, warning, type Finding } from './types';

export const MAX_READING_MIN = 20;
export const TARGET_MIN_READING_MIN = 15;

export function bv3(collections: RawCollections): Finding[] {
  const findings: Finding[] = [];

  for (const unit of collections.units) {
    const minutes = readingTime(unit.body);
    if (minutes > MAX_READING_MIN) {
      findings.push(
        error(
          'BV-3',
          `unit "${unit.id}" reading time is ${minutes} min (> ${MAX_READING_MIN}). ` +
            `Split the unit or trim sections.`,
        ),
      );
    } else if (minutes < TARGET_MIN_READING_MIN) {
      findings.push(
        warning(
          'BV-3',
          `unit "${unit.id}" reading time is ${minutes} min (< ${TARGET_MIN_READING_MIN} target). ` +
            `Consider adding depth.`,
        ),
      );
    }
  }

  return findings;
}
