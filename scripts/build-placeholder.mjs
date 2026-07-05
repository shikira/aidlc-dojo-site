#!/usr/bin/env node
// Bootstrap build placeholder for UW-06a (repo container / CI skeleton).
//
// The command-set contract (functional-design/business-logic-model.md) defines
// a stable `build` command name. At this bootstrap stage there is no Astro app
// yet — UW-01 provides the real `astro build`. Until then this placeholder
// keeps the `build` CI job green so the empty container completes CI, while
// making it explicit (via the log line below) that this is a temporary stand-in
// and NOT a permanently-empty gate.
console.log('bootstrap placeholder — replaced by UW-01');
process.exit(0);
