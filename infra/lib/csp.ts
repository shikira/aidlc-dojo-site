// csp.ts (infra) — the CloudFront edge (response-header) CSP.
//
// Design (SEC-2): the FULL policy incl. `default-src 'self'` and
// `script-src 'self' 'sha256-<theme-init>'` is delivered by the per-page
// <meta> CSP that SharedLayout emits at BUILD time (uw-01, src/lib/csp.ts). That
// meta policy is regenerated on every content build, so it always matches the
// current theme-init inline script hash.
//
// The edge response header is deployed by CDK on a DIFFERENT cadence than
// content (infra deploy vs. S3 content sync), so it MUST NOT bake in a
// build-time script hash — doing so would drift out of sync with the meta CSP
// and could block the inline script. The edge header therefore carries only
// hash-INDEPENDENT hardening, most importantly `frame-ancestors 'none'`
// (clickjacking protection), which a <meta> CSP cannot enforce (header-only).
// This keeps infra fully decoupled from the app's src/ (no cross-project
// import) while preserving defense-in-depth.
export const EDGE_CSP: string = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ');
