# 単元の追加ガイド(30分で1単元)

このガイドは AI-DLC DOJO に新しい**単元(unit)**を追加する手順です。スキーマ
(CT-1〜4)と品質ゲート(BV-1〜5)が構造の正しさを保証するので、書き手は
**コンテンツそのものだけ**に集中できます。所要時間の目安は合計**約30分**です
(NFR-6)。

> 前提: リポジトリを clone 済みで、`npm ci` を実行済みであること。Node は 20 以上。

---

## 全体像

コンテンツは次のレイアウトで管理されます(単元は自分の所属パスを**知りません** —
紐付けはパス側の `unitIds` が唯一の正です)。

```
src/content/
  units/{unit-id}.md      # 本文(h2 セクション)+ frontmatter {id, title, version}
  paths/{belt}.yaml       # 学習パス定義 {belt, nameJa, nameEn, audience, unitIds[]}
  questions/{belt}.yaml   # 帯ごとの問題プール(1ファイルに配列)
  articles/{slug}.md      # 記事(任意)
```

`version` は `v1` / `v2` / `common` の3値のみです(表示名「共通」= データ値
`common`)。`readingTimeMin` は**書きません** — 本文の文字数からビルド時に自動
算出されます(`ceil(文字数 / 600)`、20分超はビルドエラー)。

---

## 手順(5ステップ)

### 1. 単元 Markdown を作成する(目安: 10分)

`src/content/units/{unit-id}.md` を作成します。`{unit-id}` は kebab-case の一意な
ID です。

```markdown
---
id: my-new-unit
title: 単元のタイトル
version: v2
---

## 最初のセクション

本文。h2(`##`)がセクションの単位です。

## 次のセクション

本文。
```

- 本文は h2 セクションで構成します。読了時間は **20分以内**(15分前後が目標)。
- frontmatter に余分なキーを足さないこと(スキーマは厳格 = 未知キーはエラー)。

### 2. 問題をプールに追加する(目安: 10分)

その単元が属する帯の `src/content/questions/{belt}.yaml` に問題を追記します。
**1単元あたり3〜8問**、かつ**各セクションに最低1問**が必要です(BV-2)。

```yaml
- id: q-my-new-unit-1
  unitId: my-new-unit
  afterSection: 最初のセクション # h2 見出しの slug(小文字化・空白はハイフン)
  prompt: 質問文
  choices: # 2〜5個
    - 選択肢A
    - 選択肢B
  answerIndex: 0 # choices の正解インデックス(0 始まり)
  explanation: 解説文(必須)
  sourceUrl: https://github.com/awslabs/aidlc-workflows/blob/<sha>/<doc> # https 必須
```

- `afterSection` は対応する h2 見出しの **slug** に一致させます(`## 最初のセクション`
  → `最初のセクション`)。ずれていると BV-2 が「セクションに問題がない」と報告します。
- `sourceUrl` は **https の正規形 URL**であること(到達性はチェックしません)。出典は
  凍結済みの確定単元一覧(uw-07)から取ります。

### 3. パス定義に1行追加する(目安: 2分)

`src/content/paths/{belt}.yaml` の `unitIds` に、その単元 ID を追記します。順序が
学習順(前/次ナビ)になります。

```yaml
unitIds:
  - what-is-aidlc
  - my-new-unit # ← 追記
```

### 4. ローカルで `bv` を実行して全緑を確認する(目安: 3分)

```bash
npm run bv      # BV-1〜5(エラーがあれば exit 1)
npm run build   # スキーマ検証 + サイトビルド
```

`bv` が **0 error** になるまで直します。よくある指摘:

- **BV-1**: `version` が無い / 3値以外。
- **BV-2**: 問題数が 3〜8 の範囲外、セクションに問題が無い、`answerIndex` が範囲外、
  `sourceUrl` が https でない。
- **BV-3**: 読了時間が 20分超(セクションを分割・短縮する)。
- **BV-5**: パスや問題が存在しない単元 ID を参照している。

### 5. PR を出す(目安: 5分)

ブランチを切って PR を作成します。CI の唯一の必須チェック **`ci-gate`**(lint /
test / build / **bv** を集約)が緑になれば、squash マージで**本番へ自動反映**され
ます。

```bash
git switch -c content/add-my-new-unit
git add src/content
git commit -m "content: add my-new-unit"
# push して PR を作成
```

---

## チェックリスト

- [ ] `units/{id}.md` を作成(frontmatter 3キーのみ、h2 セクション)
- [ ] `questions/{belt}.yaml` に 3〜8 問(各セクションに1問以上、https 出典)
- [ ] `paths/{belt}.yaml` の `unitIds` に追記
- [ ] `npm run bv` と `npm run build` が緑
- [ ] PR を作成し `ci-gate` が緑
