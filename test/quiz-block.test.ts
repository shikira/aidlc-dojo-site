// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hydrateQuizBlock,
  initQuizBlocks,
  prefersReducedMotion,
} from '../src/components/quiz/quizBlock.client';
import {
  QUIZ_RESULT_EVENT,
  type QuizResultDetail,
} from '../src/components/quiz/contracts';

const ANIMATE_CLASS = 'quiz-result__symbol--animate';

/** Build the static DOM contract QuizBlock.astro emits (3 choices). */
function buildQuizDom(answerIndex = 1): HTMLElement {
  const root = document.createElement('section');
  root.setAttribute('data-quiz-block', '');
  root.dataset.questionId = 'q-demo-1';
  root.dataset.answerIndex = String(answerIndex);
  root.dataset.labelCorrect = '正解';
  root.dataset.labelIncorrect = '不正解';
  root.dataset.symbolCorrect = '○';
  root.dataset.symbolIncorrect = '✕';
  root.innerHTML = `
    <form data-quiz-form>
      <fieldset>
        <legend>Prompt?</legend>
        <label><input type="radio" name="q" value="0" data-quiz-choice /> A</label>
        <label><input type="radio" name="q" value="1" data-quiz-choice /> B</label>
        <label><input type="radio" name="q" value="2" data-quiz-choice /> C</label>
      </fieldset>
      <button type="submit" disabled data-quiz-submit>Submit</button>
    </form>
    <div data-quiz-result aria-live="polite"></div>
    <button type="button" hidden data-quiz-retry>Retry</button>
    <template data-quiz-explanation-template>
      <div class="quiz-result__detail">
        <p class="quiz-result__explanation">Explanation text</p>
        <p class="quiz-result__source">
          <a href="https://example.com" target="_blank" rel="noopener noreferrer">src</a>
        </p>
      </div>
    </template>`;
  document.body.appendChild(root);
  return root;
}

const form = (root: HTMLElement): HTMLFormElement =>
  root.querySelector<HTMLFormElement>('[data-quiz-form]')!;
const submit = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('[data-quiz-submit]')!;
const retry = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('[data-quiz-retry]')!;
const result = (root: HTMLElement): HTMLElement =>
  root.querySelector<HTMLElement>('[data-quiz-result]')!;
const radios = (root: HTMLElement): HTMLInputElement[] =>
  Array.from(
    root.querySelectorAll<HTMLInputElement>('input[data-quiz-choice]'),
  );

function select(root: HTMLElement, value: number): void {
  const radio = radios(root)[value]!;
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}

function submitAnswer(root: HTMLElement): void {
  form(root).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
}

function captureEvents(root: HTMLElement): QuizResultDetail[] {
  const seen: QuizResultDetail[] = [];
  root.addEventListener(QUIZ_RESULT_EVENT, (event) => {
    seen.push((event as CustomEvent<QuizResultDetail>).detail);
  });
  return seen;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  // Remove any matchMedia stub between tests.
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('QuizBlock client — event contract (SM-1 / I2)', () => {
  it('fires aidlc:quiz-result once with {questionId, correct:true} on a correct answer', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    const events = captureEvents(root);

    select(root, 1);
    expect(submit(root).disabled).toBe(false); // selection unlocked submit
    submitAnswer(root);

    expect(events).toEqual([{ questionId: 'q-demo-1', correct: true }]);
  });

  it('fires exactly once with correct:false on a wrong answer', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    const events = captureEvents(root);

    select(root, 0);
    submitAnswer(root);

    expect(events).toEqual([{ questionId: 'q-demo-1', correct: false }]);
  });

  it('does NOT fire on retry (only on answer)', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    const events = captureEvents(root);

    select(root, 0);
    submitAnswer(root); // 1 event (incorrect)
    retry(root).click(); // retry — MUST NOT emit

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ questionId: 'q-demo-1', correct: false });
    // retry resets the machine: result cleared, radios unchecked, submit re-locked
    expect(result(root).textContent?.trim()).toBe('');
    expect(radios(root).every((radio) => !radio.checked)).toBe(true);
    expect(submit(root).disabled).toBe(true);
    expect(retry(root).hidden).toBe(true);
  });

  it('does nothing when submitted with no choice selected (guard)', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    const events = captureEvents(root);

    submitAnswer(root);

    expect(events).toHaveLength(0);
    expect(result(root).textContent?.trim()).toBe('');
  });
});

