import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

interface FormField {
  type: string;
  id?: string;
  attributes?: { label?: string; options?: string[] };
  validations?: { required?: boolean };
}

interface IssueForm {
  name?: string;
  labels?: string[];
  body?: FormField[];
}

const TEMPLATE_DIR = '.github/ISSUE_TEMPLATE';

function loadForm(file: string): IssueForm {
  return parse(readFileSync(`${TEMPLATE_DIR}/${file}`, 'utf8')) as IssueForm;
}

function fieldByLabel(form: IssueForm, label: string): FormField | undefined {
  return form.body?.find((f) => f.attributes?.label?.includes(label));
}

// Any field whose label or id matches these terms would collect PII. Issue
// forms must not request personal data (security-design SEC-10 / no-PII rule).
const PII_PATTERNS = [
  /名前/,
  /氏名/,
  /メール/i,
  /email/i,
  /電話/,
  /phone/i,
  /住所/,
  /address/i,
  /連絡先/,
  /\bname\b/i,
];

function assertNoPiiFields(form: IssueForm): void {
  for (const field of form.body ?? []) {
    const haystack = `${field.id ?? ''} ${field.attributes?.label ?? ''}`;
    for (const pattern of PII_PATTERNS) {
      expect(
        pattern.test(haystack),
        `field "${haystack.trim()}" looks like a PII field (${pattern})`,
      ).toBe(false);
    }
  }
}

describe('report-error.yml', () => {
  const form = loadForm('report-error.yml');

  it('auto-labels new issues as bug-content', () => {
    expect(form.labels).toContain('bug-content');
  });

  it('requires the affected-unit URL', () => {
    const field = fieldByLabel(form, '該当単元URL');
    expect(field?.type).toBe('input');
    expect(field?.validations?.required).toBe(true);
  });

  it('requires the error description', () => {
    const field = fieldByLabel(form, '誤りの内容');
    expect(field?.type).toBe('textarea');
    expect(field?.validations?.required).toBe(true);
  });

  it('makes the evidence URL optional', () => {
    const field = fieldByLabel(form, '根拠URL');
    expect(field?.type).toBe('input');
    expect(field?.validations?.required).toBe(false);
  });

  it('collects no PII fields', () => {
    assertNoPiiFields(form);
  });
});

describe('suggest-improvement.yml', () => {
  const form = loadForm('suggest-improvement.yml');

  it('auto-labels new issues as enhancement', () => {
    expect(form.labels).toContain('enhancement');
  });

  it('offers a target dropdown with 単元 / 機能 / その他', () => {
    const field = fieldByLabel(form, '対象');
    expect(field?.type).toBe('dropdown');
    expect(field?.attributes?.options).toEqual(['単元', '機能', 'その他']);
  });

  it('requires the proposal content', () => {
    const field = fieldByLabel(form, '提案内容');
    expect(field?.type).toBe('textarea');
    expect(field?.validations?.required).toBe(true);
  });

  it('collects no PII fields', () => {
    assertNoPiiFields(form);
  });
});

describe('issue template config', () => {
  it('disables blank issues', () => {
    const config = parse(
      readFileSync(`${TEMPLATE_DIR}/config.yml`, 'utf8'),
    ) as { blank_issues_enabled?: boolean };
    expect(config.blank_issues_enabled).toBe(false);
  });
});
