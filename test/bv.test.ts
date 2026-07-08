import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCollections } from '../src/lib/content/parse';
import { dictionary } from '../src/i18n/dictionary';
import { bv1 } from '../src/lib/bv/bv1';
import { bv2, isHttpsUrl, sectionSlugs } from '../src/lib/bv/bv2';
import { bv3 } from '../src/lib/bv/bv3';
import {
  bv4,
  bv4Dictionary,
  bv4HardcodedStrings,
  stripComments,
} from '../src/lib/bv/bv4';
import { bv5 } from '../src/lib/bv/bv5';
import {
  formatReport,
  loadUiSources,
  runAllBv,
  runBvFromDisk,
} from '../src/lib/bv/index';
import { error, hasError, warning } from '../src/lib/bv/types';

const FIX = 'test/fixtures/bv';

describe('finding helpers', () => {
  it('hasError distinguishes errors from warnings', () => {
    expect(hasError([warning('BV-x', 'w')])).toBe(false);
    expect(hasError([error('BV-x', 'e')])).toBe(true);
    expect(hasError([])).toBe(false);
  });
});

describe('happy path — the sample content passes every gate (no errors)', () => {
  const findings = runBvFromDisk();

  it('runBvFromDisk reports zero errors', () => {
    expect(hasError(findings)).toBe(false);
  });

  it('the only findings are BV-3 short-body warnings (seed samples)', () => {
    for (const finding of findings) {
      expect(finding.severity).toBe('warning');
      expect(finding.gate).toBe('BV-3');
    }
  });

  it('runAllBv over the sample collections has no errors', () => {
    const collections = loadCollections();
    expect(hasError(runAllBv(collections, dictionary, []))).toBe(false);
  });
});

// ---- V-NEG: each gate must FAIL on its broken fixture (never-always-green) ----

describe('V-NEG BV-1 — missing version tag', () => {
  it('flags a unit with no version tag', () => {
    const collections = loadCollections(`${FIX}/bv1-missing-version`);
    const findings = bv1(collections);
    expect(hasError(findings)).toBe(true);
    expect(findings[0]?.gate).toBe('BV-1');
  });

  it('accepts valid version tags (positive control)', () => {
    expect(bv1({ units: [], paths: [], questions: [], articles: [] })).toEqual(
      [],
    );
  });
});

