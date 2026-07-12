import { Duration, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type { Construct } from 'constructs';

// github-oidc.ts — GitHub Actions OIDC identity for keyless CD (SEC-1: no
// long-lived AWS keys). Creates the OIDC provider (unless an existing one is
// supplied) and TWO least-privilege roles (security-design threat #1: never let
// the frequent content path carry infra-provisioning power):
//   • content-deploy      — S3 PutObject to the build prefix, CloudFront
//                            invalidation, and KVS release-pointer update.
//   • infra-provisioning  — assume the CDK bootstrap roles to deploy the stacks.
// Both roles trust ONLY this repo, on branch `main` OR the `production`
// environment, with aud = sts.amazonaws.com (task-confirmed trust conditions).

const OIDC_URL = 'https://token.actions.githubusercontent.com';
const OIDC_AUDIENCE = 'sts.amazonaws.com';
// GitHub Actions OIDC root-CA thumbprint. AWS no longer verifies this for the
// well-known GitHub IdP, but the L1 resource requires the property; using the
// L1 avoids the custom-resource Lambda the L2 provider would add.
const GITHUB_OIDC_THUMBPRINT = '6938fd4d98bab03faadb97b34396831e3780aea1';
/** S3 key prefix every immutable build is uploaded under (versioned prefixes). */
export const BUILD_PREFIX = 'builds';

export interface GithubOidcProps {
  githubOrg: string;
  githubRepo: string;
  githubBranch: string;
  githubEnvironment: string;
  siteBucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  /** ARN of the release-pointer KeyValueStore (content-deploy updates it). */
  keyValueStoreArn: string;
  /** Reuse an existing account-level OIDC provider instead of creating one. */
  existingOidcProviderArn?: string;
}

export interface GithubOidcRoles {
  contentDeployRole: iam.Role;
  infraProvisioningRole: iam.Role;
}

/** Add the OIDC provider (if needed) and the two scoped deploy roles to `scope`. */
export function addGithubOidcRoles(
  scope: Construct,
  props: GithubOidcProps,
): GithubOidcRoles {
  const stack = Stack.of(scope);

  const providerArn =
    props.existingOidcProviderArn ??
    new iam.CfnOIDCProvider(scope, 'GithubOidcProvider', {
      url: OIDC_URL,
      clientIdList: [OIDC_AUDIENCE],
      thumbprintList: [GITHUB_OIDC_THUMBPRINT],
    }).attrArn;

  const repo = `repo:${props.githubOrg}/${props.githubRepo}`;
  const subjects = [
    `${repo}:ref:refs/heads/${props.githubBranch}`,
    `${repo}:environment:${props.githubEnvironment}`,
  ];

  const trust = new iam.FederatedPrincipal(
    providerArn,
    {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': OIDC_AUDIENCE,
      },
      StringLike: { 'token.actions.githubusercontent.com:sub': subjects },
    },
    'sts:AssumeRoleWithWebIdentity',
  );

  // ── content-deploy: least-privilege content publish path ──────────────────
  const contentDeployRole = new iam.Role(scope, 'ContentDeployRole', {
    assumedBy: trust,
    description:
      'GitHub Actions content deploy: put build objects, invalidate CloudFront, flip KVS pointer.',
    maxSessionDuration: Duration.hours(1),
  });
  contentDeployRole.addToPolicy(
    new iam.PolicyStatement({
      sid: 'PublishBuildObjects',
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      resources: [props.siteBucket.arnForObjects(`${BUILD_PREFIX}/*`)],
    }),
  );
  contentDeployRole.addToPolicy(
    new iam.PolicyStatement({
      sid: 'ListSiteBucketBuildPrefix',
      actions: ['s3:ListBucket'],
      resources: [props.siteBucket.bucketArn],
      conditions: { StringLike: { 's3:prefix': [`${BUILD_PREFIX}/*`] } },
    }),
  );
  contentDeployRole.addToPolicy(
    new iam.PolicyStatement({
      sid: 'InvalidateDistribution',
      actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
      resources: [
        `arn:aws:cloudfront::${stack.account}:distribution/${props.distribution.distributionId}`,
      ],
    }),
  );
  contentDeployRole.addToPolicy(
    new iam.PolicyStatement({
      sid: 'UpdateReleasePointer',
      actions: [
        'cloudfront-keyvaluestore:DescribeKeyValueStore',
        'cloudfront-keyvaluestore:GetKey',
        'cloudfront-keyvaluestore:ListKeys',
        'cloudfront-keyvaluestore:PutKey',
        'cloudfront-keyvaluestore:UpdateKeys',
      ],
      resources: [props.keyValueStoreArn],
    }),
  );

  // ── infra-provisioning: CDK stack deploys via the bootstrap roles only ─────
  const infraProvisioningRole = new iam.Role(scope, 'InfraProvisioningRole', {
    assumedBy: trust,
    description:
      'GitHub Actions infra provisioning: assume the CDK bootstrap roles to deploy the stacks.',
    maxSessionDuration: Duration.hours(1),
  });
  infraProvisioningRole.addToPolicy(
    new iam.PolicyStatement({
      sid: 'AssumeCdkBootstrapRoles',
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${stack.account}:role/cdk-*`],
    }),
  );

  return { contentDeployRole, infraProvisioningRole };
}
