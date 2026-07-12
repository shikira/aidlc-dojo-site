import { Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

// cert-stack.ts — the ACM certificate for the custom domain. CloudFront requires
// its viewer certificate in us-east-1, so this stack is pinned to us-east-1 and
// consumed cross-region by the ap-northeast-1 SiteStack via
// `crossRegionReferences: true` (confirmed param). Only instantiated when a
// `domainName` context var is set — until then the site serves on the default
// CloudFront domain (H-3 degrade). DNS validation uses
// `HostedZone.fromHostedZoneAttributes` (context id + name), NOT `fromLookup`,
// so `cdk synth` needs no AWS credentials.

export interface CertStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
  zoneName: string;
}

export class CertStack extends Stack {
  /** DNS-validated cert for the custom domain (consumed by the SiteStack distribution). */
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.zoneName,
      },
    );

    this.certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });
  }
}
