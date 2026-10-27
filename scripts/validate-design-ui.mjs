import { releaseVersion } from './release-version.mjs'
/* global document */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'
import { translate } from '../src/i18n.js'
import { deployment } from '../deployment.config.mjs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const output = `artifacts/mobile-ux/design-${engine}`
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5197${deployment.basePath}`
let browser
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw Error('Design preview server did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch(executablePath ? { executablePath } : {})
  for (const language of ['en', 'es']) for (const width of [320, 390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: true, timezoneId: 'Europe/Berlin', reducedMotion: 'reduce' })
    await context.addInitScript(({ language, releaseVersion }) => {
      const clock = new Date()
      clock.setSeconds(0, 0)
      const time = minutes => new Date(clock.getTime() - minutes * 60000).toISOString()
      const day = { id: 23, leftHomeAt: time(120), arrivedHomeAt: null, homeJourneyStarted: false, kilometresHome: null, note: '',
        visits: [{ id: 1, name: 'Oficina Norte', kilometres: 0.1, arrivedAt: time(100), leftAt: time(80) },
          { id: 2, name: 'Centro de mantenimiento del cliente', kilometres: 0.2, arrivedAt: time(60), leftAt: null }] }
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('workday-tracker-last-seen-release', releaseVersion)
      localStorage.setItem('workday-tracker-current', JSON.stringify(day))
      localStorage.setItem('workday-tracker-history', JSON.stringify([{ ...day, id: 22, arrivedHomeAt: time(10), kilometresHome: 0,
        visits: day.visits.map(visit => ({ ...visit, leftAt: visit.leftAt || time(20) })) }]))
    }, { language, releaseVersion })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const t = key => translate(language, key)
    const button = key => page.getByRole('button', { name: t(key), exact: true })
    async function capture(name) {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'No horizontal page overflow')
      await page.screenshot({ path: `${output}/${language}-${width}-${name}.png` })
    }
    await page.goto(url)
    await page.locator('.day-overview').waitFor()
    const current = await page.evaluate(() => localStorage.getItem('workday-tracker-current'))
    const history = await page.evaluate(() => localStorage.getItem('workday-tracker-history'))
    const total = new Intl.NumberFormat(language).format(0.3)
    assert.equal(await page.locator('.day-overview strong').last().textContent(), `${total} km`)
    await capture('today')
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    assert.ok(await page.locator('.trip-marker').evaluateAll(markers => markers.every(marker => {
      if (!marker.textContent.trim()) return true
      const box = marker.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(marker)
      return [...range.getClientRects()].every(rect => rect.top >= box.top && rect.bottom <= box.bottom)
    })), 'Route numbers remain inside their markers at enlarged text size')
    await page.locator('.trip-list > li').last().scrollIntoViewIfNeeded()
    await capture('route-large-text')
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await button('history').click()
    await page.locator('.history-card summary').click()
    assert.equal(await page.locator('.history-total').textContent(), `${total} km`)
    await capture('history')
    await button('editWorkday').click()
    const first = page.locator('.history-editor input').first()
    const original = await first.inputValue()
    await first.fill('')
    await button('saveChanges').click()
    await page.locator('.history-editor [aria-invalid=true]').first().waitFor()
    // The fixture has zero seconds; restore the minute-only native value.
    await first.fill(original.slice(0, 16))
    assert.equal(await page.locator('.history-editor .editor-error').count(), 0, 'Corrected field removes obsolete errors')
    assert.equal(await first.getAttribute('aria-invalid'), 'false')
    await capture('editor')
    await button('cancelEdit').click()
    await page.locator('.history-editor').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => localStorage.getItem('workday-tracker-history')), history, 'Validation and cancellation preserve exact history')
    assert.equal(await page.evaluate(() => localStorage.getItem('workday-tracker-current')), current, 'Formatting leaves original distances unchanged')
    await button('options').click()
    await capture('options')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine} ${language} ${width}: decimal display, error recovery, original values, Today/History/Options and large-text route`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
