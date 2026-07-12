import { defineConfig } from 'vitest/config';

// Infra CDK-assertion tests run under Node (no coverage floor — the IaC is held
// outside the src/**/*.ts coverage boundary; correctness is asserted via
// aws-cdk-lib/assertions Template tests + credential-free `cdk synth`).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
