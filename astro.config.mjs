// @ts-check
import { defineConfig } from 'astro/config';

// Static-site (SSG) configuration for the AI-DLC DOJO learning site.
//
// - `output: 'static'` — every route is prerendered to HTML at build time.
//   No SSR adapter and no framework runtime is shipped (NFR-2 / performance
//   LCP: no render-blocking framework JS). The ONLY client JS the site ships
//   is the theme-init inline script injected by SharedLayout (JS inventory S1).
// - `site` — canonical production origin, used for absolute URLs and sitemaps.
//   Real edge delivery + security headers are wired in uw-06b (SEC-2).
export default defineConfig({
  site: 'https://aidlc-dojo.dev',
  output: 'static',
  build: {
    // Keep processed <script> tags as EXTERNAL module files (dist/_astro/*.js)
    // instead of inlining them into the HTML. The QuizBlock island (UW-03) MUST
    // load as `<script type="module" src=...>` so it is covered by the uw-01 CSP
    // `script-src 'self'` (R-A) and so its bundle is a measurable file for the
    // size gate (R-B). Without this, Astro inlines small island bundles, which
    // would require a per-bundle sha256 in the CSP and leave no file to measure.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Belt-and-braces with build.inlineStylesheets: never base64-inline assets
      // or inline tiny entry chunks, so the island script stays external.
      assetsInlineLimit: 0,
    },
  },
});
