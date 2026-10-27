import { releaseVersion } from './release-version.mjs'
/* global document */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'
import { deployment } from '../deployment.config.mjs'
import { translate } from '../src/i18n.js'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const output = `artifacts/mobile-ux/statistics-${engine}`
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5197${deployment.basePath}`
let browser
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw Error('Statistics preview did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch(executablePath ? { executablePath } : {})
  const records = [
    { id: 1, leftHomeAt: '2026-10-26T08:00:00+01:00', arrivedHomeAt: '2026-10-26T16:00:00+01:00', kilometresHome: 12, visits: [{ id: 11, name: 'Customer', kilometres: 8, arrivedAt: '2026-10-26T09:00:00+01:00', leftAt: '2026-10-26T15:00:00+01:00' }] },
    { id: 2, leftHomeAt: '2026-10-26T17:00:00+01:00', arrivedHomeAt: '2026-10-26T18:00:00+01:00', kilometresHome: 5, visits: [] },
    { id: 3, leftHomeAt: '2026-09-07T08:00:00+02:00', arrivedHomeAt: '2026-09-07T09:00:00+02:00', kilometresHome: null, visits: [] },
  ]
  for (const language of ['en', 'es']) for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Europe/Berlin', reducedMotion: 'reduce', acceptDownloads: true })
    await context.addInitScript(({ language, records, releaseVersion }) => {
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('workday-tracker-last-seen-release', releaseVersion)
      localStorage.setItem('workday-tracker-history', JSON.stringify(records))
    }, { language, records, releaseVersion })
    const page = await context.newPage()
    await page.clock.install({ time: new Date('2026-10-27T12:00:00+01:00') })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const t = key => translate(language, key)
    const button = key => page.getByRole('button', { name: t(key), exact: true })
    await page.goto(url)
    await button('history').click()
    assert.equal(await page.locator('.statistics').count(), 0, 'List view does not render unused charts or live regions')
    await button('statsShow').click()
    assert.equal(await page.locator('.stats-total').textContent(), '9 h 0 min')
    assert.equal(await page.locator('.stats-axis span').first().textContent(), '9 h', 'Axis rounds to the next integer, not a multiple of four')
    assert.equal(await page.locator('.stats-day').count(), 31)
    await button('statsDistance').click()
    assert.equal(await page.locator('.stats-total').textContent(), '25 km')
    assert.equal(await page.locator('.stats-axis span').first().textContent(), '25 km')
    const downloadEvent = page.waitForEvent('download')
    await button('statsExport').click()
    const download = await downloadEvent
    const csv = await readFile(await download.path(), 'utf8')
    assert.ok(csv.includes('Customer'))
    assert.ok(!csv.includes('2026-09-07'))
    await button('statsweek').click()
    assert.equal(await page.locator('.stats-day').count(), 7)
    await button('statsTime').click()
    await page.locator('.stats-day').first().focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await page.locator('.stats-day').nth(1).getAttribute('aria-pressed'), 'true')
    await page.locator('.stats-day').first().click()
    await button('statsViewDays').click()
    await page.locator('.history-card[open]').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.history-card:visible').count(), 2)
    assert.equal(await page.locator('.history-card').first().getAttribute('open'), '')
    await button('statsShow').click()
    assert.equal(await page.locator('.stats-day').count(), 7, 'Returning preserves selection')
    await button('statsquarter').click()
    assert.equal(await page.locator('.stats-day').count(), 92)
    assert.ok(await page.locator('.stats-scroll').evaluate(el => el.scrollWidth > el.clientWidth))
    await button('statsPrevious').click()
    assert.equal(await page.locator('.stats-total').textContent(), '1 h 0 min')
    await button('statsDistance').click()
    assert.ok(await page.locator('.stats-warning').count() > 0)
    await page.locator('.stats-table summary').click()
    assert.equal(await page.locator('.stats-table tbody tr').count(), 92)
    await button('statsCurrent').click()
    await button('statsmonth').click()
    await button('statsTime').click()
    await page.locator('.stats-day-picker select').selectOption('2026-10-01')
    assert.ok((await page.locator('.stats-detail').textContent()).includes(t('statsNoDays')))
    await page.locator('.stats-day-picker select').selectOption('2026-10-26')
    await page.locator('.stats-table summary').click()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'No page overflow')
    await page.screenshot({ path: `${output}/${language}-${width}.png`, fullPage: true })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'No page overflow at 200% text')
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history'))), [...records].sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt)), 'Statistics never mutates saved records')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine} ${language} ${width}: totals, periods, keyboard, drilldown, export, layout and storage`)
    await context.close()
  }
  const context = await browser.newContext({ timezoneId: 'Europe/Berlin' })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-10-27T12:00:00+01:00') })
  await context.addInitScript(releaseVersion => {
    localStorage.setItem('workday-tracker-last-seen-release', releaseVersion)
    localStorage.setItem('workday-tracker-language', '"en"')
  }, releaseVersion)
  await page.goto(url)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await page.getByRole('button', { name: 'Show statistics', exact: true }).click()
  assert.ok(await page.getByRole('status').textContent())
  assert.ok(await page.getByRole('button', { name: 'Export period CSV' }).isDisabled())
  await context.close()
  console.log(`PASS ${engine}: empty history and disabled export`)
} finally {
  await browser?.close()
  server.kill()
}
