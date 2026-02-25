#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const run = (payload, expectCode) => {
  const path = '/tmp/release-gate-selftest-metrics.json';
  fs.writeFileSync(path, JSON.stringify(payload), 'utf8');

  try {
    execFileSync('node', ['scripts/evaluate-release-gates.mjs', path], { stdio: 'pipe' });
    if (expectCode !== 0) {
      throw new Error(`Expected failure code ${expectCode}, got success`);
    }
  } catch (error) {
    const code = error.status ?? 1;
    if (expectCode === 0 || code !== expectCode) {
      throw error;
    }
  }
};

const good = {
  runId: 'pixel8-72h',
  generatedAt: '2026-01-15T00:00:00.000Z',
  soakWindowHours: 72,
  anrRate: 0.0005,
  tunnelUptime: 0.995,
  criticalCrashes: 0,
  failStrategyCorrect: true
};

const badMissingTypes = {
  runId: '',
  generatedAt: 'not-a-date',
  soakWindowHours: '72h',
  anrRate: 0.0005,
  tunnelUptime: 0.995,
  criticalCrashes: 0,
  failStrategyCorrect: true
};

const badThreshold = {
  runId: 'pixel8-24h',
  generatedAt: '2026-01-15T00:00:00.000Z',
  soakWindowHours: 12,
  anrRate: 0.002,
  tunnelUptime: 0.5,
  criticalCrashes: 1,
  failStrategyCorrect: false
};

run(good, 0);
run(badMissingTypes, 2);
run(badThreshold, 2);

console.log('release-gate selftest PASSED');
