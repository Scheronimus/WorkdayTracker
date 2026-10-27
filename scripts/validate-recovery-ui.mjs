import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'
import { deployment } from '../deployment.config.mjs'
import { translate } from '../src/i18n.js'
import { importWorkdaysFromCsv } from '../src/csvImport.js'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const output = `artifacts/mobile-ux/recovery-${engine}`
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
const url = `http://127.0.0.1:5196${deployment.basePath}`
const results = []
let browser
try {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 100) throw Error('Recovery preview server did not start')
    try { if ((await fetch(url)).ok) break } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch(executablePath ? { executablePath } : {})
  async function isolated(language) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true,
      timezoneId: 'Europe/Berlin', reducedMotion: 'reduce' })
    await context.addInitScript(language => {
      if (sessionStorage.getItem('recovery-seeded')) return
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('workday-tracker-last-seen-release', '1.6.0')
      sessionStorage.setItem('recovery-seeded', 'true')
    }, language)
    const page = await context.newPage()
    await page.goto(url)
    await page.locator('.bottom-nav').waitFor()
    return { context, page }
  }
  for (const language of ['en', 'es']) {
    const { context, page } = await isolated(language)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const t = (key, args) => translate(language, key, args)
    const button = (key, args) => page.getByRole('button', { name: t(key, args), exact: true })
    const snapshot = () => page.evaluate(() => ({
      current: JSON.parse(localStorage.getItem('workday-tracker-current') ?? 'null'),
      history: JSON.parse(localStorage.getItem('workday-tracker-history') ?? '[]'),
    }))
    async function confirm(key, accept) {
      page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss())
      await button(key).click()
    }
    await button('leaveHomeNow').click()
    let before = await snapshot()
    await confirm('undoTimestamp', false)
    assert.deepEqual(await snapshot(), before, 'Cancelled leave-home undo preserves data')
    await confirm('undoTimestamp', true)
    const undoneHome = structuredClone(before)
    undoneHome.current.leftHomeAt = null
    assert.deepEqual(await snapshot(), undoneHome)
    await button('leaveHomeNow').click()
    await button('addDayNote').click()
    await page.locator('textarea').fill('Recovery check: notes must survive.')
    await page.keyboard.press('Escape')
    async function add(name, km) {
      await button('addNextStop').click()
      await page.locator('#customer-name').fill(name)
      if (km !== '') await page.locator('.add-customer input[type=number]').fill(km)
      await button('addToRoute').click()
    }
    await add('Alpha', '0')
    await button('arrivedAt', { name: 'Alpha' }).click()
    await button('leaveCustomer', { name: 'Alpha' }).click()
    before = await snapshot()
    assert.equal(await page.locator('.trip-list .undo-timestamp-button').count(), 1)
    await confirm('undoTimestamp', false)
    assert.deepEqual(await snapshot(), before)
    await confirm('undoTimestamp', true)
    const undoneDeparture = structuredClone(before)
    undoneDeparture.current.visits[0].leftAt = null
    assert.deepEqual(await snapshot(), undoneDeparture, 'Compact-route Undo clears only departure')
    await button('leaveCustomer', { name: 'Alpha' }).click()
    await add('Beta', '')
    before = await snapshot()
    await confirm('undoTimestamp', true)
    const undonePrevious = structuredClone(before)
    undonePrevious.current.visits[0].leftAt = null
    assert.deepEqual(await snapshot(), undonePrevious, 'Undo preserves the later untimestamped customer')
    assert.ok(await page.locator('.current-stop').getByRole('heading', { name: 'Alpha', exact: true }).isVisible())
    await button('leaveCustomer', { name: 'Alpha' }).click()
    await button('arrivedAt', { name: 'Beta' }).click()
    await button('leaveCustomer', { name: 'Beta' }).click()
    await button('driveHome').click()
    await button('startDriveHome').click()
    before = await snapshot()
    await page.reload()
    await button('arrivedHomeNow').waitFor()
    assert.deepEqual(await snapshot(), before, 'Home journey, notes and distances persist through reload')
    await button('arrivedHomeNow').click()
    await page.locator('.finish-sheet input').fill('10')
    await button('confirmArrivalHome').click()
    before = await snapshot()
    await confirm('reopenWorkday', false)
    assert.deepEqual(await snapshot(), before)
    await confirm('reopenWorkday', true)
    const reopened = structuredClone(before.current)
    reopened.arrivedHomeAt = null
    assert.deepEqual(await snapshot(), { current: reopened, history: [] }, 'Reopen removes only arrival and the completed-history entry')
    await button('arrivedHomeNow').click()
    await button('confirmArrivalHome').click()
    before = await snapshot()
    await button('history').click()
    const downloadPromise = page.waitForEvent('download')
    await button('exportCsv').click()
    const download = await downloadPromise
    const csv = await readFile(await download.path(), 'utf8')
    const expectedImport = importWorkdaysFromCsv(csv)
    assert.equal(expectedImport.length, 1)
    assert.deepEqual(expectedImport[0].visits.map(visit => [visit.name, visit.kilometres]), [['Alpha', 0], ['Beta', null]])
    assert.equal(expectedImport[0].note, before.current.note)
    await button('options').click()
    await page.locator('input[type=file]').setInputFiles({ name: 'history.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    assert.equal(await page.locator('.import-status').textContent(), t('importNoNewDays'))
    assert.deepEqual(await snapshot(), before, 'Duplicate import is a no-op')
    await button('today').click()
    await button('startNewDay').click()
    assert.deepEqual((await snapshot()).history, before.history, 'Preparing another day preserves completed history')
    assert.equal((await snapshot()).current.leftHomeAt, null)
    // Restore through the real import UI in a fresh isolated browser context.
    const restore = await isolated(language)
    const restoreButton = key => restore.page.getByRole('button', { name: t(key), exact: true })
    await restoreButton('options').click()
    const file = { name: 'history.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) }
    restore.page.once('dialog', dialog => dialog.dismiss())
    await restore.page.locator('input[type=file]').setInputFiles(file)
    assert.deepEqual(await restore.page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history'))), [])
    restore.page.once('dialog', dialog => dialog.accept())
    await restore.page.locator('input[type=file]').setInputFiles(file)
    await restore.page.locator('.import-status.success').waitFor()
    await restore.page.waitForFunction(() => JSON.parse(localStorage.getItem('workday-tracker-history') ?? '[]').length === 1)
    assert.deepEqual(await restore.page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history'))), expectedImport)
    await restoreButton('history').click()
    await restore.page.locator('.history-card summary').click()
    assert.equal(await restoreButton('reopenWorkday').count(), 0, 'Imported history cannot be reopened as a local workday')
    await restore.page.screenshot({ path: `${output}/${language}-restored-history.png` })
    restore.page.once('dialog', dialog => dialog.dismiss())
    await restoreButton('deleteDay').click()
    assert.deepEqual(await restore.page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history'))), expectedImport)
    restore.page.once('dialog', dialog => dialog.accept())
    await restoreButton('deleteDay').click()
    await restore.page.waitForFunction(() => JSON.parse(localStorage.getItem('workday-tracker-history') ?? '[]').length === 0)
    await restore.page.reload()
    await restore.page.locator('.bottom-nav').waitFor()
    assert.deepEqual(await restore.page.evaluate(() => JSON.parse(localStorage.getItem('workday-tracker-history'))), [])
    assert.deepEqual(errors, [])
    results.push({ engine, language, passed: true })
    console.log(`PASS ${engine} ${language}: leave-home/departure Undo, later-stop recovery, reopen, notes, reload, CSV restore/duplicates, new day and deletion`)
    await restore.context.close()
    await context.close()
  }
  await writeFile(`${output}/report.json`, JSON.stringify({ results }, null, 2))
} finally {
  await browser?.close()
  server.kill()
}
