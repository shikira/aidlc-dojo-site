import { describe, expect, it } from 'vitest';
import {
  createReduce,
  type QuizAction,
  type QuizState,
} from '../src/lib/quiz/reduce';

// The transition table in business-logic-model.md IS the test spec (DoD:
// ~100% coverage). answerIndex = 1 throughout unless a test says otherwise.
const answer = (choice: number): QuizAction => ({ type: 'answer', choice });
const RETRY: QuizAction = { type: 'retry' };

describe('createReduce — the 7 transitions (business-logic-model table)', () => {
  const reduce = createReduce(1);

  it('unanswered + answer(correct) → correct', () => {
    expect(reduce('unanswered', answer(1))).toBe('correct');
  });

  it('unanswered + answer(wrong) → incorrect', () => {
    expect(reduce('unanswered', answer(0))).toBe('incorrect');
  });

  it('incorrect + answer(correct) → correct (re-answer wins, FR-2.4)', () => {
    expect(reduce('incorrect', answer(1))).toBe('correct');
  });

  it('incorrect + answer(wrong) → incorrect (explanation keeps showing)', () => {
    expect(reduce('incorrect', answer(2))).toBe('incorrect');
  });

  it('incorrect + retry → unanswered (explicit reset)', () => {
    expect(reduce('incorrect', RETRY)).toBe('unanswered');
  });

  it('unanswered + retry → unanswered (no-op)', () => {
    expect(reduce('unanswered', RETRY)).toBe('unanswered');
  });
});

describe('createReduce — terminal invariants (correct is absorbing)', () => {
  const reduce = createReduce(1);

  it('correct + answer(correct) stays correct', () => {
    expect(reduce('correct', answer(1))).toBe('correct');
  });

  it('correct + answer(wrong) stays correct', () => {
    expect(reduce('correct', answer(0))).toBe('correct');
  });

  it('correct + retry stays correct', () => {
    expect(reduce('correct', RETRY)).toBe('correct');
  });
});

describe('createReduce — never-always-green (answerIndex actually decides)', () => {
  it('the same choice flips outcome when answerIndex differs', () => {
    expect(createReduce(0)('unanswered', answer(0))).toBe('correct');
    expect(createReduce(2)('unanswered', answer(0))).toBe('incorrect');
  });

  it('is pure — the input state is never mutated and results are stable', () => {
    const reduce = createReduce(1);
    const start: QuizState = 'unanswered';
    expect(reduce(start, answer(3))).toBe('incorrect');
    expect(reduce(start, answer(3))).toBe('incorrect');
    expect(start).toBe('unanswered');
  });
});
