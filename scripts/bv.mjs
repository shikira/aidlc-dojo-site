// bv.mjs — the `bv` build-time quality-gate command (business-rules BV-1..5).
//
// Runs BV-1..5 over the real content collections, the real dictionary, and the
// real UI sources, prints a report, and exits 1 if ANY error is found (=CI fail
// =merge block, ci-gate contract). The BV logic lives in TypeScript (shared
// verbatim with the Vitest suite); we load it through Vite's SSR module runner
// so there is NO duplicate JS implementation and NO extra dependency — `vite`
// is already the build tool. Advisory warnings do not affect the exit code.
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
});

try {
  const { runBvFromDisk, formatReport, hasError } = await server.ssrLoadModule(
    '/src/lib/bv/index.ts',
  );
  const findings = runBvFromDisk();
  console.log(formatReport(findings));
  if (hasError(findings)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('bv: failed to run business validation.');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  await server.close();
}
