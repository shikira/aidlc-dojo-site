import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { CertStack } from '../lib/cert-stack';

describe('CertStack — ACM in us-east-1 (H-1)', () => {
  const app = new App();
  const stack = new CertStack(app, 'AidlcDojoCert', {
    env: { account: '123456789012', region: 'us-east-1' },
    crossRegionReferences: true,
    domainName: 'aidlc-dojo.dev',
    hostedZoneId: 'Z0ABCDE1234567890XYZ',
    zoneName: 'aidlc-dojo.dev',
  });
  const template = Template.fromStack(stack);

  it('pins the cert stack to us-east-1 (CloudFront requirement)', () => {
    expect(stack.region).toBe('us-east-1');
  });

  it('creates a DNS-validated certificate for the custom domain', () => {
    template.hasResourceProperties(
      'AWS::CertificateManager::Certificate',
      Match.objectLike({
        DomainName: 'aidlc-dojo.dev',
        ValidationMethod: 'DNS',
      }),
    );
  });
});
