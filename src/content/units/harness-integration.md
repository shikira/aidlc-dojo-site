---
id: harness-integration
title: ハーネス統合 — 各エージェント環境での利用
version: v2
---

AI-DLC は「**one core, many harnesses(ひとつのコア、多くのハーネス)**」という設計で出荷されます。方法論は 1 か所のハーネス中立な `core/` に宿り、各ハーネスは「そのハーネスでどう見せるか」を決める薄い層を足すだけ。この単元では、その考え方と、Claude Code / Kiro / Codex での実行と差異、そして新しいハーネスへの porting(移植)を実践の視点で押さえます。

## one core, many harnesses

v2 は AI-DLC 方法論のネイティブ実装で、**ひとつの source of truth から多くのハーネス**で動きます — 今日は Claude Code・Kiro IDE・Kiro CLI・Codex CLI、そして移植すれば任意の能力あるハーネス。方法論(11 ドメインエキスパートエージェント・32 ステージ・あなたが承認する全ゲート)は 1 か所のハーネス中立な `core/` に一度だけ宿り、各ハーネスがそれをどう見せるかを決める薄い surface を足します。だから方法論の編集は 1 か所で済み、各ハーネスの配布物はそこから**生成**され、どのハーネスも特別扱いされません。

決定的なエンジン — 状態機械・監査ログ・グラフ・swarm レフェリー・学習ゲート — は**すべての配布物でバイト同一**です。違うのは shell(スキル・エージェント設定・フック結線・起動方法)だけです。ハーネスエンジニアの視点では、あなたは `core/` の下でデータ(ルール・ステージ・センサーのチェックコマンド)を編集して振る舞いを形作り、コードには触れません。方法論が _何を(what)_ で、各ハーネス配布物が 1 つのランタイムにとっての _どう(how)_ です。

ソースの形は、ハーネス中立な `core/` と、CLI ごとの薄い `harness/<name>/` surface(manifest・skills・agents・hooks など)の組み合わせです。パッケージャ `scripts/package.ts` が、コミット済みの各 `dist/<harness>/` ツリーを再生成します。`core/` の散文はハーネスディレクトリを `{{HARNESS_DIR}}` トークンで名指しし、パッケージャがマニフェストの宣言する `harnessDir`(`.claude` / `.kiro` / `.codex`)へ置換します。`.ts` は無変換のバイトコピーで、実行時に `core/tools/aidlc-lib.ts` の `harnessDir()` seam が自分のパスからディレクトリ名を導く(ハードコードした一覧ではなく、開いた集合)ため、同じツールソースがどのツリーでも動きます。受け入れゲートは **byte-parity(バイト等価)** — ハーネスを再生成したら、コミット済みの dist が完全に再現できなければなりません(`bun scripts/package.ts --check` が CI のドリフトガード)。パッケージャは `harness/` を走査して `manifest.ts` を見つけることでハーネスを**発見**するので、新ディレクトリはパッケージャ自体を編集せずビルドされます。ユーザーはこの生成物 `dist/<harness>/` を自分のプロジェクトへコピーして使い、メンテナは決して手編集しません。

この設計の実利は「方法論の一貫性」です。フェーズ・ステージ・エージェント・スコープ・承認ゲートといった方法論は全ハーネスで**同一**で、ハーネスごとに違うのはゲートの描画・サブエージェントの起動・どのセッションイベントが発火するか・設定の置き場所といった shell だけです。だから茶帯までに学んだワークフローの知識は、Claude Code で学ぼうと Kiro で学ぼうと、そのまま他のハーネスへ移せます。ハーネス固有の差異が要るときだけ各ハーネス章がそれを表にして呼び出す、という構造になっています。どのハーネスを使っても「同じエンジンが同じ状態機械・監査・グラフを回している」という一点が、この「one core, many harnesses」設計の核心です。

## Claude Code と Kiro での実行

