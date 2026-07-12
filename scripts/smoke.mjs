// smoke.mjs — the post-deploy smoke RUNNER used by the CD workflow (deploy.yml).
//
// It derives its probe targets + page-unique sentinels from the BUILD MANIFEST
// (the freshly built `dist/` tree) rather than hardcoding slugs, so a unit being
// added/removed can never turn the smoke red spuriously (business-logic-model
// Workflow 2). Crucially, a sentinel is chosen ONLY if it is absent from the
// entire 404 page body — this rules out the site title / header logo (which
// SharedLayout renders on every page, including 404) and is what lets the smoke
// detect a "soft 404" (a 200 that actually served the 404 body). It then fetches
// each target and delegates the verdict to the SAME pure functions the unit
// tests cover (src/lib/delivery/smoke.ts), loaded through Vite's SSR module
// runner so there is exactly ONE implementation and NO duplicate JS (identical
// pattern to scripts/bv.mjs). This runner is delivery glue: it lives outside the
// src/**/*.ts coverage boundary and is proven by the real deploy round-trip.
//
// Environment inputs (set by deploy.yml):
//   SMOKE_BASE_URL      — explicit base URL override (wins if set)
//   SMOKE_DOMAIN        — canonical custom domain (e.g. aidlc-dojo.dev)
//   SMOKE_DOMAIN_READY  — "true" once the domain is cut over
//   SMOKE_DEFAULT_URL   — default delivery URL (CloudFront distribution domain)
//   SMOKE_DIST_DIR      — build output dir (default: dist)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const DIST = process.env.SMOKE_DIST_DIR ?? 'dist';
/** Sentinels shorter than this are too likely to appear incidentally. */
const MIN_SENTINEL_LENGTH = 8;

/** Inner content of the <main> landmark (falls back to the whole document). */
function mainRegion(html) {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match ? match[1] : html;
}

/** Inner text of every occurrence of `<tag>…</tag>` (in document order). */
function tagContents(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    out.push(match[1]);
  }
  return out;
}

/**
 * Candidate page-unique sentinels for a page, in priority order: the <main>
 * heading, then <main> paragraphs, then the <title>. Only PURE-TEXT contents
 * (no nested markup) are kept so each candidate is a literal substring of the
 * served body; trivially short strings are dropped.
 */
function sentinelCandidates(html) {
  const main = mainRegion(html);
  const raw = [
    ...tagContents(main, 'h1'),
    ...tagContents(main, 'p'),
    ...tagContents(html, 'title'),
  ];
  return raw
    .filter((text) => !text.includes('<'))
    .map((text) => text.trim())
    .filter((text) => text.length >= MIN_SENTINEL_LENGTH);
}

/**
 * Pick the first candidate that does NOT appear anywhere in the 404 page body.
 * Refusing to pick one (all candidates also live on the 404 page) is a hard
 * error: a smoke that cannot distinguish a soft 404 is worse than no smoke.
 */
