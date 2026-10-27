import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { upgradeScenarios } from '../scripts/upgrade-fixtures.mjs'
import { deployment } from '../deployment.config.mjs'
import { importWorkdaysFromCsv } from '../src/csvImport.js'

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const snapshot = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])))
const text = (language, en, es) => language === 'es' ? es : en

async function expectVersion(page, value) {
  await expect(page.locator('.app-version')).toHaveText(`v${value}`)
}

for (const scenario of upgradeScenarios()) {
  test(`1.5.0 upgrade preserves ${scenario.name}`, async ({ page, request }, testInfo) => {
    const baseline = await request.post('/__upgrade/baseline')
    await testInfo.attach('baseline-commit', { body: await baseline.text(), contentType: 'text/plain' })
    await page.goto(deployment.basePath)
    await expectVersion(page, '1.5.0')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('workday-tracker-history'))).not.toBeNull()
    await page.evaluate(({ current, history, language }) => {
      localStorage.setItem('workday-tracker-history', JSON.stringify(history))
      if (current) localStorage.setItem('workday-tracker-current', JSON.stringify(current))
      else localStorage.removeItem('workday-tracker-current')
      localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      localStorage.setItem('unrelated-setting', 'must survive')
    }, scenario)
    await page.reload()
    if (scenario.record) {
      for (const label of ['Leave home now', 'Drive home', 'Start driving home', 'Arrived home', 'Confirm arrival home']) {
        await page.getByRole('button', { name: label, exact: true }).click()
      }
      await expect(page.getByRole('button', { name: 'Start new day', exact: true })).toBeVisible()
    }
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await expectVersion(page, '1.5.0')
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    const before = await snapshot(page)
    await testInfo.attach('before-storage', { body: JSON.stringify(before, null, 2), contentType: 'application/json' })
    const expected = JSON.parse(before['workday-tracker-history'])
    expect(expected).toHaveLength(scenario.record ? 1 : scenario.history.length)
    await request.post('/__upgrade/candidate')
    // Browser-native registration APIs also work in WebKit, without CDP or
    // Playwright's Chromium-only service-worker inspection API.
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      await new Promise((resolve, reject) => {
        const changed = () => { clearTimeout(timer); resolve() }
        const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', changed); reject(new Error('Updated service worker did not take control')) }, 20000)
        navigator.serviceWorker.addEventListener('controllerchange', changed, { once: true })
        registration.update().catch((error) => { clearTimeout(timer); reject(error) })
      })
    })
    await page.reload()
    await expectVersion(page, version)
    expect(await snapshot(page)).toEqual(before)
    await page.getByRole('button', { name: text(scenario.language, 'History', 'Historial'), exact: true }).click()
    await expect(page.locator('.history-card')).toHaveCount(expected.length)
    await page.reload()
    await expectVersion(page, version)
    expect(await snapshot(page)).toEqual(before)
    // WebKit's forced-offline transport can fail before a SW handles navigation.
    // Return 503 for every app resource instead; cached loading must still work.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    await request.post('/__upgrade/unavailable')
    expect((await request.get(deployment.basePath)).status()).toBe(503)
    await page.reload()
    await expectVersion(page, version)
    expect(await snapshot(page)).toEqual(before)
    await page.getByRole('button', { name: text(scenario.language, 'History', 'Historial'), exact: true }).click()
    const card = page.locator('.history-card').first()
    await card.locator('summary').click()
    await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
    await page.getByRole('button', { name: text(scenario.language, 'Cancel', 'Cancelar'), exact: true }).click()
    expect(await snapshot(page)).toEqual(before)
    await card.locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
    const oldTime = expected[0].arrivedHomeAt
    const corrected = new Date(new Date(oldTime).getTime() + 15 * 60000)
    corrected.setMilliseconds(0)
    const iso = corrected.toISOString()
    const values = await page.evaluate((iso) => {
      const date = new Date(iso)
      const pad = (number) => String(number).padStart(2, '0')
      return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` }
    }, iso)
    await page.locator('dialog input[type=date]').fill(values.date)
    await page.locator('dialog input[type=time]').fill(values.time)
    await page.getByRole('button', { name: text(scenario.language, 'Review change', 'Revisar cambio'), exact: true }).click()
    await expect(page.locator('.timestamp-review')).toBeVisible()
    expect(await snapshot(page)).toEqual(before)
    await page.screenshot({ path: testInfo.outputPath('confirmation.png') })
    await page.getByRole('button', { name: text(scenario.language, 'Confirm and save', 'Confirmar y guardar'), exact: true }).click()
    await expect(page.locator('dialog')).toHaveCount(0)
    expected[0].arrivedHomeAt = iso
    expected[0].timestampCorrections = { arrivedHomeAt: { original: oldTime } }
    const after = await snapshot(page)
    expect(JSON.parse(after['workday-tracker-history'])).toEqual(expected)
    const current = JSON.parse(before['workday-tracker-current'] ?? 'null')
    if (current?.id === expected[0].id) expect(JSON.parse(after['workday-tracker-current'])).toEqual(expected[0])
    else expect(after['workday-tracker-current']).toBe(before['workday-tracker-current'])
    expect(after['workday-tracker-language']).toBe(before['workday-tracker-language'])
    expect(after['unrelated-setting']).toBe(before['unrelated-setting'])
    await expect(card.locator('.history-timestamp-row .manual-timestamp')).toHaveCount(1)
    await page.evaluate(() => {
      const create = URL.createObjectURL
      URL.createObjectURL = (blob) => { window.exportedCsv = blob.text(); return create.call(URL, blob) }
    })
    await page.getByRole('button', { name: text(scenario.language, 'Export CSV', 'Exportar CSV'), exact: true }).click()
    const restored = importWorkdaysFromCsv(await page.evaluate(() => window.exportedCsv))
    expect(restored).toHaveLength(expected.length)
    for (let index = 0; index < expected.length; index++) {
      const original = expected[index]
      const imported = restored[index]
      for (const field of ['leftHomeAt', 'arrivedHomeAt', 'kilometresHome', 'timestampCorrections']) expect(imported[field]).toEqual(original[field])
      expect(imported.note).toBe(original.note ?? '')
      expect(imported.visits).toHaveLength(original.visits.length)
      for (let visitIndex = 0; visitIndex < original.visits.length; visitIndex++) {
        for (const field of ['name', 'arrivedAt', 'leftAt', 'kilometres']) expect(imported.visits[visitIndex][field]).toEqual(original.visits[visitIndex][field])
      }
    }
    await page.reload()
    await expectVersion(page, version)
    expect(await snapshot(page)).toEqual(after)
    await testInfo.attach('after-storage', { body: JSON.stringify(after, null, 2), contentType: 'application/json' })
  })
}

for (const language of ['en', 'es']) {
  for (const width of [320, 375, 390, 430]) {
    test(`iPhone layout and version notice ${language} ${width}px`, async ({ page, request }, testInfo) => {
      await request.post('/__upgrade/candidate')
      await page.setViewportSize({ width, height: 844 })
      await page.goto(deployment.basePath)
      await expectVersion(page, version)
      await expect.poll(() => page.evaluate(() => localStorage.getItem('workday-tracker-history'))).not.toBeNull()
      const scenario = upgradeScenarios()[2]
      await page.evaluate(({ history, language }) => {
        localStorage.setItem('workday-tracker-history', JSON.stringify(history))
        localStorage.setItem('workday-tracker-language', JSON.stringify(language))
      }, { history: scenario.history, language })
      await page.reload()
      await expect(page.locator('.release-notes')).toBeVisible()
      await expect(page.locator('.release-notes')).toContainText(text(language, 'What’s new', 'Novedades'))
      await page.getByRole('button', { name: text(language, 'Dismiss release notes', 'Cerrar las novedades') }).click()
      await page.reload()
      await expect(page.locator('.release-notes')).toHaveCount(0)
      await page.getByRole('button', { name: text(language, 'Options', 'Ajustes'), exact: true }).click()
      await page.locator('.release-archive > summary').click()
      await expect(page.locator('.release-archive .release-notes')).toBeVisible()
      await page.getByRole('button', { name: text(language, 'History', 'Historial'), exact: true }).click()
      await page.locator('.history-card').first().locator('summary').click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const rows = await page.locator('.history-timestamp-row').evaluateAll((rows) => rows.filter((row) => row.getBoundingClientRect().height).map((row) => ({
        textWidth: row.firstElementChild.getBoundingClientRect().width,
        buttonWidth: row.querySelector('button').getBoundingClientRect().width,
        height: row.getBoundingClientRect().height,
      })))
      expect(rows.length).toBeGreaterThanOrEqual(2)
      for (const row of rows) { expect(row.textWidth).toBeGreaterThan(140); expect(row.buttonWidth).toBe(44); expect(row.height).toBeLessThan(110) }
      await page.screenshot({ path: testInfo.outputPath('history.png'), fullPage: true })
      await page.locator('.history-card').first().locator('[data-timestamp-path=arrivedHomeAt] .timestamp-edit-button').click()
      await expect(page.locator('dialog input[type=time]')).toBeFocused()
      const dialog = await page.locator('dialog').boundingBox()
      expect(dialog.width).toBeLessThanOrEqual(width)
      expect(dialog.height).toBeLessThan(760)
      await page.screenshot({ path: testInfo.outputPath('correction.png') })
      await page.getByRole('button', { name: text(language, 'Cancel', 'Cancelar'), exact: true }).click()
      await expect(page.locator('dialog')).toHaveCount(0)
    })
  }
}
