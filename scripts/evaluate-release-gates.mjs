#!/usr/bin/env node

import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/evaluate-release-gates.mjs <metrics.json>');
  process.exit(1);
}

const raw = fs.readFileSync(path, 'utf8');
const metrics = JSON.parse(raw);

const failures = [];
if ((metrics.anrRate ?? 1) >= 0.001) failures.push('ANR rate must be < 0.1%');
if ((metrics.tunnelUptime ?? 0) <= 0.99) failures.push('Tunnel uptime must be > 99%');
if ((metrics.criticalCrashes ?? 1) > 0) failures.push('Critical crashes must be 0 for 72h soak');
if ((metrics.failStrategyCorrect ?? false) !== true) failures.push('Fail strategy correctness check failed');

if (failures.length > 0) {
  console.error('Release gate FAILED:\n- ' + failures.join('\n- '));
  process.exit(2);
}

console.log('Release gate PASSED');
