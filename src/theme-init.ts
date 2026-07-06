// theme-init.ts — the ONLY client JS this Unit ships (JS inventory S1).
//
// Theme is 3-valued (business-logic-model C6): 'light' | 'dark' | 'system'.
// 'system' is expressed by the ABSENCE of the `data-theme` attribute, so the
// OS preference is applied for free by CSS `prefers-color-scheme` — no JS media
// listener is added. This keeps the client-JS inventory at exactly one inline
// script (reliability REL-3, the 1-argument `resolveTheme` arbitration).
//
// Single-source seam: `resolveTheme` / `nextTheme` are the pure, unit-tested
// SPEC of the rules. `INLINE_SCRIPT` is a string that SharedLayout injects
// verbatim (`is:inline set:html`) into <head> before paint (FOUC prevention,
// reliability REL-2). The inline string mirrors these functions; parity is a
// review invariant (a browser cannot import the TS module before paint).

/** The two explicit, persisted theme values. */
export type Theme = 'light' | 'dark';

/** User-facing 3-valued choice; 'system' means "no attribute, defer to CSS". */
export type ThemeChoice = Theme | 'system';

/** localStorage key holding the persisted explicit choice (SEC-5). */
export const THEME_STORAGE_KEY = 'aidlc-theme';

/**
 * Resolve a persisted value into an explicit theme, or `null` for "system".
 *
 * REL-3 arbitration — this is the 1-ARG form. `null`, `''`, and any unknown
 * value ("banana", "System", …) resolve to `null` = system = attribute-absent,
 * letting CSS `prefers-color-scheme` decide. Pure function.
 */
export function resolveTheme(stored: string | null): Theme | null {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

/**
 * 3-value toggle cycle: system → light → dark → system. Pure function.
 */
export function nextTheme(current: ThemeChoice): ThemeChoice {
  switch (current) {
    case 'system':
      return 'light';
    case 'light':
      return 'dark';
    case 'dark':
      return 'system';
  }
}

/**
 * The single inline script, injected verbatim into <head> before paint.
 *
 * Responsibilities (all in ONE script — S1):
 *  1. Read localStorage before paint and apply an explicit theme via
 *     `document.documentElement.dataset.theme` (system => leave absent).
 *  2. Register a DOCUMENT-LEVEL click delegate on `[data-theme-toggle]` that
 *     cycles system→light→dark→system, persists the choice, and reflects the
 *     new label onto the toggle (labels are passed in via data-* by
 *     SharedLayout, resolved through `t()` — no hardcoded UI strings, S2).
 *
 * Storage access is wrapped in try/catch so a blocked localStorage (private
 * mode) degrades to the system default rather than throwing before paint.
 */
export const INLINE_SCRIPT: string = `(function () {
  var KEY = ${JSON.stringify(THEME_STORAGE_KEY)};
  var root = document.documentElement;
  function resolve(stored) {
    return stored === 'light' || stored === 'dark' ? stored : null;
  }
  function apply(theme) {
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }
  function currentChoice() {
    var t = root.getAttribute('data-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  }
  function next(choice) {
    return choice === 'system' ? 'light' : choice === 'light' ? 'dark' : 'system';
  }
  try {
    apply(resolve(localStorage.getItem(KEY)));
  } catch (e) {
    /* storage blocked -> system default; the page still renders */
  }
  document.addEventListener('click', function (event) {
    var el = event.target;
    var toggle = el && el.closest ? el.closest('[data-theme-toggle]') : null;
    if (!toggle) {
      return;
    }
    var choice = next(currentChoice());
    apply(choice);
    try {
      if (choice === 'system') {
        localStorage.removeItem(KEY);
      } else {
        localStorage.setItem(KEY, choice);
      }
    } catch (e) {
      /* storage blocked -> in-memory only for this pageview */
    }
    toggle.setAttribute('data-theme-state', choice);
    var label = toggle.getAttribute('data-label-' + choice);
    if (label) {
      toggle.setAttribute('aria-label', label);
      var text = toggle.querySelector('[data-theme-label]');
      if (text) {
        text.textContent = label;
      }
    }
  });
})();`;
