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

  it('defines the build command as the placeholder script', () => {
    expect(pkg.scripts?.build).toBe('node scripts/build-placeholder.mjs');
  });

  it('provides the auxiliary format and watch commands', () => {
    expect(pkg.scripts?.format).toBe('prettier --write .');
    expect(pkg.scripts?.['test:watch']).toBe('vitest');
  });
});

describe('build is a bootstrap placeholder (replaced by UW-01)', () => {
  const placeholder = readFileSync('scripts/build-placeholder.mjs', 'utf8');

  it('logs the placeholder marker so it is not mistaken for a permanent empty gate', () => {
    expect(placeholder).toContain('bootstrap placeholder — replaced by UW-01');
  });

  it('exits 0 so the empty container stays green', () => {
    expect(placeholder).toContain('process.exit(0)');
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
