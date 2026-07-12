# AWS セットアップ手順(オーナー実行)

このドキュメントは **uw-06b デリバリー完成** の AWS 配信基盤(`infra/` の CDK)を
実際に稼働させるための、オーナー(AWS 権限を持つ人)向けの実行手順です。
コード生成エージェントは AWS 資格情報を持たないため、`cdk synth`・ユニットテスト・
lint/型チェックまでを担保します。**実デプロイ以降は本手順に従ってオーナーが実施**します。

> 前提: リージョンは **ap-northeast-1**(S3 / CloudFront)。CloudFront 用の
> ACM 証明書は **us-east-1 必須**。ドメイン `aidlc-dojo.dev` は Route53 で取得済み
> (デプロイアカウント)。ランニングコストは **$10/月以内**(ドメイン $23/年は別枠)。

---

## 0. ツール準備

```bash
cd infra
npm ci                     # 依存を厳密インストール
npx cdk --version          # CDK CLI 確認
```

`cdk synth` は AWS 資格情報なしで成功します(context の安全なデフォルトを使用)。
実デプロイには管理者権限の資格情報(`aws configure` / SSO / 環境変数)が必要です。

---

## 1. CDK ブートストラップ(初回のみ)

クロスリージョン証明書のため **2 リージョン**をブートストラップします。

```bash
# アカウントID・リージョンは自分の環境に合わせて
export CDK_DEFAULT_ACCOUNT=<AWSアカウントID>

npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-northeast-1
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/us-east-1     # CloudFront 証明書用
```

---

## 2. 初回デプロイ(管理者資格で実行 — 鶏卵問題の解消)

OIDC ロール(`content-deploy` / `infra-provisioning`)は **このスタックが作成**します。
つまり最初の 1 回だけは GitHub Actions ではなく **管理者資格で `cdk deploy`** します。
以降のコンテンツ配信は CD(`deploy.yml`)が OIDC ロールで実行します。

### 2-a. ドメイン未取得 / 未使用で立ち上げる場合(デフォルト CloudFront ドメイン)

```bash
CDK_DEFAULT_ACCOUNT=<AWSアカウントID> \
  npx cdk deploy AidlcDojoSite \
    -c budgetEmail=<通知先メール>
```

`domainName` を渡さないと、サイトは **デフォルトの CloudFront ドメイン**で配信されます
(H-3: ドメインは後付けでカットオーバー可能)。

### 2-b. 独自ドメインを最初から使う場合

```bash
CDK_DEFAULT_ACCOUNT=<AWSアカウントID> \
  npx cdk deploy --all \
    -c domainName=aidlc-dojo.dev \
    -c hostedZoneId=<Route53 ホストゾーンID> \
    -c zoneName=aidlc-dojo.dev \
    -c budgetEmail=<通知先メール>
```

- `hostedZoneId` / `zoneName` は Route53 の既存ホストゾーンの値です
  (`fromLookup` は使わないため、**context で明示**します)。
- `--all` で us-east-1 の `AidlcDojoCert`(ACM)と ap-northeast-1 の
  `AidlcDojoSite` の両方をデプロイします(証明書はクロスリージョン参照で連携)。

### デプロイ出力(control 値)を控える

`cdk deploy` 完了時に以下の Outputs が表示されます。GitHub 変数設定(手順 3)で使います。

| Output                     | 用途(GitHub 変数)                        |
| -------------------------- | ---------------------------------------- |
| `SiteBucketName`           | `SITE_BUCKET`                            |
| `DistributionId`           | `DISTRIBUTION_ID`                        |
| `DistributionDomainName`   | `SMOKE_DEFAULT_URL`(`https://` を付けて) |
| `ReleasePointerArn`        | `KVS_ARN`                                |
| `ContentDeployRoleArn`     | `CONTENT_DEPLOY_ROLE_ARN`                |
| `InfraProvisioningRoleArn` | (インフラ更新用 CD を組む場合に使用)     |

> **注(既存 OIDC プロバイダ)**: アカウントに
> `token.actions.githubusercontent.com` の OIDC プロバイダが既にある場合、
> 二重作成でデプロイが失敗します。その場合は既存 ARN を
> `-c oidcProviderArn=<既存プロバイダARN>` で渡して再利用してください。

---

## 3. GitHub Environment `production` と変数の設定

リポジトリ `shikira/aidlc-dojo-site` の **Settings → Environments** で
`production` を作成し(必要なら承認者・ブランチ制限を設定)、
**Environment variables** に以下を登録します(いずれも Secret 不要=公開値。
資格情報はハードコードしません — D-6/SEC-4)。

