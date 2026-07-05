import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ADR-2 / P1: this public repo carries site code + content only. Internal
// AI-DLC records must be excluded as defense-in-depth so they can never be
// accidentally committed.
const gitignore = readFileSync('.gitignore', 'utf8');
const patterns = gitignore
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'));

describe('publish boundary (.gitignore)', () => {
  it('excludes the internal aidlc/ workspace', () => {
    expect(patterns).toContain('aidlc/');
  });

  it('excludes audit directories anywhere in the tree', () => {
    expect(patterns).toContain('**/audit/');
  });

  it('excludes the .kiro/ tooling directory', () => {
    expect(patterns).toContain('.kiro/');
  });

  it('excludes diagnostic files', () => {
    expect(patterns.some((p) => p.includes('diagnostic'))).toBe(true);
  });

  it('excludes committed secrets (.env)', () => {
    expect(patterns).toContain('.env');
  });
});
