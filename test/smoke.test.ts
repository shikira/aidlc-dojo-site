import { describe, expect, it } from 'vitest';
import {
  evaluateSmoke,
  resolveBaseUrl,
  shouldRollback,
  type SmokeResponse,
} from '../src/lib/delivery/smoke';

// Page-unique sentinels (never the site title — it also renders on the 404 page,
// so it cannot distinguish a soft 404). See src/lib/delivery/smoke.ts.
const HOME_SENTINEL = 'AI-DLC を学ぶ'; // top-page hero heading (top-page only)
const UNIT_SENTINEL = 'AI-DLC とは'; // sample unit title (unit page only)

function response(overrides: Partial<SmokeResponse> = {}): SmokeResponse {
  return {
    url: 'https://example.test/',
    status: 200,
    body: `<h1>${HOME_SENTINEL}</h1>`,
    sentinel: HOME_SENTINEL,
    ...overrides,
  };
}

describe('evaluateSmoke (D-2)', () => {
  it('passes when every URL is 200 and carries its own page-unique sentinel', () => {
    const result = evaluateSmoke([
      response({
        url: 'https://example.test/',
        body: `<main><h1>${HOME_SENTINEL}</h1></main>`,
        sentinel: HOME_SENTINEL,
      }),
      response({
        url: 'https://example.test/units/what-is-aidlc/',
        body: `<main><h1>${UNIT_SENTINEL}</h1></main>`,
        sentinel: UNIT_SENTINEL,
      }),
    ]);
    expect(result).toEqual({ ok: true, failed: [] });
  });

  it('fails and lists the URL when a probe is not 200', () => {
    const result = evaluateSmoke([
      response({ url: 'https://example.test/' }),
      response({
        url: 'https://example.test/units/what-is-aidlc/',
        status: 503,
        body: 'gateway error',
        sentinel: UNIT_SENTINEL,
      }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual([
      'https://example.test/units/what-is-aidlc/',
    ]);
  });

  it('treats a 200 that is missing its own sentinel as a soft 404 (fail)', () => {
    // Body is a real 200 but serves the 404 page (site title present, but the
    // page-unique unit sentinel is absent) — must be caught as a failure.
    const result = evaluateSmoke([
      response({
        url: 'https://example.test/units/removed-unit/',
        status: 200,
        body: '<h1>ページが見つかりません</h1><title>AI-DLC DOJO</title>',
        sentinel: UNIT_SENTINEL,
      }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual(['https://example.test/units/removed-unit/']);
  });

  it('lists every failing URL in input order', () => {
    const result = evaluateSmoke([
      response({ url: 'https://example.test/a', status: 500, sentinel: 'x' }),
      response({ url: 'https://example.test/b' }), // healthy
      response({
        url: 'https://example.test/c',
        status: 200,
        body: 'no marker here',
        sentinel: 'missing',
      }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual([
      'https://example.test/a',
      'https://example.test/c',
    ]);
  });

  it('is vacuously ok for an empty batch', () => {
    expect(evaluateSmoke([])).toEqual({ ok: true, failed: [] });
  });
});

describe('shouldRollback (D-3)', () => {
  it('rolls back when the smoke did not pass', () => {
    expect(shouldRollback({ ok: false })).toBe(true);
  });

  it('does not roll back when the smoke passed', () => {
    expect(shouldRollback({ ok: true })).toBe(false);
  });
});

describe('resolveBaseUrl (H-3 / Workflow 4)', () => {
  it('uses the canonical https host once the domain is cut over', () => {
    expect(
      resolveBaseUrl(
        true,
        'aidlc-dojo.dev',
        'https://d111abcdef8.cloudfront.net',
      ),
    ).toBe('https://aidlc-dojo.dev');
  });

  it('uses the default delivery URL until the domain is ready', () => {
    expect(
      resolveBaseUrl(
        false,
        'aidlc-dojo.dev',
        'https://d111abcdef8.cloudfront.net',
      ),
    ).toBe('https://d111abcdef8.cloudfront.net');
  });
});