**Claude Code** はユーザーガイドの例が走る基準ハーネスで、`/aidlc` で起動します。インストールは `dist/claude/.claude/` と `dist/claude/aidlc/`(ワークスペースシェル)をプロジェクトへコピーするだけ。ゲートは `AskUserQuestion` ウィジェットで描画され、サブエージェントステージ(2.1・3.5)は `Task` ツールで委譲され、ステータスラインは現ステージ+モデル+コンテキスト % を表示し、セッション開始時に `settings.json` の `companyAnnouncements` からウェルカムメッセージを描画し、5 つの MCP サーバー(`.mcp.json`)を同梱します。

**Kiro**(CLI と IDE)は同じ AI-DLC 方法論を Kiro 上で走らせます。バイト共有のコア(ツール・32 ステージファイル・プロトコル・知識・センサー・スコープ・ルール)は Claude と同一で、shell だけが違います。Kiro CLI は ≥ 2.6 が前提で、`dist/kiro/.kiro` と `dist/kiro/aidlc` と `AGENTS.md` をコピーし、`kiro-cli chat` で起動します。同梱の `.kiro/settings/cli.json` が `chat.defaultAgent: "aidlc"` を設定するので `/aidlc` がそのまま効きます(このワークスペース設定はグローバル既定より優先)。同じ `cli.json` は pinned モデル `claude-opus-4.8` に `xhigh` の推論努力既定も設定し、`/effort <level>`(low|medium|high|xhigh|max)で上書きできます。IDE と CLI の主な違いはフック登録の仕組みで、IDE は `.kiro/hooks/*.kiro.hook` ファイル、CLI はエージェント JSON の `hooks` ブロックを使います。

Kiro での主な差異は shell に集中します — ゲートと質問は `AskUserQuestion` ウィジェットではなく**番号付き散文の選択肢**(数字で返信)で、`[Answer]:` タグを持つ質問ファイルが正本であり続けます。ステータスラインは無く、`/aidlc --status` と各ゲートの進捗行を使います。サブエージェントステージは Kiro の `subagent` ツールが `aidlc-developer-agent` / `aidlc-architect-agent` 設定を呼びます。Construction swarm は subagent ファンアウトのみで、`AIDLC_USE_SWARM=1` は no-op として告知されます。権限は、`aidlc` エージェント設定で `bun .kiro/tools/*` のみが事前承認され、他のシェルコマンドはプロンプトされます。ウェルカムメッセージは無く、セッション開始フックは resume 文脈の注入のみ。セッション監査イベントは、CLI では `SESSION_STARTED` のみ(Kiro に session-end / pre-compaction フックが無いため)、IDE では `SESSION_STARTED` / `SESSION_ENDED`。MCP サーバーは同梱しません。IDE 側はさらにフック登録が `settings.json` の `hooks` ブロックではなく `.kiro/hooks/*.kiro.hook` ファイル方式(Agent Hooks パネルに表示)で、委譲先サブエージェントのツール権限を `.md` frontmatter の `tools:` から読むためパッケージング時にそれを注入します。**状態機械・監査証跡・レコードディレクトリ・学習儀式・センサー・スコープ・深度/テスト戦略は同一**です — なぜなら文字どおり同一のツールが `.kiro/tools/` から走るからです。AI-DLC on Kiro は **Claude Opus 4.8**(有料 Kiro プランが必要)で最も良く動きます。

## Codex CLI での実行

**Codex CLI**(≥ 0.139.0)は OpenAI Codex ハーネス向けの配布物 `dist/codex/` で、`$aidlc`(または `/skills` → aidlc)で起動します。ここでも「one core, many harnesses」— エンジン・状態機械・監査ログ・グラフ・swarm レフェリー・学習ゲートはバイト同一で、shell だけが違います。ツリーは `core/` + `harness/codex/` から `bun scripts/package.ts codex` で**生成**され、手編集は禁止(ドリフトガードが CI を落とします)。

