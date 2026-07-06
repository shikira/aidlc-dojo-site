// csp.ts — Content-Security-Policy construction (SEC-1), computed at BUILD time.
//
// The site ships exactly one inline script (theme-init). Because its bytes are
// fixed at build time, we allow it with a sha256 source expression rather than
// a per-request nonce — a nonce would require per-request edge compute, which
// contradicts the $10/mo static-delivery plan. The hash is fully
// pre-computable and CDN-compatible. Real response headers are delivered at the
// edge in uw-06b (SEC-2); this module also backs the build-time <meta> policy.
import { createHash } from 'node:crypto';

/**
 * Compute the CSP `'sha256-...'` source token for an inline script's EXACT
 * bytes. The value must match the verbatim text injected via `set:html`, so
 * the browser's computed hash of the <script> text content matches this token.
 */
export function scriptSha256(script: string): string {
  const digest = createHash('sha256').update(script, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

/**
 * Build the Content-Security-Policy value. `script-src` allows only self plus
 * the single inline theme script (by hash). `style-src` permits inline styles
 * because Astro emits scoped `<style>` blocks; the delivered edge header
 * (uw-06b) can tighten this once style hashing is wired.
 */
export function buildCsp(inlineScriptHash: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHash}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ');
}
