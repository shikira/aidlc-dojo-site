// Site-wide configuration constants (single source of truth).
//
// frontend-components.md: the Issues-report link is built from ONE repo-URL
// constant + the uw-06a-frozen issue-form template path. When the repository
// name is finalised, changing `SITE_REPO_URL` alone updates every link that
// derives from it (footer "誤りを報告", future report affordances).

/** GitHub repository base URL. Single source for all repo-derived links. */
export const SITE_REPO_URL = 'https://github.com/shikira/aidlc-dojo-site';

/** Canonical production origin. Mirrors `site` in astro.config.mjs. */
export const SITE_ORIGIN = 'https://aidlc-dojo.dev';

// uw-06a froze the error-report issue-form filename. Kept private so callers
// go through `reportErrorUrl()` and cannot drift from the frozen template path.
const REPORT_ERROR_TEMPLATE = 'report-error.yml';

/** Build the "report a content error" GitHub issue-form URL (uw-06a contract). */
export function reportErrorUrl(): string {
  return `${SITE_REPO_URL}/issues/new?template=${REPORT_ERROR_TEMPLATE}`;
}