Codex 固有の前提と差異がいくつかあります。まず、プロジェクトは **git リポジトリでなければなりません**(Codex は git 内でのみプロジェクトの `.codex/hooks.json` を見つけます)。次に、Codex は**信頼していないフックを決して走らせません** — 対話 TUI で一度「Trust all and continue」を選ぶか、`bun scripts/package.ts codex trust --project <path>` で決定的に pre-seed します。ゲートは(設定フラグが有効なら)`request_user_input` ツールで描画され、そうでなければ番号付き散文にフォールバックしますが、ゲートの意味論はどちらでもエンジンに宿ります。カスタムステータスラインは無く、位置は `update_plan` ツール(`task-progress` 項目)と `$aidlc --status` に乗ります。

git はサンドボックスの扱いに注意が要ります — `workspace-write` は設計上 `.git` をサンドボックス内で読み取り専用に保ちます。対話セッションは自動でエスカレートし、同梱の `.codex/rules/default.rules` が `git worktree`/`commit`/`add` を事前許可しますが、headless 実行(CI・exec ワーカー)は `writable_roots = ["<main repo>/.git"]` が要ります。swarm の floor は **`codex exec` ワーカー**(Construction ユニットごとに 1 つの headless ワーカーを Bolt worktree 内で `< /dev/null` で走らせる)で、`AIDLC_USE_SWARM=1` はここでも Workflow ツールが無いため loud-degrade します。セッションライフサイクルでは、Codex に SessionEnd イベントが無いため、閉じられていないセッションは次回開始時に推定 `SESSION_ENDED` 監査行として整合されます。一方、Codex 固有の PostCompact イベントはコンパクション後にワークフローのミッションを再注入する — Claude ハーネスに対する決定論の**改善**点です。headless `codex exec` ではモデルがシェルの heredoc でファイルを書きがちで `apply_patch` フックマッチャを回避するため、`ARTIFACT_*` 行が疎になることがあり、対話 TUI が高忠実度の監査モードです。AIDLC のルール層はワークスペースルートの `aidlc/spaces/<space>/memory/`(全ハーネス同一の単一ソース)にあり、`config.toml` の `AIDLC_RULES_DIR` seam がリゾルバをそこへ向けます。Codex ネイティブの `.codex/rules/` は Starlark の権限ルールで、AIDLC の手法とは別物です。既定のモデルプロバイダは Amazon Bedrock で、MCP サーバーは既定でゼロを同梱します。

再生成は `bun scripts/package.ts codex`(`core/` + `harness/codex/` から `dist/codex` を作る)で、`--check` が全ハーネスの CI ドリフトガードです。コアの `.ts` ファイルは `core/tools/` と `core/hooks/` のソースとバイト同一で(テストで固定)、散文だけがパッケージャの置換するトークン `{{HARNESS_DIR}}`(と `rules/` → `aidlc-rules/` のリネーム)を持ちます — これが許される唯一の変換クラスです。三つのハーネス(Claude・Kiro・Codex)は起動方法(`/aidlc` か `$aidlc` か)・ゲートの描画・フックの結線・同梱 MCP の数こそ違え、状態機械・監査・グラフ・swarm レフェリー・学習ゲートという決定的な中身は文字どおり同一である、というのがこの節の要点です。だからこそ、あるハーネスで書いた `aidlc/` ワークスペースはハーネス中立で、プロジェクトをハーネス間で移す(あるいは並行して走らせる)ことも原理的に可能です(supported-but-untested)。`/aidlc --doctor` は、アクティブなワークフローがあるのに競合するハーネス構成を検出したら警告します。

## 新しいハーネスへの porting

新しいハーネスを足すのは、**1 ディレクトリと 1 マニフェスト行**です — エンジン・方法論・ハーネスディレクトリ/ルール解決は `core/` の編集を一切要しません(唯一の任意例外は per-harness の `--doctor` アーム)。移植の中身は概ね次の段です。

