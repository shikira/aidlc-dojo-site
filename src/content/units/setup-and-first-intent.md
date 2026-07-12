---
id: setup-and-first-intent
title: セットアップと最初のインテント
version: v2
---

白帯では AI-DLC の思想を学びました。茶帯はここから手を動かします。この単元では、v2 実装を自分の環境に入れ、`/aidlc` を起動し、最初のインテント(Intent)を誕生させて Intent Capture の承認ゲートに至るまでを、公式ドキュメントに沿ってたどります。以降の茶帯単元(Inception 実践・Construction 実践・ステアリング・ハーネス)は、すべてここで作った「動く環境」を前提にします。

## 前提ツールとインストール、Bedrock 設定と --doctor

v2 実装(Claude Code ハーネス)を動かすのに必要なツールは 2 つだけです。ひとつは **Claude Code** — オーケストレーター・エージェント・フックはすべてこの中で動きます。もうひとつは **bun** — 11 個すべてのフックと CLI ツール(状態管理・監査ログ・センサー発火・ランタイムグラフのコンパイル・ループ強制・ステータスライン・human-turn mint など)が TypeScript で書かれ、bun 経由(起動およそ 20ms)で実行されます。追加の依存はなく、macOS・Linux・ネイティブ Windows PowerShell で同一に動きます。

インストールで最初につまずきやすいのが **PATH** です。Claude Code はあなたのシェルを非対話的に起動するため、`~/.zshrc` ではなく `~/.zshenv`(zsh)または `~/.bashrc`(bash)を読み込みます。ターミナルでは `which bun` が通るのにフックが bun を見つけられないときは、bun の PATH エクスポートをこれらのファイルへ書き写してください。前提が揃っているかは次のように確認できます。

```bash
command -v claude >/dev/null && echo "✓ Claude Code" || echo "✗ Claude Code"
command -v bun    >/dev/null && echo "✓ bun"          || echo "✗ bun"
```

インストールに **scaffold(足場作り)ステップはありません**。配布物をプロジェクトへコピーするだけです。Claude Code なら `dist/claude/.claude/`(エンジン=オーケストレーター・ステージ定義・エージェントペルソナ・フック・既定設定)と `dist/claude/aidlc/`(**ワークスペースシェル** — チームの手法が宿る `aidlc/spaces/default/memory/` を含む)をプロジェクト直下へ置きます。ワークスペースシェルは `.claude/` の**兄弟**であって内側ではないため、別々にコピーする(あるいは `dist/claude/` ごとまとめてコピーする)必要があります。これを忘れると `--doctor` の「workspace shell ready」チェックが落ちます。`init` のような初期化コマンドは存在せず、最初に `/aidlc` を実行したときにエンジンが最初のインテントを **auto-birth(自動誕生)** させます。同梱の `.claude/settings.json` は Claude Code のツール(Read・Edit・Write・Bash・Glob・Grep・Task・WebSearch)を事前承認しているので、呼び出しごとの許可プロンプトなしにワークフローが走ります。利用前にこのファイルを確認し、自分のセキュリティ要件に合わせて調整してください。

v2 実装は **AWS Bedrock** 向けに設定済みで出荷されます。同梱の `.claude/settings.json` が `CLAUDE_CODE_USE_BEDROCK=1`、`AWS_REGION=us-east-1`(Bedrock はこのリージョンを `~/.aws` からは読まないため必須)、そしてオーケストレーター用 Opus・サブエージェント用 Sonnet などのモデルピン(global 推論プロファイル ID)を設定します。AWS アカウント側では一度だけ準備が要ります — Bedrock コンソールの Model catalog で Anthropic モデルのアクセスを有効化し(即時付与)、`bedrock:InvokeModel` や `bedrock:GetInferenceProfile` などを許可する IAM 権限を付与し、既定の AWS 認証情報チェーン(`aws configure` / SSO / 環境変数)を通します。秘密情報は共有の `settings.json` ではなく gitignore 済みの `.claude/settings.local.json` に置きます(`settings.local.json` が `settings.json` に優先)。より簡単な道として、`claude` を起動してログイン画面で「3rd-party platform → Amazon Bedrock」を選ぶと、ウィザードが認証情報・リージョン・利用可能モデルを検出して書き込んでくれます。5 つの MCP サーバー(`context7` と 4 つの AWS サーバー)は `.mcp.json` で宣言されますが**任意**で、4 つの AWS サーバーは `uvx` 経由で起動し、`context7` は `CONTEXT7_API_KEY` を要します。認証情報が無いサーバーは単に「利用不可」になるだけで、ワークフローが止まって待つことはありません。

