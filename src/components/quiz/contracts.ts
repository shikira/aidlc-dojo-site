// contracts.ts — the FROZEN integration contract for the QuizBlock island
// (frontend-components.md / domain-entities.md 契約の凍結).
//
// Type-only module (fully erased at build): shapes here ship NO runtime code
// and NO runtime validation (I4 — prop integrity is guaranteed at build time by
// BV-2, not re-checked here). Two things are frozen and MUST NOT change without
// an ADR:
//   1. `QuizResultDetail` — the CustomEvent `detail` shape (I2/SM-1). R3
//      (間違い復習) is the first real consumer across the island boundary.
//   2. `QuizBlockProps` — the mount contract UW-04 depends on (統合契約).

/**
 * Localized display strings for one QuizBlock. Resolved at BUILD time by the
 * mounting page via `t()` and passed in as props — the island NEVER calls
 * `t()` and NEVER hardcodes strings (I3). All correctness signalling is
 * three-fold (symbol + text + colour, I6); the symbol + text come from here,
 * the colour from tokens.
 */
export interface QuizLabels {
  /** Submit button label. */
  submit: string;
  /** Retry button label (shown only in the `incorrect` state). */
  retry: string;
  /** Result text for a correct answer (the TEXT third of the 3-fold, I6). */
  correct: string;
  /** Result text for an incorrect answer. */
  incorrect: string;
  /** Correct SYMBOL glyph (e.g. "○") — the SYMBOL third of the 3-fold (I6). */
  correctSymbol: string;
  /** Incorrect symbol glyph (e.g. "✕"). */
  incorrectSymbol: string;
  /** Inline label preceding the explanation text. */
  explanationLabel: string;
  /** Inline label preceding the source link. */
  sourceLabel: string;
  /** Screen-reader note that the source link opens an external site (QA6). */
  externalNote: string;
  /** Fallback message shown inside `<noscript>` when JS is off (FR-2.6). */
  noscript: string;
}

/**
 * Mount props for one QuizBlock (frontend-components.md props 境界). Serializable
 * values ONLY — no functions/callbacks cross the island boundary; the sole
 * outbound channel is the `aidlc:quiz-result` CustomEvent (SM-1).
 */
export interface QuizBlockProps {
  /** Stable question id (CT-3). Echoed verbatim in the result event. */
  questionId: string;
  /** The question text (rendered as the fieldset legend, QA1). */
  prompt: string;
  /** 2–5 answer choices (BV-2). Rendered as native radios (QA2). */
  choices: string[];
  /** Index into `choices` of the correct answer (trusted, build-time; SEC-4). */
  answerIndex: number;
  /** Explanation shown after answering (FR-2.2). */
  explanation: string;
  /** Verified https source URL (FR-2.2 / QA6). */
  sourceUrl: string;
  /** Localized display strings (see `QuizLabels`). */
  labels: QuizLabels;
}

/**
 * FROZEN (I2/SM-1). The `detail` of the `aidlc:quiz-result` CustomEvent. The
 * event fires ONCE per answer (correct OR incorrect) and NEVER on retry. It
 * carries NO answer content or PII (security-design SEC-2) — only the question
 * id and whether the attempt was correct.
 */
export interface QuizResultDetail {
  questionId: string;
  correct: boolean;
}

/**
 * FROZEN event name (I2/SM-1). The single event the island emits across its
 * boundary. R3 (間違い復習) listens for this to persist wrong answers WITHOUT
 * the island itself persisting anything (I1 — non-persistence).
 */
export const QUIZ_RESULT_EVENT = 'aidlc:quiz-result';
