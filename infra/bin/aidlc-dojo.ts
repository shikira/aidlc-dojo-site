#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { resolveConfig } from '../lib/config';
import { CertStack } from '../lib/cert-stack';
import { SiteStack } from '../lib/site-stack';

// Entry point. All params come from context/env (resolveConfig) so `cdk synth`
// runs credential-free. When `domainName` is set, a us-east-1 CertStack is
// created and consumed cross-region by the ap-northeast-1 SiteStack; otherwise
// the site degrades to the default CloudFront domain.
const app = new App();
const config = resolveConfig(app);

let certificate;
if (config.domainName && config.hostedZoneId && config.zoneName) {
  const certStack = new CertStack(app, 'AidlcDojoCert', {
    env: { account: config.account, region: config.certRegion },
    crossRegionReferences: true,
    domainName: config.domainName,
    hostedZoneId: config.hostedZoneId,
    zoneName: config.zoneName,
  });
  certificate = certStack.certificate;
}

new SiteStack(app, 'AidlcDojoSite', {
  env: { account: config.account, region: config.siteRegion },
  crossRegionReferences: true,
  config,
  certificate,
});
