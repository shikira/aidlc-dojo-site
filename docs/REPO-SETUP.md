# リポジトリ設定手順(オーナー実行)

このドキュメントは、**コミットするファイルでは表現できない** GitHub リポジトリ設定をまとめたオーナー向け手順です。ブランチ保護・シークレットスキャン等は GitHub の設定(UI / API)であり、リポジトリのファイルとしては設定できません。

> 前提: リポジトリは `github.com/<owner>/aidlc-dojo-site`(公開・デフォルトブランチ `main`)。以下の `gh` コマンド例は `OWNER`/`REPO` を実際の値へ置き換えてください。`gh auth login` で認証済みであること。

```sh
OWNER=shikira
REPO=aidlc-dojo-site
```

---

## ブートストラップ窓の順序(重要)

`main` への直接コミット禁止(project.md Forbidden / business-rules R1)は、**ブランチ保護を有効化した瞬間から**適用されます。それまでの初期化は「規律の例外」ではなく「規律の前提整備」であり、範囲を限定した**ブートストラップ窓**として扱います(business-rules R8)。

1. **窓・開** — リポジトリ初期化 + CI 骨格(このリポジトリの生成物一式)を `main` へ直接コミットする。
   - 直接コミットしてよいのは **リポジトリ初期化 + CI 骨格のみ**(それ以外を窓内で直コミットしない)。
2. **初回 CI を走らせる** — `push` トリガで CI が 1 回実行され、`ci-gate` チェックコンテキストが GitHub に登録される。
   - `ci-gate` は**初回 CI 実行が存在してから**でないと必須チェックに指定できません。
3. **ブランチ保護を有効化**(下記)→ **窓・閉**。以降 `main` への変更はすべて PR 経由。
4. Issue テンプレート等の追加変更はゲート付き PR で行う。
5. ダミー PR で一周検証(ブランチ → PR → `ci-gate` 緑 → squash マージ)。

---

## 1. ブランチ保護(`main`)

要件(security-design / business-rules R1・R3・R9):

| 設定                                  | 値                                                     |
| ------------------------------------- | ------------------------------------------------------ |
| Require a pull request before merging | 有効                                                   |
| Required approving reviews            | **0**(単独運用。GitHub は自 PR の承認を許可しないため) |
| Required status checks                | **`ci-gate` の 1 件のみ**(strict = 最新 `main` を要求) |
| Allowed merge methods                 | **squash のみ**(merge commit / rebase は無効)          |
| Require linear history                | 有効                                                   |
| Block force pushes                    | 有効                                                   |
| Restrict deletions                    | 有効(ブランチ削除禁止)                                 |

> レビューは**手続きルール**です。オーナーが AI 生成差分を読んでからマージ操作を行うこと自体がレビュー行為であり、機構ゲートは `ci-gate` 緑 + squash 限定のみです(business-rules R9)。

### squash 限定(リポジトリ設定)

```sh
gh api -X PATCH repos/$OWNER/$REPO \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true
```

### ブランチ保護ルール

`ci-gate` を必須チェックにできるのは**初回 CI 実行後**です(手順のステップ 2 の後)。

```sh
gh api -X PUT repos/$OWNER/$REPO/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-gate"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null
}
JSON
```

> UI で設定する場合: **Settings → Branches → Add branch protection rule** で `main` を対象に、上表のとおり設定します。`Require status checks to pass` の検索欄に `ci-gate` が現れるのは初回 CI 実行後です。

---

## 2. シークレットスキャン + プッシュ保護(SEC-7)

```sh
gh api -X PATCH repos/$OWNER/$REPO \
  -F security_and_analysis[secret_scanning][status]=enabled \
  -F security_and_analysis[secret_scanning_push_protection][status]=enabled
```

> UI: **Settings → Code security and analysis** で **Secret scanning** と **Push protection** を有効化。公開リポジトリでは無償で利用できます。

---

## 3. 供給網(Dependabot)

`.github/dependabot.yml` を同梱済みです(`github-actions` と `npm` を毎週更新)。追加で **Settings → Code security and analysis** の **Dependabot alerts** / **Dependabot security updates** を有効化してください。

```sh
gh api -X PATCH repos/$OWNER/$REPO \
  -F security_and_analysis[dependabot_security_updates][status]=enabled
```

---

## 4. シークレット管理(SEC-4)

- デプロイ資格情報等のシークレットは**リポジトリのシークレットストアのみ**に置きます(ファイル / コードにハードコードしない)。
- CI ジョブ(`lint` / `test` / `build`)はシークレット不要です。CD(`uw-06b`)が最小権限で使用します。

```sh
# 例(uw-06b が使用する想定。今は不要):
# gh secret set DEPLOY_TOKEN --repo $OWNER/$REPO
```

---

## 5. ラベル

Issue テンプレートが自動付与するラベルを作成しておきます。

```sh
gh label create bug-content --repo $OWNER/$REPO --color d73a4a --description "教材内容の誤り" || true
gh label create enhancement --repo $OWNER/$REPO --color a2eeef --description "改善提案" || true
```

---

## 検証(DoD)

1. 初回 CI が `main` の push で緑になること。
2. ブランチ保護有効化後、ダミー PR を作成 → `ci-gate` 緑 → squash マージが成功すること。
3. `main` への直接 push が保護設定で拒否されること。
