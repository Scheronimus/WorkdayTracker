import { releaseVersion } from './release-version.mjs'
/* global document */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'
import { deployment } from '../deployment.config.mjs'
import { translate } from '../src/i18n.js'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const output = `artifacts/mobile-ux/durations-${engine}`
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5198', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5198${deployment.basePath}`
let browser
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw Error('Duration preview server did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch(executablePath ? { executablePath } : {})
  const valid = { id: 31, leftHomeAt: '2026-09-07T14:39:00.000Z', arrivedHomeAt: '2026-09-07T16:40:00.000Z', kilometresHome: 12,
    visits: [{ id: 1, name: 'Cliente', kilometres: 45, arrivedAt: '2026-09-07T15:00:00.000Z', leftAt: '2026-09-07T16:20:00.000Z' }] }
  const incomplete = { ...valid, id: 32, visits: [{ ...valid.visits[0], leftAt: null }] }
  const empty = { ...valid, id: 33, visits: [] }
  for (const language of ['en', 'es']) for (const width of [320, 390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: true,
      timezoneId: 'Europe/Berlin', reducedMotion: 'reduce' })
    await context.addInitScript(({ language, records, releaseVersion }) => {
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('workday-tracker-last-seen-release', releaseVersion)
      localStorage.setItem('workday-tracker-history', JSON.stringify(records))
    }, { language, records: [valid, incomplete, empty], releaseVersion })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const t = (key, values) => translate(language, key, values)
    const button = key => page.getByRole('button', { name: t(key), exact: true })
    const history = () => page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history')))
    await page.goto(url)
    await button('history').click()
    const cards = page.locator('.history-card')
    const card = cards.first()
    const work = card.locator('.history-duration-work strong')
    const travel = card.locator('.history-duration-travel strong')
    assert.equal(await work.textContent(), t('durationHoursMinutes', { hours: 1, minutes: '20' }))
    assert.equal(await travel.textContent(), t('durationMinutes', { minutes: 41 }))
    assert.equal(await card.getAttribute('open'), null, 'Durations are visible without expanding')
    assert.equal(await cards.nth(1).locator('.history-duration-work strong').textContent(), t('durationIncomplete'))
    assert.equal(await cards.nth(1).locator('.history-duration-travel strong').textContent(), t('durationIncomplete'))
    assert.equal(await cards.nth(2).locator('.history-duration-work strong').textContent(), t('durationMinutes', { minutes: 0 }))
    assert.equal(await cards.nth(2).locator('.history-duration-travel strong').textContent(), t('durationHoursMinutes', { hours: 2, minutes: '01' }))
    assert.deepEqual(await history(), [valid, incomplete, empty], 'Rendering adds no stored duration fields')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    await card.screenshot({ path: `${output}/${language}-${width}-card.png` })
    await page.screenshot({ path: `${output}/${language}-${width}-history.png` })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    // A tall capture keeps fixed navigation from masking part of a long card;
    // width and text scale remain the same as the phone layout being checked.
    await page.setViewportSize({ width, height: 1500 })
    await card.screenshot({ path: `${output}/${language}-${width}-large-text.png` })
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await card.locator('summary').click()
    await card.locator('[data-timestamp-path="visits.0.leftAt"] .timestamp-edit-button').click()
    await page.locator('dialog input[type=time]').fill('18:10:00')
    await button('reviewCorrection').click()
    assert.deepEqual(await history(), [valid, incomplete, empty], 'Review does not change stored values or derived durations')
    await button('confirmSave').click()
    assert.equal(await work.textContent(), t('durationHoursMinutes', { hours: 1, minutes: '10' }))
    assert.equal(await travel.textContent(), t('durationMinutes', { minutes: 51 }))
    const expected = structuredClone(valid)
    expected.visits[0].leftAt = '2026-09-07T16:10:00.000Z'
    expected.timestampCorrections = { 'visits.0.leftAt': { original: valid.visits[0].leftAt } }
    assert.deepEqual(await history(), [expected, incomplete, empty], 'Only the confirmed timestamp and original-value metadata change')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine} ${language} ${width}: collapsed work/travel, safeguard, no customers, large text, correction recalculation and unchanged storage format`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
