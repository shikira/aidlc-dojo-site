import type { App } from 'aws-cdk-lib';

// config.ts — resolve deploy-time parameters from CDK context / env with safe
// defaults so `cdk synth` succeeds WITHOUT AWS credentials (confirmed param:
// account/region/domain via env/context; NO fromLookup, NO hardcoded account
// ID or secret — SEC-4 / D-6). Real values are injected by the owner at deploy
// (`-c domainName=... -c hostedZoneId=...` or CDK_DEFAULT_*); the placeholders
// below only ever materialise in a credential-free synth (CI).

/** Fully-resolved deploy configuration for the AI-DLC DOJO delivery stacks. */
export interface AppConfig {
  /** Target account. `CDK_DEFAULT_ACCOUNT` → `-c account` → synth placeholder. */
  account: string;
  /** S3 + CloudFront region (confirmed: ap-northeast-1). */
  siteRegion: string;
  /** ACM region for the CloudFront cert — always us-east-1 (CloudFront rule). */
  certRegion: string;
  githubOrg: string;
  githubRepo: string;
  githubBranch: string;
  githubEnvironment: string;
  budgetLimitUsd: number;
  budgetEmail: string;
  /** Custom domain. When UNSET the stack degrades to the default CloudFront domain. */
  domainName?: string;
  /** Route53 hosted-zone id (fromHostedZoneAttributes — never fromLookup). */
  hostedZoneId?: string;
  /** Route53 zone name (defaults to the domain apex). */
  zoneName?: string;
  /** Pre-existing GitHub OIDC provider ARN. When set, reuse it instead of creating one. */
  oidcProviderArn?: string;
}

const DEFAULT_ACCOUNT = '000000000000';
const DEFAULT_SITE_REGION = 'ap-northeast-1';
const CERT_REGION = 'us-east-1';
// Synth-only placeholder hosted-zone id (valid shape; never used at real deploy —
// the owner passes the real id via `-c hostedZoneId=...`).
const PLACEHOLDER_HOSTED_ZONE_ID = 'Z0000000000000000000Q';

function ctx(app: App, key: string): string | undefined {
  const value = app.node.tryGetContext(key);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Resolve the full config from context/env, applying credential-free defaults. */
export function resolveConfig(app: App): AppConfig {
  const account =
    process.env.CDK_DEFAULT_ACCOUNT ?? ctx(app, 'account') ?? DEFAULT_ACCOUNT;
  const siteRegion =
    ctx(app, 'region') ?? process.env.CDK_DEFAULT_REGION ?? DEFAULT_SITE_REGION;
  const domainName = ctx(app, 'domainName');

  const config: AppConfig = {
    account,
    siteRegion,
    certRegion: CERT_REGION,
    githubOrg: ctx(app, 'githubOrg') ?? 'shikira',
    githubRepo: ctx(app, 'githubRepo') ?? 'aidlc-dojo-site',
    githubBranch: ctx(app, 'githubBranch') ?? 'main',
    githubEnvironment: ctx(app, 'githubEnvironment') ?? 'production',
    budgetLimitUsd: Number(ctx(app, 'budgetLimitUsd') ?? '10'),
    budgetEmail: ctx(app, 'budgetEmail') ?? 'owner@example.com',
    domainName,
    oidcProviderArn: ctx(app, 'oidcProviderArn'),
  };

  if (domainName) {
    config.zoneName = ctx(app, 'zoneName') ?? domainName;
    config.hostedZoneId =
      ctx(app, 'hostedZoneId') ?? PLACEHOLDER_HOSTED_ZONE_ID;
  }

  return config;
}