describe('QuizBlock client — 3-fold result + terminal/retry UI', () => {
  it('correct: renders symbol + text + colour class, disables inputs, hides submit, focuses result', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);

    select(root, 1);
    submitAnswer(root);

    const status = result(root).querySelector('.quiz-result__status--correct');
    expect(status).not.toBeNull();
    expect(status?.querySelector('.quiz-result__symbol')?.textContent).toBe(
      '○',
    );
    expect(status?.querySelector('.quiz-result__text')?.textContent).toBe(
      '正解',
    );
    // explanation + source cloned from the template
    expect(result(root).textContent).toContain('Explanation text');
    expect(
      result(root).querySelector('a[rel="noopener noreferrer"]'),
    ).not.toBeNull();
    // terminal: inputs disabled, submit hidden, retry hidden, focus on result
    expect(radios(root).every((radio) => radio.disabled)).toBe(true);
    expect(submit(root).hidden).toBe(true);
    expect(retry(root).hidden).toBe(true);
    expect(document.activeElement).toBe(status);
  });

  it('incorrect: keeps radios active, reveals retry, and moves focus to retry (QA4)', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);

    select(root, 2);
    submitAnswer(root);

    const status = result(root).querySelector(
      '.quiz-result__status--incorrect',
    );
    expect(status).not.toBeNull();
    expect(status?.querySelector('.quiz-result__symbol')?.textContent).toBe(
      '✕',
    );
    expect(status?.querySelector('.quiz-result__text')?.textContent).toBe(
      '不正解',
    );
    expect(radios(root).some((radio) => radio.disabled)).toBe(false);
    expect(retry(root).hidden).toBe(false);
    expect(document.activeElement).toBe(retry(root));
  });

  it('supports re-answering correctly after an incorrect attempt (FR-2.4)', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    const events = captureEvents(root);

    select(root, 0);
    submitAnswer(root); // incorrect
    retry(root).click(); // back to unanswered
    select(root, 1);
    submitAnswer(root); // correct

    expect(events).toEqual([
      { questionId: 'q-demo-1', correct: false },
      { questionId: 'q-demo-1', correct: true },
    ]);
    expect(
      result(root).querySelector('.quiz-result__status--correct'),
    ).not.toBeNull();
  });
});

describe('QuizBlock client — animation gate (QA7 / A8)', () => {
  it('adds the animation class on a correct answer when motion is allowed', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);

    select(root, 1);
    submitAnswer(root);

    const symbol = result(root).querySelector('.quiz-result__symbol');
    expect(symbol?.classList.contains(ANIMATE_CLASS)).toBe(true);
  });

  it('does NOT add the animation class when prefers-reduced-motion is set', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    );
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);

    select(root, 1);
    submitAnswer(root);

    const symbol = result(root).querySelector('.quiz-result__symbol');
    expect(symbol?.classList.contains(ANIMATE_CLASS)).toBe(false);
  });

  it('prefersReducedMotion reads matchMedia, defaulting to false when absent', () => {
    expect(prefersReducedMotion()).toBe(false); // no matchMedia in jsdom
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    );
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('QuizBlock client — hydration guards + init', () => {
  it('is idempotent — a second hydrate is a no-op', () => {
    const root = buildQuizDom(1);
    hydrateQuizBlock(root);
    hydrateQuizBlock(root);
    expect(root.getAttribute('data-quiz-hydrated')).toBe('true');
    // a single wiring means a single event per answer
    const events = captureEvents(root);
    select(root, 1);
    submitAnswer(root);
    expect(events).toHaveLength(1);
  });

  it('returns quietly when a required element is missing (no throw)', () => {
    const root = document.createElement('section');
    root.setAttribute('data-quiz-block', '');
    root.innerHTML = `<form data-quiz-form></form>`; // missing submit/result/retry/template
    document.body.appendChild(root);
    expect(() => hydrateQuizBlock(root)).not.toThrow();
    expect(root.hasAttribute('data-quiz-hydrated')).toBe(false);
  });

  it('initQuizBlocks hydrates immediately when IntersectionObserver is absent', () => {
    const root = buildQuizDom(1);
    initQuizBlocks(document);
    expect(root.getAttribute('data-quiz-hydrated')).toBe('true');
  });

  it('initQuizBlocks observes each block when IntersectionObserver exists', () => {
    const observed: Element[] = [];
    class FakeObserver {
      constructor(private readonly cb: IntersectionObserverCallback) {}
      observe(el: Element): void {
        observed.push(el);
        // simulate the block scrolling into view
        this.cb(
          [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const root = buildQuizDom(1);
    initQuizBlocks(document);

    expect(observed).toContain(root);
    expect(root.getAttribute('data-quiz-hydrated')).toBe('true');
  });
});