function pickSentinel(pageHtml, notFoundHtml, label) {
  for (const candidate of sentinelCandidates(pageHtml)) {
    if (!notFoundHtml.includes(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `smoke: no page-unique sentinel for ${label} — every candidate also appears on ` +
      'the 404 page (site title / shared chrome). Refusing to run a smoke that cannot ' +
      'detect a soft 404.',
  );
}

/** Read a built page's HTML, or null when the file is absent. */
function readPage(relFile) {
  const file = join(DIST, relFile);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/** Resolve the first canonical unit page: dist/units/<id>/index.html (sorted). */
function firstCanonicalUnit() {
  const unitsDir = join(DIST, 'units');
  if (!existsSync(unitsDir)) {
    return null;
  }
  const ids = readdirSync(unitsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const id of ids) {
    if (existsSync(join(unitsDir, id, 'index.html'))) {
      return { path: `/units/${id}/`, file: join('units', id, 'index.html') };
    }
  }
  return null;
}

/**
 * Build the probe target list from the manifest. Always probes `/`; adds the
 * first canonical unit when unit pages exist in the build. Each target's
 * sentinel is a page-unique marker absent from the 404 page.
 */
function buildTargets() {
  const notFoundHtml = readPage('404.html') ?? '';
  const targets = [];

  const home = readPage('index.html');
  if (home !== null) {
    targets.push({
      path: '/',
      sentinel: pickSentinel(home, notFoundHtml, 'GET /'),
    });
  }

  const unit = firstCanonicalUnit();
  if (unit) {
    const unitHtml = readPage(unit.file) ?? '';
    targets.push({
      path: unit.path,
      sentinel: pickSentinel(unitHtml, notFoundHtml, `GET ${unit.path}`),
    });
  }

  return targets;
}

/** Fetch a URL, tolerating network failure as a non-200 probe. */
async function probe(url) {
  try {
    const controller = new globalThis.AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await globalThis.fetch(url, { signal: controller.signal });
      const body = await res.text();
      return { status: res.status, body };
    } finally {
      globalThis.clearTimeout(timer);
    }
  } catch (error) {
    console.error(`smoke: probe error for ${url}: ${String(error)}`);
    return { status: 0, body: '' };
  }
}

function printReport(baseUrl, responses, result) {
  console.log(`smoke: base URL = ${baseUrl}`);
  for (const response of responses) {
    const healthy =
      response.status === 200 && response.body.includes(response.sentinel);
    console.log(
      `  [${healthy ? 'ok ' : 'FAIL'}] ${response.url} → ${response.status} ` +
        `(sentinel="${response.sentinel}")`,
    );
  }
  if (!result.ok) {
    console.log(`smoke: failed URLs: ${result.failed.join(', ')}`);
  }
}

async function main() {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'error',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const { evaluateSmoke, shouldRollback, resolveBaseUrl } =
      await server.ssrLoadModule('/src/lib/delivery/smoke.ts');

    const baseUrl =
      process.env.SMOKE_BASE_URL ??
      resolveBaseUrl(
        process.env.SMOKE_DOMAIN_READY === 'true',
        process.env.SMOKE_DOMAIN ?? '',
        process.env.SMOKE_DEFAULT_URL ?? '',
      );

    if (!baseUrl) {
      throw new Error(
        'smoke: no base URL. Set SMOKE_BASE_URL, or SMOKE_DEFAULT_URL (+ optional ' +
          'SMOKE_DOMAIN / SMOKE_DOMAIN_READY).',
      );
    }

    const targets = buildTargets();
    if (targets.length === 0) {
      throw new Error(
        `smoke: no probe targets found under "${DIST}" — build first.`,
      );
    }

    // Post-deploy smoke races CloudFront Function KVS + cache propagation of
    // the just-flipped "current-prefix": on the first publish of a new prefix
    // the edge may briefly resolve a missing key (403) before the pointer
    // propagates. Retry the whole probe set with backoff so a genuine failure
    // is distinguished from propagation lag. Pure evaluateSmoke stays untouched.
    const attempts = Number(process.env.SMOKE_ATTEMPTS ?? '8');
    const delayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? '15000');
    let result;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const responses = [];
      for (const target of targets) {
        const url = baseUrl.replace(/\/$/, '') + target.path;
        const { status, body } = await probe(url);
        responses.push({ url, status, body, sentinel: target.sentinel });
      }
      result = evaluateSmoke(responses);
      printReport(baseUrl, responses, result);

      if (result.ok) {
        console.log(
          'smoke: PASSED — safe to publish this build as last-known-good.',
        );
        return;
      }
      if (attempt < attempts) {
        console.log(
          `smoke: attempt ${attempt}/${attempts} failed; waiting ${delayMs}ms ` +
            'for CloudFront/KVS propagation before retry…',
        );
        await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
      }
    }

    console.error(
      shouldRollback(result)
        ? `smoke: FAILED after ${attempts} attempts — CD should roll back to the last-known-good build.`
        : 'smoke: FAILED.',
    );
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

await main();