**Step 1 — マニフェスト**(宣言的な 8 割): `harness/<name>/manifest.ts` が `HarnessManifest` をエクスポートし、`name` / `harnessDir`(トークンが置換される先)、どの `core/<src>` を `<harnessDir>/<dst>` へ投影するかの `coreDirs`(Kiro は `rules → steering`、Codex は `rules → aidlc-rules` にリネームし `skills/` を落とす)、手書き surface を verbatim コピーする `harnessFiles`、コア投影 `.md` に per-file の frontmatter 行を足す `frontmatterAdditions`、ルールディレクトリのリネーム `rulesRename`(`steering` / `aidlc-rules` / `null`)などを宣言します。`rulesRename` はコピー先ディレクトリ・散文中の参照・コンパイル済みグラフのルールパス・実行時の `rulesSubdir()` seam のすべてに波及するので、ここに設定するだけで各層(ビルド散文・コンパイル済みパス・実行時)が追随し、`core/` 編集は不要です。

**Step 2 — フックアダプター**(per-harness のシム): コアフックは Claude 形の stdin を正規形として消費するため、新ハーネスは手書きアダプター 1 つ(`harness/<name>/hooks/aidlc-<name>-adapter.ts`)を出荷し、そのハーネスのフックペイロードをその契約へ正規化してコアフックへサブプロセスでパイプします。コアフックを logic+adapter に分割してはいけません — コア本体は全ハーネスでバイト共有のままです(`--check` がそれを証明)。アダプターはハーネス自身の流儀でイベントに結線します — Kiro は `agents/aidlc.json` にターゲットを登録し、Codex は `hooks.json` を emit します。実際のコア消費者があるイベントだけを登録します。ここが唯一許される `core/` 編集 — `--doctor` アーム — の場所でもあります。新ハーネスは自分のインストール surface(アダプターと結線ファイルの存在、バイナリのバージョン下限)を確認するアームを `core/tools/aidlc-utility.ts` に足します。これは決定的なマニフェスト行では表せない「知識はコードに宿る」判断(semver 比較のために CLI を起動する等)なので、ゼロ `core/` 編集への祝福された例外です。アームが無くても generic なチェックにフォールバックするだけで壊れません。

**Step 3 — `emit.ts`**(命令的な 2 割、必要なときだけ): 宣言的な行で表せない構造的なズレを吸収するプラグインです。Codex がその実例で、`config.toml`・`hooks.json`・フック信頼の pre-seed・`AGENTS.md` マージ・エージェント TOML の転置・`.agents/skills/` ツリー(`core/tools/aidlc-runner-gen.ts` の render 関数から合成、再実装しない)を書きます。surface がすべて手書きファイルの Claude や Kiro は `emit: null` です。`emit` は `ctx.check` を尊重し、`--check` 下では出力を diff して問題を返すので、`<harnessDir>` 外(`.agents/skills/`・ルートの `AGENTS.md`)のファイルもドリフトガードが覆います。

**Step 4 — 唯一許される変換クラス**は、スラッシュで区切られた `{{HARNESS_DIR}}` 系(散文中のハーネスディレクトリ+ルールディレクトリのリネーム)だけ。無差別な `sed` は禁止で、コア衛生テスト(`t146`)が新しい生のパスリテラルの混入を防ぎます。`core/` にある真実のハーネス固有リテラル(`$CLAUDE_PROJECT_DIR` の注記など)はトークンを持たずそのまま通ります。**Step 5 — テストとゲート**では、パッケージング等価テスト(`t145` が `package.ts --check`)がマニフェストを持つ全ハーネスを自動でカバーし、`<name>` フックアダプター契約テスト(ライブ捕捉ペイロードをアダプターに通してコアフック効果を検証)と、`AIDLC_<NAME>_*_LIVE=1` でゲートされるライブジャーニー e2e(そのバイナリとログイン済みセッションが無ければクリーンにスキップ)が加わります。受け入れの要は一貫して byte-parity — 生成物がコミット済み dist を完全再現することです。こうして「データ表面を形作り、コアを新しい CLI へレンダリングする」という移植の弧が閉じます。移植のほとんどは 1 つのディレクトリと 1 つのマニフェスト行で済み、共有コードの編集はゼロ、という設計が、ハーネスの集合を開いたまま growable に保っています。
