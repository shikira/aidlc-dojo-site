import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN, SITE_REPO_URL, reportErrorUrl } from '../src/config';

describe('site config', () => {
  it('builds the frozen report-error issue-form URL (uw-06a template path)', () => {
    expect(reportErrorUrl()).toBe(
      'https://github.com/shikira/aidlc-dojo-site/issues/new?template=report-error.yml',
    );
  });

  it('derives the report URL from the single repo-URL constant', () => {
    expect(reportErrorUrl().startsWith(SITE_REPO_URL)).toBe(true);
  });

  it('pins the canonical production origin', () => {
    expect(SITE_ORIGIN).toBe('https://aidlc-dojo.dev');
  });
});
