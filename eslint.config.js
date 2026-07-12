// ESLint flat config (ESLint v10 + typescript-eslint v8 + eslint-plugin-astro).
// TS-aware, non-type-checked ruleset (fast, no tsconfig project needed).
// Ignores build output and dependency directories.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.astro/**',
      '.output/**',
      '**/cdk.out/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: nodeGlobals,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  // .astro support: sets the astro parser + Astro-specific correctness rules.
  // The base `flat/recommended` deliberately omits the jsx-a11y ruleset (its
  // plugin does not yet support ESLint 10); a11y is covered by manual audit +
  // structural guarantees in SharedLayout (business-rules A-1..A-8).
  ...astro.configs['flat/recommended'],
);
