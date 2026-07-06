import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  type?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;

describe('command-set contract (package.json)', () => {
  it('declares an ES module package', () => {
    expect(pkg.type).toBe('module');
  });

  it('requires Node >= 20', () => {
    expect(pkg.engines?.node).toBeDefined();
    expect(pkg.engines?.node).toMatch(/>=\s*20/);
  });

  it('defines the lint command as prettier --check + eslint', () => {
    expect(pkg.scripts?.lint).toBe('prettier --check . && eslint .');
  });

  it('defines the test command as vitest with coverage', () => {
    expect(pkg.scripts?.test).toBe('vitest run --coverage');
  });

  it('defines the build command as the real Astro build (UW-01)', () => {
    // UW-06a shipped a placeholder build; UW-01 replaces it with `astro build`.
    // The stable command NAME (`build`) is preserved per the command-set
    // contract — only the implementation behind it changed.
    expect(pkg.scripts?.build).toBe('astro build');
  });

  it('defines dev and preview as Astro commands', () => {
    expect(pkg.scripts?.dev).toBe('astro dev');
    expect(pkg.scripts?.preview).toBe('astro preview');
  });

  it('provides the auxiliary format and watch commands', () => {
    expect(pkg.scripts?.format).toBe('prettier --write .');
    expect(pkg.scripts?.['test:watch']).toBe('vitest');
  });
});

describe('Astro scaffold toolchain (UW-01)', () => {
  const required = [
    'astro',
    '@astrojs/check',
    'eslint-plugin-astro',
    'prettier-plugin-astro',
  ];

  it('adds the Astro build + type-check + lint/format toolchain', () => {
    for (const dep of required) {
      expect(pkg.devDependencies?.[dep]).toBeDefined();
    }
  });

  it('pins Astro to an exact 5.x version', () => {
    expect(pkg.devDependencies?.astro).toMatch(/^5\.\d+\.\d+$/);
  });
});

describe('devDependencies are pinned to exact versions', () => {
  const required = [
    '@eslint/js',
    '@vitest/coverage-v8',
    'eslint',
    'prettier',
    'typescript',
    'typescript-eslint',
    'vitest',
    'yaml',
  ];

  it('includes every required toolchain dependency', () => {
    for (const dep of required) {
      expect(pkg.devDependencies?.[dep]).toBeDefined();
    }
  });

  it('pins each version exactly (no ^ or ~ ranges)', () => {
    const deps = pkg.devDependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      expect(version, `${name} must be pinned`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