describe('V-NEG BV-2 — bad question count / uncovered section', () => {
  const collections = loadCollections(`${FIX}/bv2-bad-questions`);
  const findings = bv2(collections);

  it('flags too-few questions and an uncovered section', () => {
    expect(hasError(findings)).toBe(true);
    expect(findings.some((f) => /must be 3–8/.test(f.message))).toBe(true);
    expect(findings.some((f) => /no question after it/.test(f.message))).toBe(
      true,
    );
  });

  it('sectionSlugs extracts h2 slugs only', () => {
    expect(sectionSlugs('## First\n\ntext\n### skip\n## Second Part')).toEqual([
      'first',
      'second-part',
    ]);
  });

  it('isHttpsUrl accepts https and rejects otherwise', () => {
    expect(isHttpsUrl('https://example.com')).toBe(true);
    expect(isHttpsUrl('http://example.com')).toBe(false);
    expect(isHttpsUrl('not a url')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });

  it('flags out-of-range answerIndex and bad choice counts', () => {
    const findings2 = bv2({
      units: [{ id: 'u', title: 'U', version: 'v2', body: '' }],
      paths: [],
      articles: [],
      questions: [
        {
          id: 'q1',
          unitId: 'u',
          afterSection: 's',
          prompt: 'p',
          choices: ['only-one'],
          answerIndex: 9,
          explanation: '',
          sourceUrl: 'ftp://x',
        },
      ],
    });
    expect(findings2.some((f) => /choices/.test(f.message))).toBe(true);
    expect(findings2.some((f) => /answerIndex/.test(f.message))).toBe(true);
    expect(findings2.some((f) => /explanation/.test(f.message))).toBe(true);
    expect(findings2.some((f) => /sourceUrl/.test(f.message))).toBe(true);
  });
});

describe('V-NEG BV-3 — reading time over 20 minutes', () => {
  it('flags an over-long unit as an error', () => {
    const collections = loadCollections(`${FIX}/bv3-too-long`);
    const findings = bv3(collections);
    expect(hasError(findings)).toBe(true);
    expect(findings[0]?.message).toMatch(/> 20/);
  });

  it('warns (not errors) on a short body', () => {
    const findings = bv3({
      units: [{ id: 'u', title: 'U', version: 'v2', body: 'short' }],
      paths: [],
      questions: [],
      articles: [],
    });
    expect(hasError(findings)).toBe(false);
    expect(findings[0]?.severity).toBe('warning');
  });
});

describe('V-NEG BV-4 — hardcoded UI string + dictionary contract', () => {
  it('flags a hardcoded Japanese string in a UI file', () => {
    const content = readFileSync(`${FIX}/bv4-hardcoded/Bad.astro`, 'utf8');
    const findings = bv4HardcodedStrings([{ path: 'Bad.astro', content }]);
    expect(hasError(findings)).toBe(true);
  });

  it('ignores Japanese that lives only in comments', () => {
    const stripped = stripComments(
      '// 日本語コメント\n<!-- コメント -->\n/* ブロック */\nconst x = 1;',
    );
    expect(/[\u3040-\u30ff\u4e00-\u9fff]/.test(stripped)).toBe(false);
    expect(
      bv4HardcodedStrings([
        { path: 'ok.ts', content: '// 日本語\nconst x = 1;' },
      ]),
    ).toEqual([]);
  });

  it('accepts the real frozen dictionary (positive control)', () => {
    expect(bv4Dictionary(dictionary)).toEqual([]);
  });

  it('flags a malformed dictionary (bad key + non-string value)', () => {
    const findings = bv4({
      dictionary: {
        ja: { BadKey: 'x', 'ok.key': 123 as unknown as string },
      },
    });
    expect(findings.some((f) => /naming convention/.test(f.message))).toBe(
      true,
    );
    expect(findings.some((f) => /not a string/.test(f.message))).toBe(true);
  });

  it('enforces ja/en parity only when en is populated', () => {
    expect(bv4Dictionary({ ja: { 'a.b': 'x' }, en: {} })).toEqual([]);
    const findings = bv4Dictionary({ ja: { 'a.b': 'x' }, en: { 'a.c': 'y' } });
    expect(findings.some((f) => /parity/.test(f.message))).toBe(true);
  });
});

describe('V-NEG BV-5 — broken reference', () => {
  it('flags a path referencing a missing unit', () => {
    const collections = loadCollections(`${FIX}/bv5-broken-ref`);
    const findings = bv5(collections);
    expect(hasError(findings)).toBe(true);
    expect(
      findings.some((f) => /unknown unit "does-not-exist"/.test(f.message)),
    ).toBe(true);
  });

  it('warns on an orphan unit and flags a bad question ref', () => {
    const findings = bv5({
      units: [{ id: 'orphan', title: 'O', version: 'v2', body: '' }],
      paths: [],
      questions: [
        {
          id: 'q',
          unitId: 'ghost',
          afterSection: 's',
          prompt: 'p',
          choices: ['a', 'b'],
          answerIndex: 0,
          explanation: 'e',
          sourceUrl: 'https://x.dev',
        },
      ],
      articles: [],
    });
    expect(
      findings.some(
        (f) => f.severity === 'warning' && /orphan/.test(f.message),
      ),
    ).toBe(true);
    expect(
      findings.some((f) =>
        /question "q" references unknown unit "ghost"/.test(f.message),
      ),
    ).toBe(true);
  });
});

describe('report + UI source loader', () => {
  it('formatReport summarises errors and warnings', () => {
    const report = formatReport([
      error('BV-1', 'boom'),
      warning('BV-3', 'meh'),
    ]);
    expect(report).toMatch(/1 error\(s\), 1 warning\(s\)/);
    expect(report).toMatch(/✗ ERROR \[BV-1\]/);
  });

  it('formatReport reports a clean pass', () => {
    expect(formatReport([])).toMatch(/All gates passed/);
  });

  it('loadUiSources reads the real UI directories', () => {
    const sources = loadUiSources();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => typeof s.content === 'string')).toBe(true);
  });
});
