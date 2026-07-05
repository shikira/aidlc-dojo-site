// ESLint flat config (ESLint v10 + typescript-eslint v8).
// TS-aware, non-type-checked ruleset (fast, no tsconfig project needed).
// Ignores build output and dependency directories.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

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
);
