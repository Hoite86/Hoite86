#!/usr/bin/env node

import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/evaluate-release-gates.mjs <metrics.json>');
  process.exit(1);
}

let metrics;
try {
  const raw = fs.readFileSync(path, 'utf8');
  metrics = JSON.parse(raw);
} catch (error) {
  console.error(`Failed to read or parse metrics file: ${String(error)}`);
  process.exit(1);
}

const failures = [];

const requireNumber = (key) => {
  const value = metrics[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    failures.push(`${key} must be a valid number`);
    return null;
  }
  return value;
};

const requireBoolean = (key) => {
  const value = metrics[key];
  if (typeof value !== 'boolean') {
    failures.push(`${key} must be a boolean`);
    return null;
  }
  return value;
};

const requireString = (key) => {
  const value = metrics[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    failures.push(`${key} must be a non-empty string`);
    return null;
  }
  return value;
};

const anrRate = requireNumber('anrRate');
const tunnelUptime = requireNumber('tunnelUptime');
const criticalCrashes = requireNumber('criticalCrashes');
const failStrategyCorrect = requireBoolean('failStrategyCorrect');
const soakWindowHours = requireNumber('soakWindowHours');
const runId = requireString('runId');
const generatedAt = requireString('generatedAt');

if (anrRate !== null && anrRate >= 0.001) failures.push('ANR rate must be < 0.1%');
if (tunnelUptime !== null && tunnelUptime <= 0.99) failures.push('Tunnel uptime must be > 99%');
if (criticalCrashes !== null && criticalCrashes > 0) failures.push('Critical crashes must be 0 for soak run');
if (failStrategyCorrect !== null && failStrategyCorrect !== true) {
  failures.push('Fail strategy correctness check failed');
}
if (soakWindowHours !== null && soakWindowHours < 24) {
  failures.push('Soak window must be >= 24h to qualify for release gate evaluation');
}

if (generatedAt) {
  const generatedMs = Date.parse(generatedAt);
  if (Number.isNaN(generatedMs)) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
  }
}

if (runId && !/^[-_a-zA-Z0-9.]+$/.test(runId)) {
  failures.push('runId contains invalid characters; use [-_a-zA-Z0-9.] only');
}

if (failures.length > 0) {
  console.error('Release gate FAILED:\n- ' + failures.join('\n- '));
  process.exit(2);
}

console.log(`Release gate PASSED (runId=${runId})`);
