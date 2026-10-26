import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { deployment } from '../deployment.config.mjs'
import { importWorkdaysFromCsv } from '../src/csvImport.js'

process.on('uncaughtExceptionMonitor', (error) => {
  console.error(`::error::${error.stack.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`)
})

// Uses an isolated browser profile with synthetic records; never opens user data.
const browserPath = process.env.BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync)
assert.ok(browserPath, 'Set BROWSER_PATH to a Chromium browser executable')
const output = resolve('artifacts/history-ui', new Date().toISOString().replaceAll(':', '-'))
await mkdir(output, { recursive: true })
const production = process.argv.includes('--production')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
let browser
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))
async function waitFor(check, description) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return
    await delay()
  }
  throw new Error(`Timed out: ${description}`)
}
try {
  const url = `http://127.0.0.1:5178${deployment.basePath}`
  await waitFor(async () => { try { return (await fetch(url)).ok } catch { return false } }, 'Vite server')
  browser = await chromium.launch({ executablePath: browserPath })
  const context = await browser.newContext()
  const page = await context.newPage()
  const session = await context.newCDPSession(page)
  const cdp = (method, params = {}) => session.send(method, params)
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  async function click(text) {
    assert.ok(await evaluate(`(() => {
      const root = document.querySelector('dialog') || document;
      const button = [...root.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)});
      button?.click(); return Boolean(button);
    })()`), `Button: ${text}`)
    await delay()
  }
  async function screenshot(name) {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(output, name), Buffer.from(data, 'base64'))
  }
  await cdp('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Berlin' })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cdp('Page.navigate', { url })
  await waitFor(() => evaluate("Boolean(document.querySelector('.bottom-nav'))"), 'application')
  const day = {
    id: 42, leftHomeAt: '2026-09-07T15:39:51.123Z', arrivedHomeAt: '2026-09-07T17:40:00.456Z',
    kilometresHome: 27, note: 'Customer visit completed.',
    visits: [{ id: 11, name: 'Customer', arrivedAt: '2026-09-07T16:00:00.789Z', leftAt: '2026-09-07T17:00:00.123Z', kilometres: 30 }],
  }
  await evaluate(`localStorage.setItem('workday-tracker-history', JSON.stringify([${JSON.stringify(day)}]));
    localStorage.setItem('workday-tracker-current', JSON.stringify(${JSON.stringify(day)}));
    localStorage.setItem('workday-tracker-language', '"en"'); location.reload();`)
  await delay(300)
  await waitFor(() => evaluate("Boolean(document.querySelector('.bottom-nav'))"), 'reload')
  assert.ok(await evaluate("Boolean(document.querySelector('.release-notes'))"), 'New version shows release notes')
  await screenshot('release-notes-en.png')
  await evaluate("document.querySelector('[aria-label=\"Dismiss release notes\"]').click()")
  await delay()
  assert.equal(await evaluate("Boolean(document.querySelector('.release-notes'))"), false)
  assert.equal(await evaluate("localStorage.getItem('workday-tracker-last-seen-release')"), '1.6.0')
  assert.deepEqual(JSON.parse(await evaluate("localStorage.getItem('workday-tracker-history')")), [day])
  await click('Options')
  await evaluate("document.querySelector('.release-archive').open = true")
  assert.ok(await evaluate("document.querySelector('.release-archive').textContent.includes('Edit completed workdays')"))
  await evaluate(`(() => { const radio = document.querySelector('input[value="es"]'); radio.click(); })()`)
  await delay()
  assert.ok(await evaluate("document.querySelector('.release-archive').textContent.includes('Novedades')"))
  assert.ok(await evaluate("document.querySelector('.release-archive').textContent.includes('Usa el lápiz')"))
  await screenshot('release-notes-es.png')
  await evaluate("document.querySelector('input[value=en]').click()")
  await delay()
  await click('History')
  await evaluate("document.querySelector('.history-card').open = true")
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.timestamp-edit-button')).every(button =>
    button.getAttribute('aria-label') && button.getAttribute('title') && button.querySelector('svg[aria-hidden="true"]')
    && !button.textContent.trim())`), 'Subtle icon buttons retain accessible names and tooltips')
  for (const width of [320, 390, 485, 1280]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 })
    await evaluate("window.scrollTo(0, document.querySelector('.history-card').getBoundingClientRect().top + scrollY - 12)")
    await delay()
    const rows = await evaluate(`Array.from(document.querySelectorAll('.history-timestamp-row'), row => {
      const text = row.firstElementChild.getBoundingClientRect();
      const button = row.querySelector('button').getBoundingClientRect();
      const box = row.getBoundingClientRect();
      return { textWidth: text.width, height: box.height, buttonWidth: button.width,
        overlap: text.right > button.left, outside: button.right > box.right + 1 };
    })`)
    assert.equal(rows.length, 4)
    for (const row of rows) {
      assert.ok(row.textWidth >= 140, `${width}px: text has readable width: ${JSON.stringify(row)}`)
      assert.ok(row.height < 110, `${width}px: no letter-by-letter wrapping`)
      assert.ok(row.buttonWidth < 100 && !row.overlap && !row.outside, `${width}px: compact Edit button fits`)
    }
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${width}px: no horizontal overflow`)
    await screenshot(`history-${width}.png`)
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate("document.querySelector('[aria-label=\"Edit Arrived home\"]').click()")
  await delay()
  assert.equal(await evaluate("document.activeElement.type"), 'time')
  assert.equal(await evaluate("document.querySelectorAll('dialog input').length"), 2)
  assert.ok(await evaluate("document.querySelector('dialog').getBoundingClientRect().height < 650"), 'Correction dialog fits its content')
  await screenshot('correction-390.png')
  await evaluate(`(() => { const input = document.querySelector('dialog input[type=time]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '19:15');
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await delay()
  const before = await evaluate("localStorage.getItem('workday-tracker-history')")
  await click('Review change')
  assert.equal(await evaluate("localStorage.getItem('workday-tracker-history')"), before)
  assert.ok(await evaluate("Boolean(document.querySelector('.timestamp-review'))"))
  await screenshot('confirmation-390.png')
  await click('Back to editing')
  assert.equal(await evaluate("document.querySelector('dialog input[type=time]').value"), '19:15')
  await click('Review change')
  await click('Confirm and save')
  const saved = JSON.parse(await evaluate("localStorage.getItem('workday-tracker-history')"))[0]
  assert.equal(saved.arrivedHomeAt, '2026-09-07T17:15:00.000Z')
  assert.deepEqual(saved.visits, day.visits)
  assert.equal(saved.note, day.note)
  assert.equal(saved.timestampCorrections.arrivedHomeAt.original, day.arrivedHomeAt)
  assert.equal(await evaluate("document.querySelectorAll('.history-timestamp-row .manual-timestamp').length"), 1)
  assert.ok(await evaluate("Array.from(document.querySelectorAll('.original-timestamp')).some(el => el.textContent.includes('19:40:00'))"))
  assert.equal(JSON.parse(await evaluate("localStorage.getItem('workday-tracker-current')")).arrivedHomeAt, saved.arrivedHomeAt)
  assert.equal(await evaluate("document.querySelector('[role=status]').textContent"), 'Changes saved')
  await screenshot('saved-390.png')
  await evaluate(`(() => { const create = URL.createObjectURL; URL.createObjectURL = function(blob) { window.exportedCsv = blob.text(); return create.call(URL, blob); }; })()`)
  await click('Export CSV')
  const csv = await evaluate('window.exportedCsv')
  const [restored] = importWorkdaysFromCsv(csv)
  assert.deepEqual(restored.timestampCorrections, saved.timestampCorrections)
  await evaluate('location.reload()')
  await delay(300)
  await waitFor(() => evaluate("Boolean(document.querySelector('.bottom-nav'))"), 'reload corrected workday')
  assert.equal(await evaluate("Boolean(document.querySelector('.release-notes'))"), false, 'Dismissal persists after reload')
  await click('History')
  await evaluate("document.querySelector('.history-card').open = true")
  assert.equal(await evaluate("document.querySelectorAll('.history-timestamp-row .manual-timestamp').length"), 1)
  await evaluate("document.querySelector('[aria-label=\"Edit Arrived home\"]').click()")
  await delay()
  assert.ok(await evaluate("document.querySelector('dialog .original-timestamp').textContent.includes('19:40:00')"))
  if (production) {
    await evaluate('navigator.serviceWorker.ready.then(() => true)')
    await waitFor(() => evaluate('Boolean(navigator.serviceWorker.controller)'), 'service worker controls the production app')
    await cdp('Network.enable')
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await cdp('Page.reload')
    await delay(300)
    await waitFor(() => evaluate("Boolean(document.querySelector('.bottom-nav'))"), 'production app loads offline')
    assert.equal(await evaluate("Boolean(document.querySelector('.release-notes'))"), false)
    await click('History')
    await evaluate("document.querySelector('.history-card').open = true")
    assert.equal(await evaluate("document.querySelectorAll('.history-timestamp-row .manual-timestamp').length"), 1)
    await click('Options')
    await evaluate("document.querySelector('.release-archive').open = true")
    assert.ok(await evaluate("document.querySelector('.release-archive').textContent.includes('Edit completed workdays')"))
    await screenshot('offline-release-notes.png')
    console.log('PASS: production service-worker offline reload preserves corrected history, originals, and release notes.')
  }
  console.log(`PASS: English/Spanish release notes and dismissal persistence; layout at 320/390/485/1280px; correction confirmation, originals, stars, CSV round-trip, and save feedback. Screenshots: ${output}`)
} finally {
  await browser?.close()
  server.kill()
}
