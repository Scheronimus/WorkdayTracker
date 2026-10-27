/* global document, innerWidth, innerHeight, getComputedStyle */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'
import { deployment } from '../deployment.config.mjs'
import { translate } from '../src/i18n.js'
import { importWorkdaysFromCsv } from '../src/csvImport.js'

// Dedicated profiles and synthetic workdays only. No personal browser storage.
const useWebkit = process.argv.includes('--webkit')
const output = `artifacts/mobile-ux${useWebkit ? '/webkit' : ''}`
await mkdir(output, { recursive: true })
const production = process.argv.includes('--production')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5192${deployment.basePath}`
const browserPath = process.env.BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync)
let browser
const baseline = {
  id: 41, leftHomeAt: '2026-10-23T21:00:00.123Z', arrivedHomeAt: '2026-10-24T02:00:00.456Z',
  kilometresHome: null, note: '',
  visits: [{ id: 11, name: 'Oficina del cliente con un nombre considerablemente largo', arrivedAt: '2026-10-23T23:00:00.789Z', leftAt: '2026-10-24T01:00:00.123Z', kilometres: 12.5 }],
  timestampCorrections: { arrivedHomeAt: { original: '2026-10-24T01:45:00.456Z' } },
}
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw new Error('UX validation server did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = useWebkit ? await webkit.launch() : await chromium.launch(browserPath ? { executablePath: browserPath } : {})
  for (const language of ['en', 'es']) {
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true,
        deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: language === 'es' ? 'es-ES' : 'en-GB', reducedMotion: 'reduce' })
      await context.addInitScript(({ language, baseline }) => {
        if (sessionStorage.getItem('mobile-ux-seeded')) return
        localStorage.setItem('workday-tracker-language', JSON.stringify(language))
        localStorage.setItem('workday-tracker-history', JSON.stringify([baseline]))
        sessionStorage.setItem('mobile-ux-seeded', 'true')
      }, { language, baseline })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const t = (key, replacements) => translate(language, key, replacements)
      const button = key => page.getByRole('button', { name: t(key), exact: true })
      const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history')))
      async function noOverflow() {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}/${width}: horizontal overflow`)
      }
      async function capture(name) {
        await noOverflow()
        await page.screenshot({ path: `${output}/${language}-${width}-${name}.png` })
      }
      async function modalKeyboardCheck() {
        assert.ok(await page.locator('dialog').evaluate(el => el.matches(':modal')), 'Native modal is open')
        for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
          await page.keyboard.press(key)
          assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))), `${key} stays inside the modal`)
        }
      }
      await page.goto(url)
      await page.locator('.bottom-nav').waitFor({ state: 'visible' })
      await page.waitForFunction(language => document.documentElement.lang === language, language)
      assert.equal(await page.locator('html').getAttribute('lang'), language)
      assert.equal(await page.locator('.release-preview').getAttribute('open'), null)
      await page.locator('.release-preview summary').click()
      assert.ok(await page.getByText(t('releaseStatistics'), { exact: true }).isVisible())
      await button('dismissReleaseNotes').click()
      assert.deepEqual(await saved(), [baseline])
      await capture('ready')
      await button('leaveHomeNow').click()
      const noteButton = button('addDayNote')
      await noteButton.click()
      assert.equal(await page.locator('textarea').getAttribute('aria-label'), t('dayNote'))
      await page.locator('textarea').focus()
      await page.keyboard.press('Shift+Tab')
      assert.ok(await page.locator('dialog .close-sheet').evaluate(el => el === document.activeElement), 'Reverse Tab reaches the close control before leaving the textarea')
      await page.keyboard.press('Tab')
      assert.ok(await page.locator('textarea').evaluate(el => el === document.activeElement), 'Forward Tab returns from close to the note field')
      await modalKeyboardCheck()
      await page.locator('textarea').fill(`Nota / Note ${language}`)
      await capture('note')
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('dialog').count(), 0)
      assert.ok(await button('editDayNote').evaluate(el => el === document.activeElement), 'Return focus to note opener')
      await button('addNextStop').click()
      await modalKeyboardCheck()
      const name = language === 'es' ? 'Taller central de mantenimiento y servicio del cliente' : 'Central customer maintenance and service workshop'
      await page.locator('#customer-name').fill(name)
      await page.locator('.add-customer input[type=number]').fill('12.5')
      // A shorter visual viewport exercises the same CSS sizing path used by
      // the mobile keyboard; physical keyboard behavior still needs device QA.
      await page.setViewportSize({ width, height: 420 })
      await page.locator('.add-customer input[type=number]').focus()
      await page.locator('.add-customer button').scrollIntoViewIfNeeded()
      assert.ok(await page.locator('.add-customer button').evaluate(el => {
        const box = el.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight
      }), 'Submit remains reachable in a keyboard-sized viewport')
      await capture('customer-small-viewport')
      await page.setViewportSize({ width, height: 844 })
      await button('addToRoute').click()
      const arrival = page.getByRole('button', { name: t('arrivedAt', { name }), exact: true })
      assert.ok(await arrival.evaluate(el => el === document.activeElement), 'Focus moves to next available action')
      await arrival.click()
      page.once('dialog', dialog => dialog.accept())
      await button('undoTimestamp').click()
      await arrival.click()
      await capture('current-stop')
      // The dock is measured against the real navigation, including font growth.
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
      await page.waitForTimeout(100)
      await noOverflow()
      assert.ok(await page.locator('.action-dock').evaluate(el => {
        const dock = el.getBoundingClientRect()
        const nav = document.querySelector('.bottom-nav').getBoundingClientRect()
        return Math.abs(dock.bottom - nav.top) < 2
      }), 'Dock clears enlarged navigation')
      assert.ok(await page.locator('.bottom-nav button').evaluateAll(buttons => buttons.every(button => {
        const bounds = button.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(button)
        return [...range.getClientRects()].every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1)
      })), 'Enlarged navigation labels stay inside their own targets')
      await capture('large-text')
      await page.evaluate(() => { document.documentElement.style.fontSize = '' })
      await page.getByRole('button', { name: t('leaveCustomer', { name }), exact: true }).click()
      await button('driveHome').click()
      await modalKeyboardCheck()
      await page.keyboard.press('Escape')
      assert.ok(await button('driveHome').evaluate(el => el === document.activeElement), 'Return focus to home journey opener')
      await button('driveHome').click()
      await page.locator('.finish-sheet input').fill('9.5')
      await button('startDriveHome').click()
      await button('arrivedHomeNow').click()
      await modalKeyboardCheck()
      await button('confirmArrivalHome').click()
      assert.equal((await saved()).length, 2)
      assert.deepEqual((await saved()).find(day => day.id === baseline.id), baseline)
      await button('history').click()
      const card = page.locator('.history-card').last()
      await card.locator('summary').click()
      assert.ok((await card.locator('.history-total').textContent()).includes(t('kilometresRecorded', { count: new Intl.NumberFormat(language).format(12.5) })))
      assert.equal(await card.locator('.history-day-note').count(), 0, 'Empty note is not an apparent editing prompt')
      assert.ok((await card.locator('[data-timestamp-path=arrivedHomeAt]').textContent()).includes('2026'), 'Overnight arrival retains its date')
      assert.ok(await card.locator('.original-timestamp').first().isVisible())
      await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
      await modalKeyboardCheck()
      await button('cancelEdit').click()
      assert.ok(await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').evaluate(el => el === document.activeElement), 'Timestamp opener regains focus')
      await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
      await page.locator('dialog input[type=time]').fill('04:15:00')
      const beforeReview = await saved()
      await button('reviewCorrection').click()
      assert.deepEqual(await saved(), beforeReview, 'Review does not save')
      await capture('timestamp-review')
      await button('confirmSave').click()
      const corrected = (await saved()).find(day => day.id === baseline.id)
      assert.equal(corrected.arrivedHomeAt, '2026-10-24T02:15:00.000Z')
      assert.equal(corrected.timestampCorrections.arrivedHomeAt.original, baseline.timestampCorrections.arrivedHomeAt.original)
      await card.locator('summary').scrollIntoViewIfNeeded()
      await capture('history')
      const beforeDraft = await saved()
      await card.getByRole('button', { name: t('editWorkday'), exact: true }).click()
      await page.locator('dialog textarea').fill('Draft that must not be saved')
      await page.keyboard.press('Escape')
      await button('keepEditing').click()
      await button('cancelEdit').click()
      await button('discardChanges').click()
      assert.deepEqual(await saved(), beforeDraft, 'Discarding the draft preserves every history value')
      assert.equal((await saved()).find(day => day.id === baseline.id).note, '')
      const downloadPromise = page.waitForEvent('download')
      await button('exportCsv').click()
      const download = await downloadPromise
      const exported = importWorkdaysFromCsv(await readFile(await download.path(), 'utf8'))
      assert.equal(exported.length, 2)
      assert.deepEqual(exported.find(day => String(day.id) === String(baseline.id)).timestampCorrections, corrected.timestampCorrections)
      await button('options').click()
      const chooser = page.locator('.import-button')
      assert.ok(await chooser.evaluate(el => el.getBoundingClientRect().height >= 48), 'CSV target is at least 48px tall')
      await page.keyboard.press('Tab')
      await page.locator('input[type=file]').focus()
      assert.equal(await chooser.evaluate(el => getComputedStyle(el).outlineStyle), 'solid', 'File chooser has keyboard focus styling')
      await page.locator('input[type=file]').setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('invalid') })
      assert.equal(await page.locator('.import-status').textContent(), t('importInvalidFile'))
      await page.locator('.release-archive summary').click()
      assert.ok(await page.getByText(t('releaseTransfer'), { exact: true }).isVisible())
      await capture('options')
      await page.reload()
      await page.locator('.bottom-nav').waitFor({ state: 'visible' })
      await page.waitForFunction(language => document.documentElement.lang === language, language)
      assert.equal(await page.locator('html').getAttribute('lang'), language)
      assert.equal(await page.locator('.release-notes').count(), 0, 'Dismissal survives reload')
      assert.equal((await saved()).length, 2)
      // Reopened/corrected records can retain a departure while arrival is
      // missing. The next actionable visit must still be prominent/editable.
      await page.evaluate(baseline => {
        localStorage.setItem('workday-tracker-current', JSON.stringify({ ...baseline, arrivedHomeAt: null,
          homeJourneyStarted: false, visits: baseline.visits.map(visit => ({ ...visit, arrivedAt: null })) }))
      }, baseline)
      await page.reload()
      await page.locator('.current-stop .visit-card.current').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.current-stop .compact').count(), 0)
      assert.ok(await page.locator('.current-stop input').isVisible())
      assert.ok(await page.getByRole('button', { name: t('arrivedAt', { name: baseline.visits[0].name }), exact: true }).isVisible())
      assert.deepEqual(errors, [], 'No browser runtime errors')
      console.log(`PASS ${language} ${width}px: complete workday, undo, all sheets, focus, keyboard-sized viewport, enlarged text, overnight corrections, draft discard, CSV, language and persistence`)
      await context.close()
    }
  }
  console.log(`Screenshots: ${output}`)
} finally {
  await browser?.close()
  server.kill()
}
