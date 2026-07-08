// types.ts — shared types for the BV-1..5 build-time quality gates.
//
// Every validator returns a flat list of `Finding`s. An `error` fails the build
// (=CI fail =merge block, ci-gate contract); a `warning` is advisory and does
// not block. The `bv` command aggregates all findings and exits non-zero iff
// any error is present (business-rules: "エラー1件でもあればビルド失敗").

export type Severity = 'error' | 'warning';

export interface Finding {
  /** Which gate produced this (e.g. "BV-1"). */
  gate: string;
  severity: Severity;
  /** Human-readable, actionable message (what/why/where). */
  message: string;
}

/** True if any finding is an error. */
export function hasError(findings: readonly Finding[]): boolean {
  return findings.some((finding) => finding.severity === 'error');
}

/** Convenience constructors keep call sites terse and consistent. */
export function error(gate: string, message: string): Finding {
  return { gate, severity: 'error', message };
}

export function warning(gate: string, message: string): Finding {
  return { gate, severity: 'warning', message };
}
