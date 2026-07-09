// bv5.ts — BV-5 reference integrity (FR-1.1 / FR-1.2 / business-rules).
//
// ERROR: a path references a unitId that does not exist, or a question
// references a unitId that does not exist. WARNING: an orphan unit that belongs
// to no path (sometimes intentional, so advisory only).
import type { RawCollections } from '../content/types';
import { error, warning, type Finding } from './types';

export function bv5(collections: RawCollections): Finding[] {
  const findings: Finding[] = [];
  const unitIds = new Set(collections.units.map((unit) => unit.id));
  const referencedByPath = new Set<string>();

  for (const path of collections.paths) {
    for (const unitId of path.unitIds) {
      referencedByPath.add(unitId);
      if (!unitIds.has(unitId)) {
        findings.push(
          error(
            'BV-5',
            `path "${path.belt}" references unknown unit "${unitId}".`,
          ),
        );
      }
    }
  }

  for (const question of collections.questions) {
    if (!unitIds.has(question.unitId)) {
      findings.push(
        error(
          'BV-5',
          `question "${question.id}" references unknown unit "${question.unitId}".`,
        ),
      );
    }
  }

  for (const unit of collections.units) {
    if (!referencedByPath.has(unit.id)) {
      findings.push(
        warning('BV-5', `unit "${unit.id}" is an orphan (belongs to no path).`),
      );
    }
  }

  return findings;
}
