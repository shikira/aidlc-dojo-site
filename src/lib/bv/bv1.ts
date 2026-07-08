// bv1.ts — BV-1 version tag (NFR-8 / business-rules).
//
// ERROR when a unit or article is missing its version tag, or carries a value
// outside the frozen three-value set {v1, v2, common}. (Questions carry no
// version tag — they inherit their unit's; only units/articles are checked.)
import { VERSIONS, type RawCollections, type Version } from '../content/types';
import { error, type Finding } from './types';

function isValidVersion(value: unknown): value is Version {
  return (
    typeof value === 'string' && (VERSIONS as readonly string[]).includes(value)
  );
}

export function bv1(collections: RawCollections): Finding[] {
  const findings: Finding[] = [];
  const allowed = VERSIONS.join(', ');

  for (const unit of collections.units) {
    if (!isValidVersion(unit.version)) {
      findings.push(
        error(
          'BV-1',
          `unit "${unit.id}" has an invalid version tag ` +
            `(${JSON.stringify(unit.version)}). Must be one of {${allowed}}.`,
        ),
      );
    }
  }

  for (const article of collections.articles) {
    if (!isValidVersion(article.version)) {
      findings.push(
        error(
          'BV-1',
          `article "${article.slug}" has an invalid version tag ` +
            `(${JSON.stringify(article.version)}). Must be one of {${allowed}}.`,
        ),
      );
    }
  }

  return findings;
}
