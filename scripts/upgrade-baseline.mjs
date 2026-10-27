import { execFileSync } from 'node:child_process'

// Keep the previous stable release explicit; an override retains legacy coverage.
export const upgradeBaselineRef = process.env.UPGRADE_BASELINE || 'v1.6.0'
export const upgradeBaselineVersion = JSON.parse(execFileSync('git', ['show', `${upgradeBaselineRef}:package.json`], { encoding: 'utf8' })).version
