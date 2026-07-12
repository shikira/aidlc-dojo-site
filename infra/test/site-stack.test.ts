import { App } from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { CertStack } from '../lib/cert-stack';
import { resolveConfig } from '../lib/config';
import { SiteStack } from '../lib/site-stack';

const OIDC_SUB_KEY = 'token.actions.githubusercontent.com:sub';

/** Build a SiteStack template with domain unset (default degrade path). */
function siteTemplateNoDomain(): Template {
  const app = new App();
  const config = resolveConfig(app);
  const stack = new SiteStack(app, 'AidlcDojoSite', {
    env: { account: config.account, region: config.siteRegion },
    crossRegionReferences: true,
    config,
  });
  return Template.fromStack(stack);
}

/** Build a SiteStack (+ cross-region CertStack) template with a domain set. */
function siteTemplateWithDomain(): { site: Template; cert: Template } {
  const app = new App({
    context: {
      domainName: 'aidlc-dojo.dev',
      hostedZoneId: 'Z0ABCDE1234567890XYZ',
      zoneName: 'aidlc-dojo.dev',
      account: '123456789012',
    },
  });
  const config = resolveConfig(app);
  const certStack = new CertStack(app, 'AidlcDojoCert', {
    env: { account: config.account, region: config.certRegion },
    crossRegionReferences: true,
    domainName: config.domainName!,
    hostedZoneId: config.hostedZoneId!,
    zoneName: config.zoneName!,
  });
  const siteStack = new SiteStack(app, 'AidlcDojoSite', {
    env: { account: config.account, region: config.siteRegion },
    crossRegionReferences: true,
    config,
    certificate: certStack.certificate,
  });
  return {
    site: Template.fromStack(siteStack),
    cert: Template.fromStack(certStack),
  };
}

describe('SiteStack — S3 origin (D-4 / security)', () => {
  const template = siteTemplateNoDomain();

  it('creates buckets that block ALL public access', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketList = Object.values(buckets);
    expect(bucketList.length).toBeGreaterThanOrEqual(2); // site + access-log
    for (const bucket of bucketList) {
      expect(bucket.Properties.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
    }
  });

  it('gives the access-log bucket a short-retention lifecycle rule', () => {
    template.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([
            Match.objectLike({ ExpirationInDays: 7, Status: 'Enabled' }),
          ]),
        }),
      }),
    );
  });
});

describe('SiteStack — CloudFront (OAC, logging, headers, atomic swap)', () => {
  const template = siteTemplateNoDomain();

  it('fronts the private origin with an Origin Access Control', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('enables access logging to the log bucket', () => {
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Logging: Match.objectLike({ Prefix: 'cf/' }),
        }),
      }),
    );
  });

  it('attaches a response-headers policy carrying the app CSP', () => {
    const csp = new Capture();
    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            ContentSecurityPolicy: Match.objectLike({
              ContentSecurityPolicy: csp,
            }),
            StrictTransportSecurity: Match.objectLike({
              AccessControlMaxAgeSec: Match.anyValue(),
            }),
            ContentTypeOptions: Match.objectLike({ Override: true }),
            ReferrerPolicy: Match.anyValue(),
          }),
        }),
      }),
    );
    // Edge header carries hash-independent hardening; the full policy
    // (default-src/script-src+hash) is the per-page <meta> CSP from uw-01.
    expect(csp.asString()).toContain("frame-ancestors 'none'");
    expect(csp.asString()).toContain("base-uri 'self'");
    expect(csp.asString()).toContain("object-src 'none'");
  });

  it('provisions the KeyValueStore + CloudFront Function for the atomic origin swap', () => {
    template.resourceCountIs('AWS::CloudFront::KeyValueStore', 1);
    template.hasResourceProperties(
      'AWS::CloudFront::Function',
      Match.objectLike({
        FunctionConfig: Match.objectLike({ Runtime: 'cloudfront-js-2.0' }),
      }),
    );
  });
});

describe('SiteStack — GitHub OIDC (two least-privilege roles)', () => {
  const template = siteTemplateNoDomain();

  it('creates the OIDC provider scoped to the GitHub Actions audience', () => {
    template.hasResourceProperties(
      'AWS::IAM::OIDCProvider',
      Match.objectLike({
        Url: 'https://token.actions.githubusercontent.com',
        ClientIdList: ['sts.amazonaws.com'],
      }),
    );
  });

  it('has (at least) two roles whose trust is scoped to this repo/branch/environment', () => {
    const roles = template.findResources('AWS::IAM::Role', {
      Properties: {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: Match.objectLike({
                StringEquals: {
                  'token.actions.githubusercontent.com:aud':
                    'sts.amazonaws.com',
                },
                StringLike: {
                  [OIDC_SUB_KEY]: [
                    'repo:shikira/aidlc-dojo-site:ref:refs/heads/main',
                    'repo:shikira/aidlc-dojo-site:environment:production',
                  ],
                },
              }),
            }),
          ]),
        }),
      },
    });
    expect(Object.keys(roles).length).toBe(2);
  });

  it('scopes content-deploy to S3 put + CloudFront invalidation + KVS update', () => {
    template.hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({ Action: Match.arrayWith(['s3:PutObject']) }),
            Match.objectLike({
              Action: Match.arrayWith(['cloudfront:CreateInvalidation']),
            }),
            Match.objectLike({
              Action: Match.arrayWith(['cloudfront-keyvaluestore:UpdateKeys']),
            }),
          ]),
        }),
      }),
    );
  });

  it('scopes infra-provisioning to assuming the CDK bootstrap roles only', () => {
    template.hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({ Action: 'sts:AssumeRole' }),
          ]),
        }),
      }),
    );
  });
});

describe('SiteStack — cost guard (C-1)', () => {
  it('creates an AWS Budgets alarm at the $10/mo ceiling', () => {
    const template = siteTemplateNoDomain();
    template.hasResourceProperties(
      'AWS::Budgets::Budget',
      Match.objectLike({
        Budget: Match.objectLike({
          BudgetType: 'COST',
          TimeUnit: 'MONTHLY',
          BudgetLimit: { Amount: 10, Unit: 'USD' },
        }),
      }),
    );
  });
});

describe('SiteStack — domain-conditional degrade (H-1..H-3)', () => {
  it('has NO custom domain / aliases when domainName is unset', () => {
    const template = siteTemplateNoDomain();
    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    const [distribution] = Object.values(distributions);
    expect(distribution.Properties.DistributionConfig.Aliases).toBeUndefined();
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

  it('wires the CloudFront alias + Route53 A/AAAA records when domainName is set', () => {
    const { site } = siteTemplateWithDomain();
    site.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({ Aliases: ['aidlc-dojo.dev'] }),
      }),
    );
    site.resourceCountIs('AWS::Route53::RecordSet', 2);
    site.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({ Type: 'A' }),
    );
    site.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({ Type: 'AAAA' }),
    );
  });
});

describe('synth parity', () => {
  it('synthesises with domainName unset AND set', () => {
    expect(() => siteTemplateNoDomain()).not.toThrow();
    expect(() => siteTemplateWithDomain()).not.toThrow();
  });
});
