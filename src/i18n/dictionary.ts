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
    'nav.unitnav.graduation': 'このパスを修了しました!',
    'nav.unitnav.graduationHint':
      '次の帯へ、またはロードマップへ進みましょう。',
    'nav.unitnav.graduationExam': '次へ: 問題集・認定試験(準備中)',
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

    // ===================================================================
    // UW-05 静的ページ群 (S4〜S7). All rendered text routes through t() so no
    // Japanese string is hardcoded in .astro/.ts sources (BV-4 / NFR-9). Body
    // prose lives here (not inline) for the same reason and for owner review.
    // ===================================================================

    // shared — external-link note (A-6 / SEC-7)
    'link.external.note': '(外部サイト)',

    // version tag (C4 — v1/v2/共通; colour + text, never colour-only S-4)
    'version.tag.v1': 'v1',
    'version.tag.v2': 'v2',
    'version.tag.common': '共通',
    'version.tag.label': 'バージョン',

    // S4 — AI-DLCとは (/what-is-aidlc/)
    'page.whatis.title': 'AI-DLCとは — AI-DLC DOJO',
    'page.whatis.description':
      'AI駆動開発ライフサイクル(AI-DLC)の考え方を、これから学ぶ人向けにやさしく紹介します。',
    'page.whatis.h1': 'AI-DLCとは',
    'page.whatis.intro.p1':
      'AI-DLC(AI-Driven Development Life Cycle / AI駆動開発ライフサイクル)は、要件定義から設計・実装・運用までの開発工程を、AIエージェントと人が協働しながら段階的に進めるための進め方です。各工程には人が確認・承認する「ゲート」があり、AIが提案し人が判断する形で進みます。',
    'page.whatis.intro.p2':
      'この道場(DOJO)では、AI-DLCの考え方を「帯(レベル)」に分けて学びます。白帯で全体像と基本用語をつかみ、上位の帯で設計判断や運用の勘所へと踏み込んでいきます。',
    'page.whatis.intro.p3':
      '各単元は短時間で読める分量にまとまっており、区切りごとに理解度を確認するクイズが用意されています。読み進めながら、自分のペースで手を動かして学べます。',
    'page.whatis.cta.heading': 'さっそく始める',
    'page.whatis.cta.body':
      '準備ができたら、帯を選んで学習を始めましょう。まずは白帯パスがおすすめです。',
    'page.whatis.cta.pathsLink': '白帯パスから始める',
    'page.whatis.cta.homeLink': 'トップで帯を選ぶ',

    // S5 — このサイトについて (/about/)
    'page.about.title': 'このサイトについて — AI-DLC DOJO',
    'page.about.description':
      'AI-DLC DOJO の目的と成り立ち、そして本サイトが非公式のコミュニティ学習サイトである旨をご説明します。',
    'page.about.h1': 'このサイトについて',
    'page.about.intro.p1':
      'AI-DLC DOJO は、AI駆動開発ライフサイクル(AI-DLC)を帯(レベル)ごとに学べる学習サイトです。体系立てて少しずつ学べるよう、単元とクイズ、学習パスを用意しています。',
    'page.about.intro.p2':
      'コンテンツは日本語で提供しています。英語版(EN)は今後の対応予定で、現在は準備中です。',
    'page.about.unofficial.heading': '非公式サイトであることについて',
    'page.about.unofficial.body':
      '本サイトは有志による非公式のコミュニティ学習サイトです。AWS または awslabs が公式に提供・監修・保証するものではありません。掲載内容は学習目的で再構成したものであり、公式見解を表すものではありません。',
    'page.about.related.heading': '関連ページ',
    'page.about.related.whatis': 'AI-DLCとは',
    'page.about.related.credits': '出典・免責',
    'page.about.related.privacy': 'プライバシーポリシー',
    'page.about.related.roadmap': 'ロードマップ',

    // S5 — 出典・免責 (/credits/)
    'page.credits.title': '出典・免責 — AI-DLC DOJO',
    'page.credits.description':
      '本サイトの教材・問題の出典(awslabs/aidlc-workflows, MIT-0)と、内容に関する免責事項を記載します。',
    'page.credits.h1': '出典・免責',
    'page.credits.intro':
      '本サイトのコンテンツが依拠している出典と、その利用条件・免責事項をまとめています。',
    'page.credits.sources.heading': '出典',
    'page.credits.sources.body':
      '本サイトの教材および問題は、awslabs が公開する AI-DLC ワークフロー(awslabs/aidlc-workflows)を主な出典とし、学習用に再構成・要約しています。',
    'page.credits.sources.linkLabel': 'awslabs/aidlc-workflows(GitHub)',
    'page.credits.sources.license':
      'awslabs/aidlc-workflows は MIT-0 ライセンスの下で公開されています。',
    'page.credits.license.heading': 'ライセンス表記(MIT-0)',
    'page.credits.license.body':
      'MIT No Attribution(MIT-0)ライセンスは、著作権表示を保持する義務なく、複製・改変・再配布・商用利用を許可するものです。本サイトはこの許諾に基づき出典コンテンツを再構成して掲載していますが、感謝と透明性のため、出典として awslabs/aidlc-workflows を明記しています。',
    'page.credits.disclaimer.heading': '免責事項',
    'page.credits.disclaimer.unofficial':
      '本サイトは非公式のコミュニティ学習サイトであり、AWS/awslabs の公式提供物ではありません。',
    'page.credits.disclaimer.accuracy':
      '掲載内容の正確性・最新性は保証されません。内容は予告なく変更されることがあります。実際の利用にあたっては、必ず一次情報(公式ドキュメントやリポジトリ)をご確認ください。本サイトの利用により生じたいかなる損害についても責任を負いかねます。',

    // S5 — プライバシーポリシー (/privacy/)
    'page.privacy.title': 'プライバシーポリシー — AI-DLC DOJO',
    'page.privacy.description':
      '本サイトが収集する情報・収集しない情報、クッキーレスなアクセス解析の方式、今後の予定を開示します。',
    'page.privacy.h1': 'プライバシーポリシー',
    'page.privacy.intro':
      '本サイトにおける情報の取り扱いについて、以下のとおり開示します。',
    'page.privacy.unofficial':
      '本サイトは非公式のコミュニティ学習サイトであり、AWS/awslabs の公式提供物ではありません。',
    'page.privacy.collect.heading': '収集する情報・収集しない情報',
    'page.privacy.collect.cookies': 'クッキー(Cookie)を一切発行しません。',
    'page.privacy.collect.noPii': '個人を特定する情報は取得しません。',
    'page.privacy.collect.aggregate':
      '取得するのは、ページ単位の閲覧数などの集約されたアクセス指標のみです。',
    'page.privacy.collect.noRegistration':
      'R1(現行版)には登録機能がないため、氏名・メールアドレスなどの個人情報は一切収集・保持しません。',
    'page.privacy.analytics.heading': 'アクセス解析の方式',
    'page.privacy.analytics.method':
      'アクセス解析は、CDN(エッジ)のアクセスログを集約して集計する方式で行います。ページに解析用のJavaScript(トラッキングタグ)は一切埋め込みません。クッキーを発行せず、IPアドレス等から個人を特定することもありません。集計対象は、ページビューやリファラといった集約統計に限られます。',
    'page.privacy.r2.heading': '今後の予定(R2)',
    'page.privacy.r2.body':
      '将来的に、任意のアカウント登録やスコアの保存機能を追加する際には、利用規約を整備し、スコアデータの取り扱いについて本ポリシーを更新する予定です。追加時にはこのページで改めてお知らせします。',
    'page.privacy.r2.linkLabel': 'ロードマップで今後の予定を見る',

    // S6 — ロードマップ (/roadmap/)
    'page.roadmap.title': 'ロードマップ — AI-DLC DOJO',
    'page.roadmap.description':
      '公開済みの機能とこれからの予定(準備中・その後)を、リリースごとにまとめたロードマップです。',
    'page.roadmap.h1': 'ロードマップ',
    'page.roadmap.intro':
      '公開済みの機能と、これから取り組む予定をまとめています。各項目は、他のページから直接この位置にリンクできます。',
    // roadmap section headings (shipped/planned/later)
    'roadmap.section.shipped': '公開済み(R1)',
    'roadmap.section.planned': '準備中(R2)',
    'roadmap.section.later': 'その後(R3・R4)',
    // roadmap status badge — colour + text + symbol (S-4)
    'roadmap.status.shipped': '公開済み',
    'roadmap.status.planned': '準備中',
    'roadmap.status.later': 'その後',
    'roadmap.status.shipped.symbol': '✓',
    'roadmap.status.planned.symbol': '⋯',
    'roadmap.status.later.symbol': '◇',
    // roadmap items — R1 shipped
    'roadmap.item.learningPaths.title': '学習パス(白・茶・黒帯)',
    'roadmap.item.learningPaths.desc':
      '帯(レベル)ごとに単元を並べた学習コース。白帯から順に進みます。',
    'roadmap.item.quiz.title': '理解度クイズ',
    'roadmap.item.quiz.desc':
      '各単元の区切りで理解度を確認できる選択式の問題。',
    'roadmap.item.versionTags.title': 'バージョンタグ(v1・v2・共通)',
    'roadmap.item.versionTags.desc':
      '教材や問題が対象とする AI-DLC のバージョンをタグで明示します。',
    'roadmap.item.news.title': '新着・お知らせ',
    'roadmap.item.news.desc':
      'サイトの更新情報や新しい教材の追加をまとめて掲載します。',
    'roadmap.item.analytics.title': 'クッキーレスなアクセス解析',
    'roadmap.item.analytics.desc':
      'クッキーを使わず、集約されたアクセス指標のみを把握します。',
    // roadmap items — R2 planned
    'roadmap.item.exam.title': '認定試験(Associate / Professional)',
    'roadmap.item.exam.desc':
      '腕試しのための模擬認定試験。合否とスコアを表示します。',
    'roadmap.item.ranking.title': 'シーズンランキング',
    'roadmap.item.ranking.desc':
      '一定期間のスコアを集計したランキングを表示します。',
    'roadmap.item.badges.title': '合格バッジ',
    'roadmap.item.badges.desc':
      '試験合格やマイルストーン達成で獲得できるバッジ。',
    'roadmap.item.registration.title': '任意のアカウント登録(パスキー)',
    'roadmap.item.registration.desc':
      'パスキーによる任意登録。学習状況の保存に使います。',
    'roadmap.item.terms.title': '利用規約',
    'roadmap.item.terms.desc':
      'アカウント機能の追加に合わせて整備する利用規約。',
    // roadmap items — R3 later
    'roadmap.item.levelCheck.title': 'レベル診断',
    'roadmap.item.levelCheck.desc':
      '数問の診断で、いまの理解度に合った帯をおすすめします。',
    'roadmap.item.review.title': '間違い復習',
    'roadmap.item.review.desc':
      '間違えた問題だけを、あとでまとめて復習できる機能。',
    'roadmap.item.dailyQuiz.title': 'デイリークイズ・連続記録',
    'roadmap.item.dailyQuiz.desc':
      '毎日出題される小問と、連続学習日数(ストリーク)の記録。',
    'roadmap.item.sync.title': 'クロスデバイス同期',
    'roadmap.item.sync.desc': '複数の端末で学習状況を同期します。',
    // roadmap items — R4 later
    'roadmap.item.i18n.title': '英語版(EN)',
    'roadmap.item.i18n.desc':
      'コンテンツと UI の英語対応。現在は日本語のみです。',

    // S7 — 新着 (/news/ and /news/{slug}/)
    'page.news.title': '新着 — AI-DLC DOJO',
    'page.news.description':
      'AI-DLC DOJO の更新情報や新しい教材の追加についてのお知らせ一覧です。',
    'page.news.h1': '新着',
    'news.empty.heading': 'まだ新着はありません',
    'news.empty.message':
      '公開後、サイトの更新情報をこちらに掲載します。それまでは学習パスからお進みください。',
    'news.empty.linkHome': 'トップページへ',
    'news.empty.linkPaths': '白帯パスを見る',
    'news.breadcrumb.list': '新着',
    'news.article.dateLabel': '公開日',

    // ===================================================================
    // UW-04 学習ページ (UI-1 TopPage / UI-2 PathPage / UI-3 UnitPage). All
    // rendered UI text routes through t() (BV-4 / NFR-9); unit body Markdown is
    // exempt (S-2). Belt/audience labels map CT-2 enum values to Japanese; a
    // missing mapping fails the build (t() fail-fast).
    // ===================================================================

    // global nav — brown belt. The paths use belt=brown; the earlier "yellow"
    // nav link pointed at a non-existent /paths/yellow/ (dead-end fix).
    'nav.global.pathBrown': '茶帯パス',

    // reading time — machine-readable <time datetime="PTnM"> + labels (FR-1.5 / S-5)
    'reading.time.label': '読了時間の目安',
    'reading.time.total': '合計読了時間',
    'reading.time.unit': '分',

    // belt audience labels (map CT-2 `audience` enum → JA)
    'belt.audience.label': '対象',
    'belt.audience.foundational': 'これから学ぶ方へ',
    'belt.audience.associate': '実務で使い始める方へ',
    'belt.audience.professional': 'チームへ展開する方へ',

    // C2 BeltCard
    'belt.card.unitCount': '単元数',
    'belt.card.unit': '単元',
    'belt.card.cta': 'このパスを見る',

    // C3 PathList
    'nav.pathlist.aria': '学習パスの単元一覧',
    'pathlist.unitNumber.label': '単元番号',

    // UI-1 TopPage (M1)
    'page.home.hero.subtitle':
      'AI駆動開発ライフサイクル(AI-DLC)を、白帯・茶帯・黒帯の3つの学習パスで体系的に学べる非公式の道場です。',
    'page.home.hero.cta': '学習を始める',
    'page.home.belts.heading': '帯を選んで始める',
    'page.home.belts.intro':
      'レベルに合わせて帯を選びましょう。はじめての方は白帯からがおすすめです。',
    'page.home.news.heading': '新着',
    'page.home.news.viewAll': '新着をすべて見る',
    'page.home.roadmap.heading': 'これからの予定',
    'page.home.roadmap.body':
      '公開済みの機能とこれから取り組む予定は、ロードマップにまとめています。',
    'page.home.roadmap.link': 'ロードマップを見る',

    // UI-2 PathPage (M2)
    'page.path.descriptionSuffix':
      ' の学習パス。単元を順に読み進め、クイズで理解度を確認しながら学べます。— AI-DLC DOJO',
    'path.tail.heading': 'このパスを修了したら',
    'path.tail.body':
      'すべての単元を終えたら、腕試しの問題集・認定試験(準備中)に挑戦できます。公開予定はロードマップをご覧ください。',
    'path.tail.examLink': '問題集・認定試験の予定を見る(準備中)',
    'path.empty.heading': '準備中です',
    'path.empty.body':
      'この帯の単元は現在準備中です。公開までの間は、ロードマップで今後の予定をご確認ください。',
    'path.empty.roadmapLink': 'ロードマップを見る',

    // UI-3 UnitPage (M3)
    'page.unit.descriptionSuffix':
      ' — AI-DLC DOJO の学習単元。読んで、区切りごとのクイズで理解度を確認できます。',
  },
  en: {
    // Reserved (R4). Populated with the SAME key set as `ja`. Empty for R1.
  },
};
