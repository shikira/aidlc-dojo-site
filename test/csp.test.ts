import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildCsp, scriptSha256 } from '../src/lib/csp';
import { INLINE_SCRIPT } from '../src/theme-init';

describe('scriptSha256 (SEC-1)', () => {
  it('matches a base64 sha256 over the exact inline-script bytes', () => {
    const expected = createHash('sha256')
      .update(INLINE_SCRIPT, 'utf8')
      .digest('base64');
    expect(scriptSha256(INLINE_SCRIPT)).toBe(`'sha256-${expected}'`);
  });

  it('is deterministic for identical input', () => {
    expect(scriptSha256('x')).toBe(scriptSha256('x'));
  });
});

describe('buildCsp', () => {
  const hash = scriptSha256(INLINE_SCRIPT);
  const csp = buildCsp(hash);

  it("locks default-src to 'self'", () => {
    expect(csp).toContain("default-src 'self'");
  });

  it('allows the inline theme script only by hash (no unsafe-inline in script-src)', () => {
    const scriptSrc = csp
      .split('; ')
      .find((directive) => directive.startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain(hash);
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  it('forbids framing and object embedding', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
