// smoke.ts — post-deploy smoke + rollback pure logic (uw-06b business-logic-model
// Workflows 2-4, rules D-2/D-3/H-3). These are the ONLY logic surfaces of this
// delivery Unit that live inside the coverage boundary (src/**/*.ts): the IaC,
// the CD YAML, and the smoke RUNNER (scripts/smoke.mjs) are held outside the
// denominator and proven by the real deploy + smoke round-trip (DoD). Everything
// here is pure and synchronous so it is fully unit-testable without a network or
// the Astro runtime.

/**
 * One probed URL's observed response, paired with the page-unique sentinel the
 * runner expects to find in its body.
 *
 * `sentinel` is a marker that is UNIQUE to this page (e.g. the top-page hero
 * heading, or a unit page's title) — deliberately NOT the site title, which
 * SharedLayout renders on every page INCLUDING the 404 page. Using a page-unique
 * sentinel is what lets `evaluateSmoke` detect a "soft 404" (a 200 response that
 * actually served the 404 body).
 */
export interface SmokeResponse {
  /** The absolute URL that was probed (echoed into `failed` on failure). */
  url: string;
  /** Observed HTTP status code. */
  status: number;
  /** Observed response body text. */
  body: string;
  /** Page-unique marker expected in `body` for this URL to count as healthy. */
  sentinel: string;
}

/** Aggregate smoke verdict: `ok` overall, plus the list of URLs that failed. */
export interface SmokeResult {
  ok: boolean;
  /** URLs that were not 200-with-their-own-sentinel, in input order. */
  failed: string[];
}

/**
 * Evaluate a batch of probed responses (D-2). A URL is healthy when it returns
 * `200` AND its body contains its OWN page-unique sentinel. A `200` whose body
 * is missing that sentinel is a soft 404 and counts as a failure. The result is
 * `ok` only when every probed URL is healthy; `failed` lists the offenders in
 * input order.
 */
export function evaluateSmoke(responses: SmokeResponse[]): SmokeResult {
  const failed = responses
    .filter((response) => !isHealthy(response))
    .map((response) => response.url);
  return { ok: failed.length === 0, failed };
}

/** A response is healthy iff it is 200 AND carries its own page-unique sentinel. */
function isHealthy(response: SmokeResponse): boolean {
  return response.status === 200 && response.body.includes(response.sentinel);
}

/**
 * Rollback decision (D-3): roll back to the last-known-good build exactly when
 * the post-deploy smoke did not pass. The cold-start branch (no last-known-good
 * to roll back to) is handled by the CD job, not here.
 */
export function shouldRollback(smoke: { ok: boolean }): boolean {
  return !smoke.ok;
}

/**
 * Resolve the base URL to smoke against (H-3 / Workflow 4). Once the custom
 * domain is cut over, probe the canonical `https://{domain}` host; until then,
 * probe the default delivery URL (the CloudFront distribution domain). The
 * domain is an owner-provided runtime dependency, so the site launches on the
 * default URL and the domain is added later without a code change.
 */
export function resolveBaseUrl(
  domainReady: boolean,
  domain: string,
  defaultUrl: string,
): string {
  return domainReady ? `https://${domain}` : defaultUrl;
}
