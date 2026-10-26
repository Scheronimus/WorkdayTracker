import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: 'artifacts/webkit-results',
  reporter: [['list'], ...(process.env.CI ? [['github']] : []), ['html', { outputFolder: 'artifacts/webkit-report', open: 'never' }]],
  use: {
    ...devices['iPhone 13'],
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:5190',
    locale: 'en-GB', timezoneId: 'Europe/Berlin',
    reducedMotion: 'reduce',
    serviceWorkers: 'allow',
    actionTimeout: 10_000, navigationTimeout: 20_000,
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  projects: [{ name: 'webkit-iphone' }],
  webServer: {
    command: 'node scripts/serve-webkit-upgrade.mjs',
    url: 'http://127.0.0.1:5190/__upgrade/ready',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
