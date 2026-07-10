import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import QuizBlock from '../src/components/QuizBlock.astro';
import type { QuizLabels } from '../src/components/quiz/contracts';

// Non-hydrated (static) render of the island. This is what a JS-disabled user
// sees (FR-2.6) and the DOM the client hydrates against (QA1/QA3).
const labels: QuizLabels = {
  submit: '回答する',
  retry: 'もう一度回答する',
  correct: '正解',
  incorrect: '不正解',
  correctSymbol: '○',
  incorrectSymbol: '✕',
  explanationLabel: '解説',
  sourceLabel: '出典',
  externalNote: '(外部サイト)',
  noscript: 'JavaScript を有効にしてください',
};

async function render(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(QuizBlock, {
    props: {
      questionId: 'q-1',
      prompt: '設問テキスト?',
      choices: ['選択肢A', '選択肢B'],
      answerIndex: 1,
      explanation: '解説テキスト',
      sourceUrl: 'https://example.com/doc',
      labels,
    },
  });
}

describe('QuizBlock — non-hydrated static output', () => {
  it('renders the <noscript> fallback with the noscript label (FR-2.6)', async () => {
    const html = await render();
    expect(html).toContain('<noscript>');
    expect(html).toContain(labels.noscript);
  });

  it('renders fieldset/legend(=prompt) and native radios (QA1/QA2)', async () => {
    const html = await render();
    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend');
    expect(html).toContain('設問テキスト?');
    expect((html.match(/type="radio"/g) ?? []).length).toBe(2);
  });

  it('places an EMPTY aria-live="polite" result region in the initial DOM (QA3)', async () => {
    const html = await render();
    expect(html).toContain('aria-live="polite"');
    // the live region must be empty at first paint (announced only on answer)
    const match = /<div[^>]*data-quiz-result[^>]*>([\s\S]*?)<\/div>/.exec(html);
    expect(match).not.toBeNull();
    expect(match?.[1]?.trim()).toBe('');
  });

  it('renders the source link as an external, safe link (QA6)', async () => {
    const html = await render();
    expect(html).toContain('href="https://example.com/doc"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});
