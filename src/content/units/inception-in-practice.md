---
id: inception-in-practice
title: Inception 実践 — 要件からユニット分解へ
version: v2
---

セットアップと最初のインテントが済んだら、次はワークフローの中核 **Inception フェーズ**です。Inception は Ideation で固めたビジネス上の意図とスコープを、具体的な技術成果物へと精緻化する段です — 要件、ユーザーストーリー、アプリケーション設計、そして Construction を駆動するユニット分解と配送計画。この単元では v2 の Inception(2.1〜2.8)を、要件分析からユニット生成まで実践の視点でたどります。

## Inception フェーズの全体像

Inception は 5 フェーズの 3 番目で、ステージ 2.1 から 2.8 の 8 ステージから成り、末尾の 2.8 Delivery Planning でフェーズ境界検証を行って Construction へ引き継ぎます。並びは、2.1 Reverse Engineering、2.2 Practices Discovery、2.3 Requirements Analysis、2.4 User Stories、2.5 Refined Mockups、2.6 Application Design、2.7 Units Generation、2.8 Delivery Planning です。

各ステージには実行条件(Condition)があり、スコープに応じて走る/飛ばすが決まります。**ALWAYS** で必ず走るのは 2.3 Requirements Analysis・2.7 Units Generation・2.8 Delivery Planning の 3 つ。残りは **CONDITIONAL** です。スコープ別に見ると、enterprise・feature・workshop は 2.1〜2.8 をフルに、mvp は UI があれば 2.5 も含めてほぼ全ステージ、poc は 2.1(brownfield なら)と 2.3(minimal)だけ、bugfix / refactor / security-patch は 2.1(常に — バグや脆弱性の文脈把握)と 2.3(minimal)、infra は 2.2 と 2.3、という具合に絞られます。

とりわけ **2.1 Reverse Engineering は brownfield(既存コードベース)のときのみ**実行され、二段構えのサブエージェントとして走ります — まず `aidlc-developer-agent` がコードベース全体(パッケージ・ビルドシステム・API・フレームワーク・テスト・技術的負債の兆候)をスキャンし、次に `aidlc-architect-agent` がそのスキャンを 9 個の構造化成果物へ統合します。9 成果物とは business-overview・architecture(相互作用ダイアグラム必須)・code-structure・api-documentation・component-inventory・technology-stack・dependencies・code-quality-assessment・reverse-engineering-timestamp です。このステージは brownfield では鮮度確保のため**常に再実行**され、その 9 成果物が 2.3・2.4・2.6・2.7 に消費されます。毎回スキャンし直すのは、成果物が古いスナップショットではなく現在のコードの状態を映すためで、bugfix・refactor・security-patch でも「既存コードの理解が不可欠」という理由から必ず走ります。architecture.md には、ビジネストランザクションがコンポーネント横断でどう実装されるかを示す相互作用ダイアグラム(シーケンス/フロー図)を含めることが求められます。

Inception を特徴づけるもう一つの段が **2.2 Practices Discovery** です。これは AI-DLC で唯一「二軸設定モデルの両方の行に書き込む」ステージで、チームのブランチ戦略・ウォーキングスケルトンの姿勢・テスト方針・デプロイ頻度・コードスタイルを、brownfield では 4 エージェント(pipeline-deploy / quality / developer / devsecops)の並列 Task による証拠スキャンから、greenfield では `org.md` の既定を使った質問から引き出します。ドラフト(team-practices.md・discovered-rules.md・evidence.md)を作り、**affirmation(是認)ゲート**で承認された内容を `aidlc/spaces/<space>/memory/team.md`(セクション置換=再実行で上書き)と `memory/project.md`(見出し下に追記=ルールが累積)へ**昇格**させます。この人間の是認こそが、フレームワークがチームの口に言葉を入れる(=勝手にハーネス設定を書き換える)ことを正当化する仕組みです。すべてのステージは `stage-protocol.md` に従い、承認ゲート・質問形式・完了メッセージ・状態追跡の型を共有し、成果物はインテントのレコードディレクトリ `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` の下に保存されます。

