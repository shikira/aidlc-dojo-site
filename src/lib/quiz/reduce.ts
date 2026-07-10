// reduce.ts — the QuizBlock state machine (business-logic-model 状態機械).
//
// This is the TESTED CORE of UW-03 (DoD: ~100% coverage). It is a PURE
// function with NO DOM access (I1/I5): the island's `quizBlock.client.ts`
// wires the DOM to it, but every transition rule lives HERE so it can be
// exhaustively unit-tested without a browser.
//
// The three states and two actions mirror business-logic-model.md exactly.
// `createReduce` partially applies the (build-time, trusted) `answerIndex` and
// returns the canonical `reduce(state, action)` signature (component-methods.md).

/** The three quiz states. `correct` is terminal (business-logic-model). */
export type QuizState = 'unanswered' | 'correct' | 'incorrect';

/**
 * The two actions.
 * - `answer` carries the chosen `choice` index (into the question's choices).
 * - `retry` clears an `incorrect` attempt back to `unanswered`.
 */
export type QuizAction = { type: 'answer'; choice: number } | { type: 'retry' };

/**
 * Build the reducer for a question whose correct choice is `answerIndex`.
 *
 * Transition table (business-logic-model.md — the test spec):
 *
 * | current    | action                       | next       |
 * |------------|------------------------------|------------|
 * | unanswered | answer(i), i === answerIndex | correct    |
 * | unanswered | answer(i), i !== answerIndex | incorrect  |
 * | incorrect  | answer(i), i === answerIndex | correct    |
 * | incorrect  | answer(i), i !== answerIndex | incorrect  |
 * | incorrect  | retry                        | unanswered |
 * | correct    | (any)                        | correct    | ← terminal
 * | unanswered | retry                        | unanswered | ← no-op
 *
 * Pure and synchronous (performance-design INP): no DOM, no I/O, no closures
 * over mutable state beyond the frozen `answerIndex`.
 */
export function createReduce(
  answerIndex: number,
): (state: QuizState, action: QuizAction) => QuizState {
  return function reduce(state: QuizState, action: QuizAction): QuizState {
    // `correct` is terminal — NO action (answer or retry) leaves it (I: the two
    // terminal invariants). Guarding here keeps the switch below total.
    if (state === 'correct') {
      return 'correct';
    }

    switch (action.type) {
      case 'answer':
        // A correct choice always wins from unanswered OR incorrect (FR-2.4).
        return action.choice === answerIndex ? 'correct' : 'incorrect';
      case 'retry':
        // From incorrect → clear to unanswered; from unanswered → no-op (still
        // unanswered). Either way the next state is `unanswered`.
        return 'unanswered';
    }
  };
}
