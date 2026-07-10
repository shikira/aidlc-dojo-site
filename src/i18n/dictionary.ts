// dictionary.ts — CT-5 UI string dictionary.
//
// FROZEN FORMAT CONTRACT (business-rules 統合契約の凍結規則): the key/value shape
// below — a per-locale flat `Record<string, string>` keyed by the naming
// convention `域.部品.用途` (domain.component.purpose) — is the integration
// contract that UW-02 / BV-4 validate against. It is frozen HERE and does not
// depend on this Unit's full implementation. Do NOT change the shape without an
// ADR; adding keys/locales is additive and allowed.
//
// `ja` is complete for R1. `en` is RESERVED (NFR-9 / ADR-5): it ships in R4
// with the SAME key set as `ja`. It is intentionally empty for R1 — the EN
// language switch is `aria-disabled`, so no EN lookup occurs; a stray EN lookup
// fails fast (see t.ts), which is the intended build-time contract.

export type Locale = 'ja' | 'en';

export const DEFAULT_LOCALE: Locale = 'ja';

/** locale → (key → value). Keys follow `域.部品.用途`. */
export const dictionary: Record<Locale, Record<string, string>> = {
  ja: {
    // site
    'site.name': 'AI-DLC DOJO',
    'site.tagline': 'AI駆動開発ライフサイクルを、帯で学ぶ道場。',

    // nav (global header)
    'nav.skip.toMain': '本文へスキップ',
    'nav.global.aria': 'グローバルナビゲーション',
    'nav.global.pathWhite': '白帯パス',
    'nav.global.pathYellow': '黄帯パス',
    'nav.global.pathBlack': '黒帯パス',
    'nav.global.about': 'AI-DLCとは',
    'nav.global.aboutSite': 'このサイトについて',

    // lang switch (C7 — EN reserved seat)
    'nav.lang.enReserved': 'EN(準備中)',
    'nav.lang.aria': '言語切り替え(英語版は準備中)',

    // theme toggle (C6 — 3-value labels)
    'theme.toggle.aria': 'テーマを切り替え',
    'theme.toggle.system': '自動(OS設定)',
    'theme.toggle.light': 'ライト',
    'theme.toggle.dark': 'ダーク',

    // unit navigation (C5)
    'nav.unitnav.prev': '前の単元',
    'nav.unitnav.next': '次の単元',
    'nav.unitnav.first': 'このパスの先頭の単元です。',
    'nav.unitnav.graduation': '白帯卒業!',
    'nav.unitnav.graduationHint':
      '次の帯へ、またはロードマップへ進みましょう。',
    'nav.unitnav.backToPath': 'パスに戻る',
    'nav.unitnav.canonicalHeading': 'この単元を含む学習パス',
    'nav.unitnav.aria': '単元ナビゲーション',

    // breadcrumb
    'nav.breadcrumb.aria': 'パンくずリスト',

    // table of contents (C9)
    'toc.disclosure.summary': '目次',
    'toc.disclosure.aria': '目次',

    // footer (contentinfo)
    'footer.unofficial':
      '本サイトは非公式の学習用サイトであり、いかなる組織の公式見解も表しません。',
    'footer.link.about': 'このサイトについて',
    'footer.link.sources': '出典・免責',
    'footer.link.policy': 'ポリシー',
    'footer.link.roadmap': 'ロードマップ',
    'footer.link.report': '誤りを報告',

    // home page
    'page.home.title': 'AI-DLC DOJO — AI駆動開発ライフサイクルを帯で学ぶ',
    'page.home.description':
      'AI駆動開発ライフサイクル(AI-DLC)を、白帯から黒帯まで段階的に学べる非公式の学習サイト。',
    'page.home.h1': 'AI-DLC DOJO',
    'page.home.intro':
      'AI駆動開発ライフサイクル(AI-DLC)を、帯(レベル)ごとの学習パスで体系的に学びます。まずは白帯から始めましょう。',

    // 404 page
    'error.404.title': 'ページが見つかりません — AI-DLC DOJO',
    'error.404.description': 'お探しのページは見つかりませんでした。',
    'error.404.h1': 'ページが見つかりません',
    'error.404.body':
      'お探しのページは移動または削除された可能性があります。以下から目的のページへお進みください。',
    'error.404.recover.home': 'トップページへ戻る',
    'error.404.recover.paths': '学習パス一覧を見る',

    // quiz island (C1 / UW-03) — passed to QuizBlock via props (I3). Symbols
    // are the 記号 third of the 3-fold correctness signal (I6).
    'quiz.action.submit': '回答する',
    'quiz.action.retry': 'もう一度回答する',
    'quiz.result.correct': '正解',
    'quiz.result.incorrect': '不正解',
    'quiz.symbol.correct': '○',
    'quiz.symbol.incorrect': '✕',
    'quiz.label.explanation': '解説',
    'quiz.label.source': '出典',
    'quiz.label.external': '(外部サイト)',
    'quiz.noscript.message':
      'この問題に答えるには JavaScript を有効にしてください。本文は JavaScript なしでも読めます。',

    // quiz construction demo (temporary — UW-04 owns real page composition).
    'page.quizdemo.title': 'QuizBlock デモ(構築用) — AI-DLC DOJO',
    'page.quizdemo.description':
      'UW-03 QuizBlock アイランドの構築用デモページ。UW-04 のページ構成で置き換えられます。',
    'page.quizdemo.heading': 'QuizBlock デモ(構築用)',
    'page.quizdemo.note':
      'このページは UW-03 の島をビルドさせるための一時的な検証用ページです。UW-04 のページ構成で置き換えられます。',
  },
  en: {
    // Reserved (R4). Populated with the SAME key set as `ja`. Empty for R1.
  },
};