設定が整ったら健全性チェックで確認します。

```
/aidlc --doctor
```

`--doctor` は全チェック通過で終了コード 0、いずれか失敗で 1 を返し、どちらの場合も完全なレポートを標準出力へ書きます。チェック項目には、前提ツール(bun が PATH 上にあるか)、フックの存在(`settings.json` が結線する全 11 フックが `.claude/hooks/` にあるか)、プロジェクト構造、ワークスペースシェルの有無、状態ファイルと監査証跡のドリフト、フックのハートビート、グラフの循環検出、9 スコープの検証、スキーマと参照の解決、キーワード重複などが含まれます。失敗時はレポートが原因のアーティファクト・スラッグ・スコープ名を名指しするので、そこから修復します。

典型的な出力は次のような一連のチェック行です。

```
✓ bun installed (required for CLI tools and hooks)
✓ settings.json present
✓ workspace shell ready (.claude/ + aidlc/spaces/default/memory/)
✓ State matches last audit event (no drift)
✓ Cycle detection: 0 cycles
✓ Schema validation: 32/32 stages valid
✓ Keyword overlap: no conflicts
```

よくある失敗と対処も決まっています — bun 未インストールなら PATH を含めて入れ直す、フックが無ければ `.claude/` を配布物から再コピー、`settings.json` が無ければ再コピー、ワークスペースシェルが無ければ `dist/claude/` から兄弟としてコピー、状態ファイルの問題ならアクティブなインテントのレコードディレクトリをアーカイブして `/aidlc` で作り直す、という具合です。`--doctor` が緑になって初めて、最初のワークフローを走らせる準備が整います。

## 最初のワークフローを起動する

`--doctor` が通れば準備完了です。作りたいものを自由記述で渡すか、スコープを直接指定して起動します。

```
/aidlc Build a REST API for inventory management
/aidlc feature
/aidlc bugfix Fix the login timeout issue
```

セッション開始時、Claude Code は `settings.json` の `companyAnnouncements` から AI-DLC のウェルカムメッセージを描画します。「You decide, AI executes(あなたが決め、AI が実行する)」「Adaptive scope」「Traceable artifacts」「11 domain experts」といった仕組みの要約と、ステージマップ・スコープ選択肢が示されます(これはステージではなく、セッション開始時に一度だけ出るメッセージです)。

その直後に走るのが **Initialization フェーズ(0.1〜0.3)** です。この 3 ステージは決定的で、`aidlc-utility init` という単一のツール呼び出しの中で 1 秒未満に完了します。承認ゲートはなく、LLM サブエージェントの委譲もなく、あなたが関与する場面もありません。0.1 Workspace Scaffold が最初のインテントを誕生させてレコードディレクトリを作り、0.2 Workspace Detection がルールベースのスキャナ(`src/`・`app/`・`lib/` などを 1 階層スキャンし、ファイル拡張子・フレームワーク設定・パッケージマニフェストで判定)で greenfield / brownfield を分類し、0.3 State Initialization が `aidlc-state.md` にスコープ・深度・テスト戦略・分類に基づく完全なステージ計画を書きます。ここでスコープの確認だけは対話的に提示されます。

