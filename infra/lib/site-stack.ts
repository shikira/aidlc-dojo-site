import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import type * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import type { Construct } from 'constructs';
import type { AppConfig } from './config';
import { EDGE_CSP } from './csp';
import { addGithubOidcRoles, BUILD_PREFIX } from './github-oidc';

// site-stack.ts — the shared static-delivery architecture (ap-northeast-1):
// private S3 origin + access-log bucket, a CloudFront distribution behind OAC
// with security headers + access logging, and the atomic origin-swap pointer
// (CloudFront Function + KeyValueStore). Publishing = flip the KVS "current
// build prefix"; rollback = flip it back to the last-known-good prefix
// (deployment-architecture REL-4). Also owns the AWS Budgets guard (<$10/mo,
// C-1) and the two GitHub OIDC deploy roles. The custom domain (Route53 alias +
// default-URL→canonical 301) is wired only when a domain is configured.

/** Access logs are ephemeral: expire after a week to bound cost (N: short retention). */
const LOG_RETENTION_DAYS = 7;
/** The KVS key holding the current live build prefix. */
const RELEASE_POINTER_KEY = 'current-prefix';

export interface SiteStackProps extends StackProps {
  config: AppConfig;
  /** us-east-1 cert (cross-region). Present only when a domain is configured. */
  certificate?: acm.ICertificate;
}

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);
    const { config } = props;
    const canonicalHost = config.domainName;

    // ── S3: access-log bucket (BUCKET_OWNER_PREFERRED so CloudFront legacy
    //    logging can write; ACLs enabled only here, never on the site bucket) ──
    const logBucket = new s3.Bucket(this, 'AccessLogBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      lifecycleRules: [
        {
          id: 'expire-access-logs',
          enabled: true,
          expiration: Duration.days(LOG_RETENTION_DAYS),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ── S3: private site origin (public access fully blocked; OAC-only;
    //    immutable versioned build prefixes under builds/<sha>/) ──
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        {
          id: 'abort-incomplete-mpu',
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ── Atomic origin pointer: KeyValueStore holds the current build prefix;
    //    a CloudFront Function rewrites each request path into that prefix ──
    const releasePointer = new cloudfront.KeyValueStore(
      this,
      'ReleasePointer',
      {
        comment:
          'AI-DLC DOJO release pointer: current live build prefix (atomic swap).',
      },
    );

    const originRewriteFunction = new cloudfront.Function(
      this,
      'OriginRewriteFn',
      {
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        keyValueStore: releasePointer,
        comment:
          'Rewrite request path to the current build prefix (KVS) and canonicalise host.',
        code: cloudfront.FunctionCode.fromInline(
          renderOriginRewriteCode(canonicalHost),
        ),
      },
    );

    // ── Security response headers: CSP single-sourced from the app, plus HSTS,
    //    X-Content-Type-Options (nosniff), Referrer-Policy, X-Frame-Options ──
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        comment:
          'CSP (single-sourced from the app) + HSTS + nosniff + referrer-policy.',
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: EDGE_CSP,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(730),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
        },
      },
    );

    // ── CloudFront distribution (OAC to the private bucket, TLS, compression,
    //    access logging → log bucket, viewer-request path rewrite) ──
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      comment: 'AI-DLC DOJO static delivery',
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Cost guard (C-1): exclude the most expensive edge locations; Asia (JP) stays in.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket,
      logFilePrefix: 'cf/',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
        functionAssociations: [
          {
            function: originRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      ...(props.certificate && canonicalHost
        ? { certificate: props.certificate, domainNames: [canonicalHost] }
        : {}),
    });

    // ── Custom domain: Route53 alias A/AAAA → CloudFront. The default-URL →
    //    canonical-host 301 (H-2) is handled inside the CloudFront Function ──
    if (config.domainName && config.hostedZoneId && config.zoneName) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        'HostedZone',
        {
          hostedZoneId: config.hostedZoneId,
          zoneName: config.zoneName,
        },
      );
      const aliasTarget = route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      );
      new route53.ARecord(this, 'AliasA', {
        zone,
        recordName: config.domainName,
        target: aliasTarget,
      });
      new route53.AaaaRecord(this, 'AliasAAAA', {
        zone,
        recordName: config.domainName,
        target: aliasTarget,
      });
    }

    // ── Cost guard: AWS Budgets alarm at the <$10/mo ceiling (C-1 / NFR-3) ──
    new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetName: `${this.stackName}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: config.budgetLimitUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            { subscriptionType: 'EMAIL', address: config.budgetEmail },
          ],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            { subscriptionType: 'EMAIL', address: config.budgetEmail },
          ],
        },
      ],
    });

    // ── Deploy identity: GitHub OIDC + two least-privilege roles ──
    const roles = addGithubOidcRoles(this, {
      githubOrg: config.githubOrg,
      githubRepo: config.githubRepo,
      githubBranch: config.githubBranch,
      githubEnvironment: config.githubEnvironment,
      siteBucket,
      distribution,
      keyValueStoreArn: releasePointer.keyValueStoreArn,
      existingOidcProviderArn: config.oidcProviderArn,
    });

    // ── Outputs the CD workflow / owner needs (also self-documents wiring) ──
    new CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
    new CfnOutput(this, 'BuildPrefix', { value: BUILD_PREFIX });
    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });
    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description:
        'Default delivery URL (SMOKE_DEFAULT_URL) when no domain is cut over.',
    });
    new CfnOutput(this, 'ReleasePointerName', {
      value: releasePointer.keyValueStoreId,
      description:
        'KeyValueStore id; set key "current-prefix" to publish/rollback.',
    });
    new CfnOutput(this, 'ReleasePointerArn', {
      value: releasePointer.keyValueStoreArn,
      description: 'KeyValueStore ARN → GitHub Environment variable KVS_ARN.',
    });
    new CfnOutput(this, 'ReleasePointerKey', { value: RELEASE_POINTER_KEY });
    new CfnOutput(this, 'ContentDeployRoleArn', {
      value: roles.contentDeployRole.roleArn,
    });
    new CfnOutput(this, 'InfraProvisioningRoleArn', {
      value: roles.infraProvisioningRole.roleArn,
    });
  }
}

/**
 * Render the CloudFront Function (JS 2.0) source. It (1) optionally 301-redirects
 * any non-canonical host to the canonical domain (H-2, only when a domain is
 * configured), then (2) normalises directory URIs to `index.html`, then
 * (3) prepends the current build prefix read from the associated KeyValueStore —
 * the atomic origin swap. An empty/unseeded pointer falls through to the raw URI
 * (cold start before the first publish).
 */
function renderOriginRewriteCode(canonicalHost?: string): string {
  const host = JSON.stringify(canonicalHost ?? '');
  const redirectBlock = canonicalHost
    ? `
  var hostHeader = request.headers.host && request.headers.host.value;
  if (hostHeader && hostHeader !== ${host}) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { 'location': { value: 'https://' + ${host} + request.uri } },
    };
  }`
    : '';

  return `import cf from 'cloudfront';
var kvs = cf.kvs();
async function handler(event) {
  var request = event.request;${redirectBlock}
  var uri = request.uri;
  if (uri.endsWith('/')) {
    uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    uri = uri + '/index.html';
  }
  var prefix = '';
  try {
    prefix = await kvs.get(${JSON.stringify(RELEASE_POINTER_KEY)}, { format: 'string' });
  } catch (err) {
    prefix = '';
  }
  request.uri = prefix ? '/' + prefix + uri : uri;
  return request;
}`;
}