実行モードで言えば、Inception は混在です。2.1 Reverse Engineering は二段のサブエージェント委譲、2.2 Practices Discovery は brownfield で 4 エージェントの並列 Task ディスパッチを伴う inline、残りの 2.3〜2.8 は inline(会話の中でエージェントが働き、末尾に承認ゲート)です。そしてフェーズの入口(Ideation → Inception)と出口(Inception → Construction)には**フェーズ境界検証**が走り、要件がストーリーへ、ストーリーがアーキテクチャへと辿れるか、孤立した成果物や欠けた参照が無いかを自動でチェックします。検証が失敗すれば、コンダクターは問題を報告し、先へ進むか戻って直すかを尋ねます。この「各ステージのゲート+フェーズ境界の検証」の二層が、Inception の成果物の追跡可能性を担保します。

## Requirements Analysis とアダプティブ深度

**2.3 Requirements Analysis**(リード: aidlc-product-agent)は ALWAYS 実行ですが、その**深度が複雑さに応じて伸縮**するのが要点です。ステージはまず要求を「明瞭さ・種別(新機能/拡張/リファクタ/バグ修正/移行)・スコープ(単一/複数/システム全体)・複雑さ」で評価し、深度を決めます — 明確で狭いものは **Minimal**、中程度は **Standard**、大規模で未知が多いものは **Comprehensive**。bugfix や poc は minimal、feature は standard、enterprise は comprehensive、というのが目安です。

次に、既知の情報(明示された機能要件・暗黙の非機能要件・制約・前提・ビジネス文脈)を整理したうえで、**6 次元の完全性分析**を行います — ①機能要件、②非機能要件(性能・セキュリティ・スケーラビリティ・信頼性)、③ユーザーシナリオ(ワークフロー・エッジケース・エラー)、④ビジネス文脈(ゴール・成功指標・ステークホルダー)、⑤技術文脈(統合点・プラットフォーム・技術制約)、⑥品質特性(保守性・テスト容易性・アクセシビリティ・ユーザビリティ)。各次元でギャップを洗い出し、埋まっていない次元が明確化質問の対象になります。

このステージが厳格なのは**質問と回答の扱い**です。要件が 6 次元すべてで例外的に明確でない限り、常に明確化のための質問を生成します。質問ファイル `requirements-analysis-questions.md` は `[Answer]:` タグ形式で、各質問には A〜E の選択肢と、最後に必ず `X. Other (please specify)` が付きます。回答収集では Tri-Mode(Guide Me / Edit File / Chat)を提示します。

回収後は**必須の曖昧さ検出**が走ります — 「mix of」「not sure」「depends」「probably」「maybe」といった曖昧な語をスキャンし、回答間の矛盾や不足を洗います。**部分的・曖昧な回答のまま先へは進みません**。曖昧さや矛盾が一つでもあれば追加質問を作って解消します。「迷ったら尋ねる(When in doubt, ask)」が徹底されています。これはワークフローで最も詳細な質問・回答のステージであり、部分的・曖昧な回答のまま進むことを構造的に拒む点が特徴です。bugfix スコープではバグ記述を minimal 深度で、infra スコープではインフラ要件を捉えます。最終的に `requirements.md`(意図分析=ゴール/機能でなく何を達成したいか・機能/非機能要件・制約・前提・スコープ外・未解決の問い)が生まれます。承認ゲートは、User Stories が SKIP 設定なら 3 択(Approve / Request Changes / Add User Stories — 現在スキップ中の User Stories を呼び戻す)、そうでなければ標準の 2 択です。この「スキップされたステージをゲートで呼び戻せる」条件付き 3 択は、Ideation・Inception フェーズに特有のもので、Construction・Operation では No Emergent Behavior の原則から常に 2 択に固定されます。ここで生まれた要件は 2.4・2.5・2.6・2.7・2.8 のすべてに消費される、Inception の背骨です。

