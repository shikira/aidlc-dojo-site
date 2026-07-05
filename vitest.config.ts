import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

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

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Count every application source file once src exists, so untested files
      // pull coverage below the threshold instead of hiding.
      all: true,
      thresholds: hasApplicationSource() ? { lines: 80 } : undefined,
    },
  },
});
