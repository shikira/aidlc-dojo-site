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
});
