import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const CI_PATH = '.github/workflows/ci.yml';
const raw = readFileSync(CI_PATH, 'utf8');

interface Workflow {
  on?: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs?: Record<string, { needs?: string[] } | undefined>;
}

const workflow = parse(raw) as Workflow;

describe('CI workflow triggers', () => {
  it('runs on pull_request and push', () => {
    expect(workflow.on).toBeDefined();
    expect(Object.keys(workflow.on ?? {})).toContain('pull_request');
    expect(Object.keys(workflow.on ?? {})).toContain('push');
  });
});

describe('ci-gate aggregate check', () => {
  it('defines lint, test, build, bv, size, infra and ci-gate jobs', () => {
    const jobs = workflow.jobs ?? {};
    expect(jobs.lint).toBeDefined();
    expect(jobs.test).toBeDefined();
    expect(jobs.build).toBeDefined();
    expect(jobs.bv).toBeDefined();
    expect(jobs.size).toBeDefined();
    expect(jobs.infra).toBeDefined();
    expect(jobs['ci-gate']).toBeDefined();
  });

  it('has ci-gate depend on exactly [lint, test, build, bv, size, infra]', () => {
    expect(workflow.jobs?.['ci-gate']?.needs).toEqual([
      'lint',
      'test',
      'build',
      'bv',
      'size',
      'infra',
    ]);
  });
});

describe('security posture', () => {
  it('sets minimal top-level permissions (contents: read)', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('pins third-party actions to a commit SHA', () => {
    const shaPinned = /uses:\s+[\w./-]+@[0-9a-f]{40}\s+#/;
    expect(raw).toMatch(shaPinned);
  });
});

describe('bv gate wiring (UW-02)', () => {
  it('runs the bv command in the bv job', () => {
    expect(raw).toContain('npm run bv');
  });
});

describe('size gate wiring (UW-03 / R-B)', () => {
  it('runs the size command in the size job (after a build)', () => {
    expect(raw).toContain('npm run size');
    expect(raw).toContain('npm run build');
  });
});
