// csp.ts (infra) — single-source the CloudFront edge CSP from the APP's own CSP
// builder. SharedLayout ships `buildCsp(scriptSha256(INLINE_SCRIPT))` as the
// build-time <meta> policy; the edge response-headers policy MUST deliver the
// exact same value so the two can never drift (functional-design SEC-2, task:
// "response-headers policy with the CSP from src/lib/csp.ts"). We import the
// pure app modules directly (both are dependency-free TS — csp.ts uses only
// node:crypto, theme-init.ts is standalone) rather than duplicating the policy.
import { buildCsp, scriptSha256 } from '../../src/lib/csp';
import { INLINE_SCRIPT } from '../../src/theme-init';

/** The exact Content-Security-Policy string the edge must deliver. */
export const EDGE_CSP: string = buildCsp(scriptSha256(INLINE_SCRIPT));