```
─── Scope Detection ───────────────────────────────
Detected scope: feature (Standard depth, Standard test strategy, all 32 stages)
▸ Approve scope? [Yes / Change scope / Change depth / Change test strategy]
```

検出されたスコープをそのまま承認しても、別のスコープ(例: `mvp`)へ変えても、深度やテスト戦略を調整してもかまいません。Initialization を過ぎると、以降のステージはすべて承認ゲート付きで対話的に進みます。

ワークフロー全体を通じて、実行モードは 2 つです。ほとんどのステージは **inline(インライン)** — コンダクターがエージェントペルソナと知識を読み込み、あなたの会話の中で直接ステージ手順を実行し、リアルタイムでやり取りします。一方、2 つのステージ(2.1 Reverse Engineering と 3.5 Code Generation)は **subagent(サブエージェント)委譲** — コンダクターが `Task` ツールでバックグラウンドのサブプロセスへ委ね、実行中あなたは関与せず、構造化サマリが返ってきてから承認ゲートに応じます。Ideation では Intent Capture のあと、Market Research・Feasibility・Scope Definition・Team Formation・Rough Mockups・Approval & Handoff と続き、それぞれ「エージェントが働く → あなたがレビュー → 承認」の同じ型で進みます。スコープによってスキップされる条件付きステージは、理由が示されて自動で先へ進みます。

## Intent の auto-birth とワークスペースの構造

**インテント**は AI-DLC ライフサイクルの 1 回の実行=ひとつの作業単位です。あなたが特別な作成コマンドを打つことはありません。最初に作業内容を記述した瞬間、エンジンがインテントを **auto-birth** します。新しいワークスペースでは、これによりインテントが鋳造され、`aidlc/spaces/default/intents/<YYMMDD>-<label>/` にレコードディレクトリが作られ、それがアクティブなインテントになって最初のステージが始まります。`<YYMMDD>` は時系列に並ぶ UTC 日付、`<label>` は短いケバブケース名です。衝突しない正式な識別子は、ディレクトリ名ではなくレジストリ `intents.json` の行(`{uuid, slug, dirName, scope, repos, status}`)が持つ **UUIDv7** です。レコードディレクトリは `aidlc-state.md`(このインテントのワークフロー状態)、`audit/`(per-clone シャードで書かれる監査証跡)、そして `<phase>/<stage>/...`(ステージ成果物)を保持します。

既にインテントが進行中のときに無関係な作業を記述すると、AI-DLC はそれを新規作業と認識し、2 つ目のインテントを始めるか**尋ねます**(勝手には作りません)。

```
▸ This looks like new work, separate from "inventory-api". Start a second intent?
  (1) Yes — start a second intent (scope: bugfix)
  (2) No — this continues the inventory-api work
```

**Yes** なら 2 つ目のインテントを誕生させて切り替え、元のインテントは状態も進捗もそのまま保たれます。**No** ならメッセージをアクティブなインテントの一部として扱います。ゲートへの回答や要件の修正のような継続はアクティブなインテントに留まり、明確に別物のときだけ提案が現れます。`/aidlc intent` で一覧、`/aidlc intent <slug>` で切り替えれば、任意個のインテントを並行して持ち、止まった場所から再開できます。

インテントを束ねる器が **Space(スペース)** です。スペースは 1 チームの世界そのもので、`memory/`(手法)・`knowledge/`(ドメイン知識)・`codekb/`(コード知識)・`intents/`(記録)を持ちます。ほとんどの人は `default` という単一スペースだけを使い、スペースを意識しません。複数チームが 1 プロジェクトを共有する場合にだけ、同じ形の `spaces/<name>/` を隣に足します(`/aidlc space` で一覧、`/aidlc space-create <name>` で作成、`/aidlc space <name>` で切り替え)。新しいスペースはフレームワーク既定の手法(`org.md`)と空の `team.md` / `project.md` から始まります。`aidlc/` ディレクトリは git にコミットされてチームで共有されますが、`active-space` と `active-intent` という 2 つのカーソル(「いま自分がどこにいるか」)は per-user で gitignore されます — 派生・機械ローカルなランタイム状態も同様です。コードリポジトリはワークスペースの兄弟として置かれるため、1 つのインテントが複数リポジトリにまたがることもでき、リポジトリ集合はインテント誕生時に自動発見されて記録されます。

