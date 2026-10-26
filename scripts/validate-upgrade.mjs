import assert from 'node:assert/strict'
import { upgradeScenarios } from './upgrade-fixtures.mjs'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { resolve, join, extname, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { deployment } from '../deployment.config.mjs'
import { importWorkdaysFromCsv } from '../src/csvImport.js'

const baselineRef = process.env.UPGRADE_BASELINE || 'v1.5.0'
const baselineSha = execFileSync('git', ['rev-parse', `${baselineRef}^{commit}`], { encoding: 'utf8' }).trim()
const { version } = JSON.parse(await readFile('package.json', 'utf8'))
const output = resolve('artifacts/upgrade-ui', new Date().toISOString().replaceAll(':', '-'))
const source = join(output, 'baseline-source')
const oldDist = join(output, 'baseline-dist')
await mkdir(source, { recursive: true })
execFileSync('git', ['archive', '--format=tar', '--output', join(output, 'baseline.tar'), baselineSha])
execFileSync('tar', ['-xf', join(output, 'baseline.tar'), '-C', source])
const oldPackage = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
const { importWorkdaysFromCsv: importLegacyCsv } = await import(pathToFileURL(join(source, 'src/csvImport.js')))
assert.equal(oldPackage.version, '1.5.0', 'Test must start from the actual production 1.5.0 source')
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', source, '--config', join(source, 'vite.config.js'), '--outDir', oldDist], { stdio: 'inherit' })
assert.ok(existsSync('dist/sw.js'), 'Build the release candidate before running test:upgrade')

let activeRoot = oldDist
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (!path.startsWith(deployment.basePath)) { response.writeHead(404).end(); return }
  const file = resolve(activeRoot, decodeURIComponent(path.slice(deployment.basePath.length)) || 'index.html')
  if (!file.startsWith(activeRoot + sep)) { response.writeHead(403).end(); return }
  try {
    const content = await readFile(file)
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(content)
  } catch { response.writeHead(404).end() }
})
await new Promise((resolve) => server.listen(5182, '127.0.0.1', resolve))
const browserPath = process.env.BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync)
assert.ok(browserPath, 'Set BROWSER_PATH to Edge or Chromium')
const profile = await mkdtemp(join(tmpdir(), 'workday-upgrade-'))
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9342', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))
let socket
const results = []
try {
  let endpoint
  async function waitFor(check, message) {
    for (let i = 0; i < 150; i++) {
      if (await check()) return
      await delay()
    }
    throw new Error(`Timed out: ${message}`)
  }
  await waitFor(async () => {
    try { endpoint = (await (await fetch('http://127.0.0.1:9342/json/version')).json()).webSocketDebuggerUrl; return Boolean(endpoint) } catch { return false }
  }, 'browser startup')
  socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  const pending = new Map()
  let id = 0
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id) pending.get(message.id)?.(message)
  })
  function cdp(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const call = ++id
      const timer = setTimeout(() => { pending.delete(call); reject(new Error(`Browser timeout: ${method}`)) }, 20000)
      pending.set(call, (message) => {
        clearTimeout(timer); pending.delete(call)
        if (message.error) reject(new Error(JSON.stringify(message.error)))
        else resolve(message.result)
      })
      socket.send(JSON.stringify({ id: call, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
  const scenarios = upgradeScenarios()
  for (const scenario of scenarios) {
    activeRoot = oldDist
    const { browserContextId } = await cdp('Target.createBrowserContext')
    const { targetId } = await cdp('Target.createTarget', { url: 'about:blank', browserContextId })
    const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => cdp(method, params, sessionId)
    async function evaluate(expression) {
      const value = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails))
      return value.result.value
    }
    async function click(text) {
      assert.ok(await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); button?.click(); return Boolean(button); })()`), `Button: ${text}`)
      await delay()
    }
    const snapshot = () => evaluate(`Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))`)
    async function waitVersion(expected) {
      await waitFor(async () => {
        try { return await evaluate(`document.querySelector('.app-version')?.textContent === 'v${expected}'`) } catch { return false }
      }, `application v${expected}`)
    }
    await command('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Berlin' })
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await command('Page.navigate', { url: `http://127.0.0.1:5182${deployment.basePath}` })
    await waitVersion('1.5.0')
    await evaluate(`localStorage.setItem('workday-tracker-history', JSON.stringify(${JSON.stringify(scenario.history)}));
      ${scenario.current ? `localStorage.setItem('workday-tracker-current', JSON.stringify(${JSON.stringify(scenario.current)}));` : "localStorage.removeItem('workday-tracker-current');"}
      localStorage.setItem('workday-tracker-language', JSON.stringify(${JSON.stringify(scenario.language)}));
      localStorage.setItem('unrelated-setting', 'must survive'); location.reload();`)
    await delay(300); await waitVersion('1.5.0')
    if (scenario.record) {
      await click('Leave home now')
      await click('Drive home')
      await click('Start driving home')
      await click('Arrived home')
      await click('Confirm arrival home')
    }
    await evaluate('navigator.serviceWorker.ready.then(() => true)')
    await waitFor(() => evaluate('Boolean(navigator.serviceWorker.controller)'), '1.5.0 service worker control')
    await click(scenario.language === 'es' ? 'Historial' : 'History')
    await evaluate(`(() => { const create = URL.createObjectURL; URL.createObjectURL = function(blob) { window.exportedCsv = blob.text(); return create.call(URL, blob); }; })()`)
    await click(scenario.language === 'es' ? 'Exportar CSV' : 'Export CSV')
    const legacyCsv = await evaluate('window.exportedCsv')
    assert.deepEqual(importWorkdaysFromCsv(legacyCsv), importLegacyCsv(legacyCsv), `${scenario.name}: actual 1.5.0 export imports identically`)
    const before = await snapshot()
    await writeFile(join(output, `${scenario.name}-before.json`), JSON.stringify(before, null, 2))
    assert.equal(JSON.parse(before['workday-tracker-history']).length, scenario.record ? 1 : scenario.history.length)
    activeRoot = resolve('dist')
    // Keep the old page and its data alive while the real production SW updates.
    await evaluate('navigator.serviceWorker.getRegistration().then(registration => registration.update()).then(() => true)')
    await delay(300)
    await command('Page.reload')
    await waitVersion(version)
    await delay(200)
    const after = await snapshot()
    assert.deepEqual(after, before, `${scenario.name}: ALL localStorage values must be byte-for-byte identical after upgrade`)
    const unchanged = () => snapshot().then((value) => {
      for (const [key, original] of Object.entries(before)) assert.equal(value[key], original, `${scenario.name}: unchanged ${key}`)
    })
    const historyLabel = scenario.language === 'es' ? 'Historial' : 'History'
    const optionsLabel = scenario.language === 'es' ? 'Ajustes' : 'Options'
    await click(historyLabel)
    assert.equal(await evaluate("document.querySelectorAll('.history-card').length"), JSON.parse(before['workday-tracker-history']).length)
    await click(optionsLabel)
    await unchanged()
    await command('Page.reload'); await delay(300); await waitVersion(version)
    await unchanged()
    await command('Network.enable')
    await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await command('Page.reload'); await delay(300); await waitVersion(version)
    await unchanged()
    await click(historyLabel)
    await evaluate("document.querySelector('.history-card').open = true")
    const image = await command('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(output, `${scenario.name}.png`), Buffer.from(image.data, 'base64'))
    // Cancel an edit on migrated data. It must not modify a single stored value.
    await evaluate("document.querySelector('.timestamp-edit-button').click()")
    await delay()
    await click(scenario.language === 'es' ? 'Cancelar' : 'Cancel')
    await unchanged()
    // Correct one upgraded timestamp offline; every unrelated record/field must survive.
    const expected = JSON.parse(before['workday-tracker-history'])
    const oldTimestamp = expected[0].arrivedHomeAt
    const corrected = new Date(new Date(oldTimestamp).getTime() + 15 * 60000)
    corrected.setMilliseconds(0)
    const correctedIso = corrected.toISOString()
    await evaluate("document.querySelectorAll('.history-timestamp-row .timestamp-edit-button')[1].click()")
    await delay()
    const inputValues = await evaluate(`(() => { const d = new Date(${JSON.stringify(correctedIso)}); const p = n => String(n).padStart(2, '0');
      return {date: d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()), time:p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())}; })()`)
    for (const type of ['date', 'time']) {
      await evaluate(`(() => { const input = document.querySelector('dialog input[type=${type}]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(inputValues[type])});
        input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); })()`)
      await delay()
    }
    await click(scenario.language === 'es' ? 'Revisar cambio' : 'Review change')
    await unchanged()
    await click(scenario.language === 'es' ? 'Confirmar y guardar' : 'Confirm and save')
    expected[0].arrivedHomeAt = correctedIso
    expected[0].timestampCorrections = { arrivedHomeAt: { original: oldTimestamp } }
    const afterEdit = await snapshot()
    assert.deepEqual(JSON.parse(afterEdit['workday-tracker-history']), expected, `${scenario.name}: only intended timestamp and audit metadata change`)
    const oldCurrent = JSON.parse(before['workday-tracker-current'] ?? 'null')
    if (oldCurrent?.id === expected[0].id) assert.deepEqual(JSON.parse(afterEdit['workday-tracker-current']), expected[0])
    else assert.equal(afterEdit['workday-tracker-current'], before['workday-tracker-current'])
    assert.equal(afterEdit['workday-tracker-language'], before['workday-tracker-language'])
    assert.equal(afterEdit['unrelated-setting'], before['unrelated-setting'])
    // Export actual upgraded data; import into memory and compare every exported value.
    await evaluate(`(() => { const create = URL.createObjectURL; URL.createObjectURL = function(blob) { window.exportedCsv = blob.text(); return create.call(URL, blob); }; })()`)
    await click(scenario.language === 'es' ? 'Exportar CSV' : 'Export CSV')
    const restored = importWorkdaysFromCsv(await evaluate('window.exportedCsv'))
    assert.equal(restored.length, expected.length)
    for (let i = 0; i < expected.length; i++) {
      for (const key of ['leftHomeAt', 'arrivedHomeAt', 'kilometresHome']) assert.equal(restored[i][key], expected[i][key])
      assert.equal(restored[i].note, expected[i].note ?? '')
      assert.deepEqual(restored[i].timestampCorrections, expected[i].timestampCorrections)
      assert.equal(restored[i].visits.length, expected[i].visits.length)
      for (let j = 0; j < expected[i].visits.length; j++) {
        for (const key of ['name', 'arrivedAt', 'leftAt', 'kilometres']) assert.equal(restored[i].visits[j][key], expected[i].visits[j][key])
      }
    }
    assert.deepEqual(await snapshot(), afterEdit, 'Export must not modify stored data')
    await command('Page.reload'); await delay(300); await waitVersion(version)
    assert.deepEqual(await snapshot(), afterEdit, 'Offline reload preserves corrections and all unrelated data')
    results.push({ scenario: scenario.name, records: expected.length, baselineSha, storageSha256: createHash('sha256').update(JSON.stringify(before)).digest('hex'), passed: true })
    console.log(`PASS ${scenario.name}: exact upgrade preservation, old CSV, reload, offline, cancel, confirmed edit, originals and new CSV (${expected.length} records)`)
    // Keep isolated contexts alive until browser shutdown (Edge may exit when
    // its last incognito context is disposed between scenarios).
  }
  await writeFile(join(output, 'report.json'), JSON.stringify({ baselineRef, baselineSha, candidateVersion: version, browser: browserPath, scenarios: results }, null, 2))
  console.log(`Upgrade validation passed. Evidence: ${output}`)
} catch (error) {
  await writeFile(join(output, 'report.json'), JSON.stringify({ baselineRef, baselineSha, candidateVersion: version, passed: false, error: error.message, scenarios: results }, null, 2))
  throw error
} finally {
  socket?.close()
  browser.kill()
  server.closeAllConnections()
  server.close()
}
