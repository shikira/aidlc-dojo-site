// quizBlock.client.ts — the QuizBlock island client entry (the site's SECOND
// and LAST client JS, alongside theme-init; JS inventory NFR-2 / I5).
//
// VANILLA TypeScript, ZERO runtime dependencies beyond the standard DOM API —
// no framework runtime (I5). It wires the static DOM emitted by QuizBlock.astro
// to the pure `reduce` state machine, renders results into a pre-existing
// `aria-live` region (QA3), and emits the frozen `aidlc:quiz-result` event
// (I2/SM-1). All strings come from `data-*` attributes the page resolved via
// `t()` (I3) — this module hardcodes NO UI text. State is in-memory only, so a
// reload resets it (I1/FR-2.5): nothing is written to storage/cookie/URL.
import { createReduce, type QuizState } from '../../lib/quiz/reduce';
import { QUIZ_RESULT_EVENT, type QuizResultDetail } from './contracts';

/** Class that triggers the 96ms check animation (performance-design / FR-2.3). */
const ANIMATE_CLASS = 'quiz-result__symbol--animate';
/** Marks a root as wired so re-init (e.g. re-observe) is idempotent. */
const HYDRATED_ATTR = 'data-quiz-hydrated';

/**
 * True when the user prefers reduced motion (QA7 / A8). Read from `matchMedia`;
 * when `matchMedia` is unavailable (SSR/jsdom without a mock) we treat motion as
 * allowed and let CSS `@media (prefers-reduced-motion)` be the backstop.
 */
export function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Wire one QuizBlock root to the state machine. Idempotent: a root already
 * marked hydrated is skipped. No runtime prop validation (I4) — the DOM
 * contract is guaranteed by QuizBlock.astro + BV-2 at build time.
 */
export function hydrateQuizBlock(root: HTMLElement): void {
  if (root.hasAttribute(HYDRATED_ATTR)) {
    return;
  }

  const form = root.querySelector<HTMLFormElement>('[data-quiz-form]');
  const submit = root.querySelector<HTMLButtonElement>('[data-quiz-submit]');
  const result = root.querySelector<HTMLElement>('[data-quiz-result]');
  const retry = root.querySelector<HTMLButtonElement>('[data-quiz-retry]');
  const template = root.querySelector<HTMLTemplateElement>(
    '[data-quiz-explanation-template]',
  );
  if (!form || !submit || !result || !retry || !template) {
    return;
  }

  const questionId = root.dataset.questionId ?? '';
  const answerIndex = Number(root.dataset.answerIndex);
  const correctLabel = root.dataset.labelCorrect ?? '';
  const incorrectLabel = root.dataset.labelIncorrect ?? '';
  const correctSymbol = root.dataset.symbolCorrect ?? '';
  const incorrectSymbol = root.dataset.symbolIncorrect ?? '';

  const reduce = createReduce(answerIndex);
  let state: QuizState = 'unanswered';

  const radios = (): HTMLInputElement[] =>
    Array.from(
      root.querySelectorAll<HTMLInputElement>('input[data-quiz-choice]'),
    );

  const clearResult = (): void => {
    result.replaceChildren();
  };

  /** Build the status line (symbol + text) and append the shared detail. */
  const renderResult = (correct: boolean): HTMLElement => {
    clearResult();

    const status = document.createElement('p');
    status.className = correct
      ? 'quiz-result__status quiz-result__status--correct'
      : 'quiz-result__status quiz-result__status--incorrect';
    status.setAttribute('tabindex', '-1');

    // SYMBOL third of the 3-fold (I6) — decorative, hidden from SR.
    const symbol = document.createElement('span');
    symbol.className = 'quiz-result__symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = correct ? correctSymbol : incorrectSymbol;
    if (correct && !prefersReducedMotion()) {
      symbol.classList.add(ANIMATE_CLASS);
    }

    // TEXT third of the 3-fold (I6) — the SR-announced correctness.
    const text = document.createElement('span');
    text.className = 'quiz-result__text';
    text.textContent = correct ? correctLabel : incorrectLabel;

    status.append(symbol, text);
    // Explanation + source are identical for both outcomes (business-logic-model).
    result.append(status, template.content.cloneNode(true));
    return status;
  };

  const onSubmit = (event: Event): void => {
    event.preventDefault();
    const checked = root.querySelector<HTMLInputElement>(
      'input[data-quiz-choice]:checked',
    );
    if (!checked) {
      return;
    }

    state = reduce(state, { type: 'answer', choice: Number(checked.value) });
    const correct = state === 'correct';
    const status = renderResult(correct);

    // Fires ONCE per answer, correct OR incorrect (SM-1); NEVER on retry.
    const detail: QuizResultDetail = { questionId, correct };
    root.dispatchEvent(
      new CustomEvent<QuizResultDetail>(QUIZ_RESULT_EVENT, {
        detail,
        bubbles: true,
      }),
    );

    if (correct) {
      // Terminal: lock inputs, remove submit, move focus to the result (QA5).
      for (const radio of radios()) {
        radio.disabled = true;
      }
      submit.hidden = true;
      retry.hidden = true;
      status.focus();
    } else {
      // Stay answerable; surface retry and move focus to it (FR-2.4 / QA4).
      retry.hidden = false;
      retry.focus();
    }
  };

  const onRetry = (): void => {
    // retry from `incorrect` → `unanswered` (no event — SM-1).
    state = reduce(state, { type: 'retry' });
    clearResult();
    for (const radio of radios()) {
      radio.checked = false;
    }
    retry.hidden = true;
    submit.disabled = true;
    const first = radios()[0];
    if (first) {
      first.focus();
    }
  };

  const onChange = (): void => {
    // A selection unlocks submit (state→display: 送信 選択後活性).
    submit.disabled = false;
  };

  form.addEventListener('submit', onSubmit);
  retry.addEventListener('click', onRetry);
  form.addEventListener('change', onChange);

  root.setAttribute(HYDRATED_ATTR, 'true');
}

/**
 * Find every QuizBlock in `scope` and hydrate it lazily (client:visible
 * semantics, performance-design LCP protection): each block hydrates the first
 * time it scrolls into view. Where `IntersectionObserver` is unavailable, we
 * hydrate immediately so the quiz still works.
 */
export function initQuizBlocks(scope: ParentNode = document): void {
  const blocks = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-quiz-block]'),
  );
  const canObserve = typeof IntersectionObserver === 'function';

  for (const block of blocks) {
    if (!canObserve) {
      hydrateQuizBlock(block);
      continue;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          hydrateQuizBlock(entry.target as HTMLElement);
          obs.unobserve(entry.target);
        }
      }
    });
    observer.observe(block);
  }
}
