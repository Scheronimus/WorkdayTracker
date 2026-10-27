/* global document, window */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { chromium, webkit } from '@playwright/test'
import { translate } from '../src/i18n.js'
import { deployment } from '../deployment.config.mjs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const output = `artifacts/mobile-ux/route-${engine}`
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5194', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5194${deployment.basePath}`
let browser
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw Error('Route preview server did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch(executablePath ? { executablePath } : {})
  for (const language of ['en', 'es']) for (const width of [320, 390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: true, deviceScaleFactor: 1,
      timezoneId: 'Europe/Berlin', reducedMotion: 'reduce' })
    await context.addInitScript(language => {
      const now = Date.now()
      const time = minutes => new Date(now - minutes * 60000).toISOString()
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('workday-tracker-last-seen-release', '1.6.0')
      localStorage.setItem('workday-tracker-current', JSON.stringify({ id: 42, leftHomeAt: time(120), arrivedHomeAt: null,
        homeJourneyStarted: false, kilometresHome: null, note: '', visits: [12.5, 0, null, 8.2].map((kilometres, index) => ({
          id: index + 1, name: `${language === 'es' ? 'cliente' : 'Customer '}${index + 1}`, kilometres,
          arrivedAt: time(100 - index * 20), leftAt: time(90 - index * 20),
        })) }))
    }, language)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const t = (key, args) => translate(language, key, args)
    const current = () => page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-current')))
    const button = key => page.getByRole('button', { name: t(key), exact: true })
    await page.goto(url)
    await page.locator('.trip-list').waitFor()
    const before = await current()
    assert.equal(await page.locator('.trip-list > li').count(), 5, 'No unentered final home')
    assert.equal(await page.locator('.trip-list .visit-card').count(), 0, 'Route has no white visit cards')
    assert.equal(await page.locator('.trip-leg.missing').count(), 1, 'Zero is recorded, not missing')
    assert.equal(await page.locator('.trip-list .undo-timestamp-button').count(), 1)
    await page.locator('.route-heading').scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.route-heading').getBoundingClientRect().top + window.scrollY - 20))
    await page.screenshot({ path: `${output}/${language}-${width}-route.png` })
    const firstEdit = page.locator('.trip-edit').first()
    await firstEdit.click()
    assert.equal(await page.locator('dialog input').first().inputValue(), before.visits[0].name)
    await page.locator('dialog input').first().fill('Unsaved')
    await button('cancelEdit').click()
    assert.deepEqual(await current(), before, 'Cancel preserves every value')
    assert.ok(await firstEdit.evaluate(el => el === document.activeElement))
    await firstEdit.click()
    await page.locator('dialog input').first().fill(' ')
    await button('saveChanges').click()
    assert.ok(await page.getByText(t('requiredName'), { exact: true }).isVisible())
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-invalid') === 'true')
    assert.ok(await page.locator('dialog input').first().evaluate(el => el === document.activeElement))
    const renamed = language === 'es' ? 'Oficina Norte' : 'North Office'
    await page.locator('dialog input').first().fill(renamed)
    await page.locator('dialog input[type=number]').fill('15.5')
    assert.equal(await page.locator('.stop-editor .editor-error').count(), 0, 'Corrected fields clear outdated errors')
    await page.screenshot({ path: `${output}/${language}-${width}-edit.png` })
    await button('saveChanges').click()
    const expected = structuredClone(before)
    expected.visits[0].name = renamed
    expected.visits[0].kilometres = 15.5
    assert.deepEqual(await current(), expected, 'Only customer name and incoming km change')
    const nextLeg = page.getByRole('button', { name: t('editLeg', { from: renamed, to: before.visits[1].name }), exact: true })
    await nextLeg.click()
    assert.ok(await page.locator('dialog input[type=number]').evaluate(el => el === document.activeElement))
    await page.keyboard.press('Escape')
    assert.deepEqual(await current(), expected)
    await page.locator('.trip-leg.missing').click()
    await page.locator('dialog input[type=number]').fill('0')
    await button('saveChanges').click()
    expected.visits[2].kilometres = 0
    assert.deepEqual(await current(), expected)
    assert.equal(await page.locator('.trip-leg.missing').count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await button('driveHome').click()
    await page.locator('.finish-sheet input').fill('10')
    await button('startDriveHome').click()
    assert.equal(await page.locator('.trip-list > li').count(), 6, 'Final home appears only after starting home journey')
    assert.equal(await page.locator('.trip-marker.reached').count(), 0, 'Travelling home is not marked as arrived')
    await page.locator('.trip-leg').last().click()
    assert.equal(await page.locator('dialog input').count(), 1, 'Home leg edits distance only')
    await page.locator('dialog input').fill('11')
    await button('saveChanges').click()
    expected.homeJourneyStarted = true
    expected.kilometresHome = 11
    assert.deepEqual(await current(), expected, 'Editing home km does not record arrival')
    await button('arrivedHomeNow').click()
    await button('confirmArrivalHome').click()
    const completed = await current()
    await button('history').click()
    await page.locator('.history-card summary').first().click()
    const card = page.locator('.history-card').first()
    assert.equal(await card.locator('.trip-list > li').count(), 6, 'History uses the same route including recorded home arrival')
    assert.equal(await card.locator('.trip-list > li:last-child .trip-marker.reached .ui-icon').count(), 1, 'Recorded arrival home shows a completion check')
    assert.equal(await card.locator('.history-timestamp-row').count(), 10, 'All timestamp corrections remain available')
    assert.equal(await card.locator('.undo-timestamp-button').count(), 0, 'No live Undo on completed routes')
    const history = () => page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history')))
    const savedHistory = await history()
    await card.locator('.trip-edit').first().click()
    await page.locator('dialog input').first().fill('Cancelled historical change')
    await button('cancelEdit').click()
    assert.deepEqual(await history(), savedHistory)
    await card.locator('.trip-edit').first().click()
    await page.locator('dialog input').first().fill(`${renamed} 2`)
    await button('saveChanges').click()
    const updated = structuredClone(completed)
    updated.visits[0].name = `${renamed} 2`
    assert.deepEqual((await history())[0], updated, 'Historical stop edit changes only the name')
    assert.deepEqual(await current(), updated, 'Matching completed Today record stays synchronized')
    await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
    await button('cancelEdit').click()
    assert.deepEqual((await history())[0], updated, 'Cancelling timestamp correction preserves the edited route')
    await card.locator('summary').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/${language}-${width}-history.png` })
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine} ${language} ${width}: compact route, missing/zero km, name/distance draft, validation, focus, timestamps and conditional home`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