## User Stories とペルソナ

**2.4 User Stories**(リード: aidlc-product-agent、支援: aidlc-design-agent)は CONDITIONAL で、ユーザー向け機能・複数ペルソナ・複雑なビジネスロジック・チーム横断作業のときに実行し、純粋なリファクタリング・孤立したバグ修正・インフラのみ・開発者ツールのときは飛ばします。飛ばす場合でも判断根拠を記した `user-stories-assessment.md` は必ず残します。なお aidlc-design-agent の支援は上流リファレンスに無い意図的な追加(UX に配慮した開発のため)で、SKILL.md の Deliberate Deviations に記録されています。

このステージは**二部構成**です。PART 1(計画)で、ペルソナ開発の方針、**INVEST** 基準(Independent / Negotiable / Valuable / Estimable / Small / Testable)によるストーリー形式、**MoSCoW**(Must Have / Should Have / Could Have / Won't Have)による優先度、分解アプローチ(機能別・ペルソナ別・ワークフロー別・ドメイン別・エピック別)を `[Answer]:` タグ形式の質問で確認します。ここでも必須の曖昧さ分析が走り、矛盾や不足があれば追加質問で解消します。計画の要約(ペルソナ数・ストーリー数・分解アプローチ)を提示したら、そのまま PART 2 へ進みます。

PART 2(生成)で、承認された計画に基づき `personas.md`(ペルソナ定義=名前・役割・ゴール・痛み・文脈、関係、優先順位)と `stories.md` を生成します。ストーリーは「As a [ペルソナ], I want [目標], so that [便益]」の標準形式で、各ストーリーに受け入れ基準・優先度・依存関係・INVEST 準拠の注記を添えます。計画と生成物は完了ゲートでまとめてレビューされ、承認は標準の 2 択です。この二部構成(計画してから生成)により、ストーリーが書かれる前にあなたが分解アプローチへ影響を与えられます。スキップ条件(純粋なリファクタリング・孤立したバグ修正・インフラのみ・開発者ツール)に当たる場合でも、`user-stories-assessment.md` に決定・根拠・考慮した要素・代替のカバー範囲を記して、なぜ飛ばしたかを必ず残します。

重要なのは、MoSCoW の優先度はあくまで **MVP 境界に情報を与える**だけで、境界そのものを決めないという点です。正式な MVP 境界は **2.8 Delivery Planning** で決まります。また、生成前にユーザーがフィードバックを差し込んだら、それはリビジョン要求として扱われ、計画を更新してから生成を続けます。ここで作られたストーリーは、Refined Mockups(2.5)・Application Design(2.6)・Units Generation(2.7)・Delivery Planning(2.8)へと流れていきます。ちなみに 2.5 Refined Mockups は非 UI(API のみ・インフラのみ)の場合、相互作用ダイアグラムを API 開発者体験仕様へ精緻化する形で走り、1.6 Rough Mockups が飛ばされていれば通常このステージも飛ばされます。UI ありのプロジェクトでは、各ユーザーストーリーをどう画面に表すか、必要な相互作用パターン(モーダル・インライン編集・ウィザード・段階的開示)、各画面が扱う状態(ローディング・空・エラー・成功・部分)、既存デザインシステムとの整合、アクセシビリティ(WCAG レベル)、レスポンシブのブレークポイントを問い、mockups・interaction-spec・accessibility-checklist などを生みます。こうして 2.4・2.5 はユーザー視点の what/why を固め、次の 2.6・2.7 が how の技術設計と分解へ橋渡しします。

## Units Generation とユニット分解

ユニット分解の前段が **2.6 Application Design**(リード: aidlc-architect-agent)です。ここではコンポーネント境界・インターフェイス・サービス定義・通信パターン・依存関係を定め、5 つの成果物(components.md・component-methods.md・services.md・component-dependency.md、そして意図的追加である ADR 集 `decisions.md` — Context・Decision・Consequences・Alternatives Considered を含む)を生みます。

その設計を受けて走るのが **2.7 Units Generation**(リード: aidlc-architect-agent、支援: aidlc-delivery-agent)で、ALWAYS 実行、Inception の設計作業と Construction の実装作業を橋渡しする決定的に重要なステージです。アプリケーション設計を、独立して実装可能な **Unit of Work(ユニット)** — サービス・モジュール・デプロイ可能なコンポーネント — へ分解します。

このステージが生む 3 つの成果物のうち中核が、依存 DAG を記す `unit-of-work-dependency.md` です。ここで押さえるべき役割分担があります — **2.7 は依存 DAG(トポロジー)を作り、2.8 がその中の経済的な経路(Bolt の並び)を選ぶ**。したがって 2.7 は実装順やクリティカルパスを推奨してはならず、それらは 2.8 の経済的シーケンシングの決定です。質問でも「value-first / risk-first / walking-skeleton-first といった実装順の優先度」は尋ねません — それは 2.8 の領分です。

2.4 や 2.6 と同様、2.7 も**二部構成**です。PART 1 では、ユニット境界の戦略(サービス別・機能別・ドメイン別・デプロイ対象別)、粒度(粗いか細かいか)、依存順序の好み(厳密なトポロジカルのみか、独立ユニット間の並列を許すか)、ユニット間の契約(API・共有データ・イベント)、デプロイモデルを `[Answer]:` タグで確認し、必須の曖昧さ分析のあと計画承認(Approve Plan / Revise Plan)を取ります。この計画承認を挟むことで、ユニットが書かれる前に分解アプローチへあなたが影響を与えられます。PART 2 では、承認された計画に基づき `unit-of-work.md`・`unit-of-work-dependency.md`(DAG)・`unit-of-work-story-map.md`(全ストーリーがユニットに割り当てられていることを保証)を生成します。story map があることで、どのユーザーストーリーも「どのユニットで実装されるか」が明示され、トレーサビリティが途切れません。

Inception の締めが **2.8 Delivery Planning**(リード: aidlc-delivery-agent)で、`bolt-plan.md`(Bolt の並び+ウォーキングスケルトンの印)などを生み、`memory/team.md` の Way of Working(ブランチ)・Walking Skeleton の姿勢・Deployment セクションを読みます。ここで正式な MVP 境界と Bolt シーケンスが決まり、フェーズ境界検証(要件→ストーリー→アーキテクチャの整合)を経て Construction へ渡ります。

2.7 と 2.8 の役割分担をもう一度整理すると、**2.7 はトポロジー(何が何に依存するか)を作り、2.8 はその中の経済的な経路(どの順で、どこを walking skeleton にするか)を選ぶ**、という補完関係です。2.8 は `bolt-plan.md` のほか、チーム配分や、リスクとシーケンシングの根拠、外部依存マップといった成果物を伴い、Construction の実行計画そのものになります。ここで生まれたユニットと依存構造が、次フェーズ Construction の姿を決めます — 1 つ以上のユニットが束ねられて **Bolt** になり、依存 DAG の中でどのユニットが並列に走れるかが決まります。ユニット分解の質が、Construction の並列度と進めやすさを直接左右する — これが茶帯で 2.7 を重視する理由です。

そして Inception から Construction へ渡る境界(2.8 → 3.1)には**フェーズ境界検証**が置かれ、要件がストーリーへ、ストーリーがアーキテクチャコンポーネントへと辿れるか、孤立した成果物や欠けたリンクが無いかを自動でチェックします。検証が通って初めて Construction が始まります。Inception を一言でまとめれば、「意図とスコープ」という粗い入力を、「要件 → ストーリー → 設計 → ユニット → 配送計画」という追跡可能な連鎖へと精緻化し、各ステージのゲートとフェーズ境界の検証で品質を担保する段だと言えます。次単元では、この計画がどう Bolt となって回るのかを見ていきます。
