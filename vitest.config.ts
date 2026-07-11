import { existsSync, readdirSync } from 'node:fs';
import { getViteConfig } from 'astro/config';

// business-rules R7: the test job is pass-with-no-tests, and the 80% line
// coverage threshold (team.md Testing Posture) only activates once application
// source (src/**/*.ts) exists. A freshly-bootstrapped container has no src, so
// the threshold must NOT bite — CI stays green. We resolve this deterministically
// here rather than relying on coverage-tool behaviour for an empty file set.
function hasApplicationSource(): boolean {
  if (!existsSync('src')) {
    return false;
  }
  const entries = readdirSync('src', { recursive: true, encoding: 'utf8' });
  return entries.some(
    (entry) => typeof entry === 'string' && entry.endsWith('.ts'),
  );
}

// getViteConfig wires Astro's Vite plugins into the Vitest run so `.astro`
// components can be imported and rendered with the Container API (UW-03 uses
// this to assert QuizBlock's <noscript> fallback). Node-based tests (fs/yaml)
// are unaffected — the plugin only adds transforms, it does not change them.
export default getViteConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // src/content.config.ts imports `astro:content` (only resolvable inside
      // the Astro build), so it is not unit-testable here — it is validated by
      // `astro build` / `astro check` instead. Exclude it from coverage rather
      // than let an unreachable file drag the threshold down.
      exclude: ['src/content.config.ts'],
      // Count every application source file once src exists, so untested files
      // pull coverage below the threshold instead of hiding.
      all: true,
      thresholds: hasApplicationSource() ? { lines: 80 } : undefined,
    },
  },
});