コミットとローカルの線引きを覚えておくと混乱しません。**コミットされる**のは、スペース配下の `memory/**`(手法)・`knowledge/**`・`codekb/**`・`intents.json`(レジストリ)・各レコードの `aidlc-state.md`・`audit/` シャード・成果物 — チームが作業を共有するためです。**gitignore される**のは、`active-space` と `active-intent`(カーソル。コミットすると毎回ツリーが汚れ、切り替えのたびに取り合いになる)、そして `runtime-graph.json` や `.aidlc-*` のような派生・機械ローカルなランタイム状態です。合言葉は「カーソルとランタイムのスクラッチはローカル、共有される作業はコミット」。この設計のおかげで、監査シャードが per-clone(`<host>-<clone>.md`)で書かれ、並行実行しても git 衝突を起こさずに証跡が積み上がります。

## Stage 1.1 Intent Capture と承認ゲート

Initialization の次は Ideation フェーズに入り、その先頭が **Stage 1.1 Intent Capture & Framing**(リード: aidlc-product-agent)です。ここからは各ステージが承認ゲート付きで対話的に走ります。ターミナル下部のステータスラインは現在地を示します。

```
[AIDLC] IDEATION > Intent Capture [▓▓▓▓▓░░░░░] 4/7 -- product
```

これは左から、現在のフェーズ、ステージ表示名、フェーズ進捗バー(10 文字)、フェーズ内の進捗比、リードエージェントを表します。バーと比率は同じスコープを数える(現フェーズ内の `[x]` ステージ)ので、比率が進むたびにバーも進みます。右端には残りコンテキスト(`ctx:N%`)が常に色付きで表示されます。

エージェントはまず対話モード(Tri-Mode)を尋ねます — **Guide Me**(構造化質問で一問ずつ導く)・**Edit File**(成果物を直接編集)・**Chat**(自由対話でエージェントが決定を抽出)。詳細は白帯の「AIが実行し人間が監督する」で学んだとおりで、どれを選んでも回答は「質問ファイル」という一つの正本に収束し、ステージ途中でモードを切り替えても進捗は失われません。

エージェントの作業が終わると、完了サマリと承認ゲートが提示されます。Intent Capture では `intent-capture.md`(問題文・対象ユーザー・成功基準)と `intent-capture-questions.md`(5 つの質問とその回答)がレコードディレクトリに生まれます。この「質問と回答を成果物として残す」ことこそが、行き当たりばったりのプロンプト対話との決定的な違いで、後からどのモードで何を尋ね、あなたがどう答えたかを追跡できます。

```
# Intent Capture & Framing Complete

▸ How would you like to proceed?
  (1) Approve — Continue to Market Research
  (2) Request Changes — Provide revision feedback
```

**Approve** を選ぶとステージが完了として印され、`aidlc-state.md` が更新され、進捗行が表示されて次へ進みます。

```
Progress: 4/32 overall | 1/7 IDEATION stages complete. Next: Market Research
```

**Request Changes** を選べば、具体的なフィードバックを渡してエージェントが修正し、ゲートを再提示します。`feature` スコープのワークフローを最後まで走らせると、レコードディレクトリには `aidlc-state.md`・`audit/`・`ideation/`・`inception/`・`construction/`・`operation/`・`verification/` が揃い、チーム知識は 1 階層上のスペースレベル `aidlc/spaces/<space>/knowledge/` にインテントを越えて蓄積されます。ここまでで、環境構築 → 起動 → インテント誕生 → 最初のステージの承認、という茶帯実践の土台が一巡しました。次単元からは、この流れの先にある Inception と Construction を掘り下げます。