| 変数                      | 値                                                    |
| ------------------------- | ----------------------------------------------------- |
| `AWS_REGION`              | `ap-northeast-1`                                      |
| `SITE_BUCKET`             | `SiteBucketName` の値                                 |
| `DISTRIBUTION_ID`         | `DistributionId` の値                                 |
| `KVS_ARN`                 | `ReleasePointerArn` の値                              |
| `CONTENT_DEPLOY_ROLE_ARN` | `ContentDeployRoleArn` の値                           |
| `SMOKE_DEFAULT_URL`       | `https://<DistributionDomainName>`                    |
| `SMOKE_DOMAIN`            | `aidlc-dojo.dev`(未使用なら空でも可)                  |
| `SMOKE_DOMAIN_READY`      | ドメインカットオーバー後に `true`、それ以外は `false` |

OIDC 信頼条件は、リポジトリ `shikira/aidlc-dojo-site` の
`ref:refs/heads/main` **または** Environment `production` に、`aud=sts.amazonaws.com`
でスコープ済みです(`infra/lib/github-oidc.ts`)。

---

## 4. CD の稼働(main へのマージ = リリース)

`main` に push(= squash マージ)されると `.github/workflows/deploy.yml` が発火し、
次を自動実行します(D-1: 手動デプロイ経路なし)。

1. `npm ci && npm run build` で本番成果物を生成。
2. OIDC で `content-deploy` ロールを引き受け。
3. `dist/` を **新しいバージョン付きプレフィックス** `builds/<コミットSHA>/` へアップロード
   (不変・上書きしない)。
4. KVS の `current-prefix` を新プレフィックスへ **フリップ(公開)** し、CloudFront を無効化。
5. **デプロイ後スモーク**(`scripts/smoke.mjs`)を実行:
   - `GET /` と、ビルドマニフェスト先頭の正準単元 `GET /units/<id>/` が
     **200 かつ各ページ固有センチネル**を含むか検証(soft-404 検出)。
6. 結果分岐:
   - **緑** → `last-known-good` を新プレフィックスへ更新(公開確定)。
   - **赤 & 戻り先あり** → `current-prefix` を `last-known-good` へ戻して自動ロールバック +
     再スモーク + ジョブ失敗(アラート)。失敗した変更は通常の修正 PR で再挑戦。
   - **赤 & コールドスタート(戻り先なし)** → 公開を確定せず **halt + ジョブ失敗**(アラート)。

---

## 5. コールドスタート(ウォーキングスケルトン Bolt 1)の last-known-good シード

初回デプロイ時点では `last-known-good` が未設定です。**初回スモークが緑**になると
CD が `last-known-good` を初めて設定(シード)します。これ以降のデプロイは常に
戻り先を持つため、自動ロールバックが機能します。

初回スモークが**赤**の場合は戻り先が無いため、ロールバックせず halt します
(サイトは未公開状態のまま — 修正して再デプロイ)。

---

## 6. ドメインカットオーバー(後付け・1 回きり)

デフォルト CloudFront ドメインで立ち上げた後にドメインを有効化する場合:

1. 手順 2-b の context を付けて `npx cdk deploy --all` を再実行
   (ACM 証明書発行 → CloudFront alias → Route53 A/AAAA レコード作成)。
2. ACM の DNS 検証が完了するまで待機(Route53 に検証レコードが自動作成されます)。
3. GitHub 変数 `SMOKE_DOMAIN_READY` を `true` に更新。
4. 以降、デフォルト URL へのアクセスは CloudFront Function により
   `https://aidlc-dojo.dev` へ **301 恒久リダイレクト**されます(正準ホスト統一 = SEO 重複防止)。

---

## 7. 解析(クッキーレス)

CloudFront **標準アクセスログ**をログバケットへ出力します(クライアント JS は追加しません — N-3)。
生ログは **7 日で失効**(S3 ライフサイクル)。R1 時点では **ログの捕捉まで**を実装しており、
クッキー 0・クライアント計測なしで FR-6.4/N-1/N-3 を満たします。

**集約処理は未実装(運用フェーズへ繰延)**: 集約指標(ページビュー等)の生成
(例: Athena クエリ / Lambda 集計 + IP 切り詰め)は observability-setup(4.4)/
feedback-optimization(4.7)で実装します。それまでは必要に応じてログを ad-hoc に
集計できます(集約出力時に IP を切り詰め/破棄して「PII 非保持」を担保 — N-2)。
方式名はプライバシーポリシー(UW-05)で開示済みです。

---

## 8. コスト / 撤収メモ

- **AWS Budgets** アラームを月 $10 の 80%(実績)/ 100%(予測)で設定済み(C-1)。
  通知先は `-c budgetEmail=...` の値。
- S3(サイト/ログ)は `RemovalPolicy.RETAIN`。`cdk destroy` してもバケットは残るため、
  不要時は中身を空にして手動削除してください。
