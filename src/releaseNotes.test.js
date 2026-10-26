import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LAST_SEEN_RELEASE_KEY, markReleaseNotesSeen, releaseNoteKeys, shouldShowReleaseNotes } from './releaseNotes.js'
import { translate } from './i18n.js'

function storage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('shows release notes on first use and after upgrades, but not after dismissal of the current version', () => {
  const saved = storage()
  assert.equal(shouldShowReleaseNotes('1.6.0', saved), true)
  markReleaseNotesSeen('1.6.0', saved)
  assert.equal(saved.getItem(LAST_SEEN_RELEASE_KEY), '1.6.0')
  assert.equal(shouldShowReleaseNotes('1.6.0', saved), false)
  assert.equal(shouldShowReleaseNotes('1.7.0', saved), true)
})

test('dismissing release notes never changes workday or history storage', () => {
  const saved = storage()
  saved.setItem('workday-tracker-current', 'current data')
  saved.setItem('workday-tracker-history', 'history data')
  markReleaseNotesSeen('1.6.0', saved)
  assert.equal(saved.getItem('workday-tracker-current'), 'current data')
  assert.equal(saved.getItem('workday-tracker-history'), 'history data')
})

test('unavailable storage does not prevent showing or dismissing notes', () => {
  const unavailable = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.equal(shouldShowReleaseNotes('1.6.0', unavailable), true)
  assert.doesNotThrow(() => markReleaseNotesSeen('1.6.0', unavailable))
})

test('release notes are translated in both languages and the current version is documented', () => {
  for (const key of [...releaseNoteKeys, 'whatsNew', 'dismissReleaseNotes']) {
    for (const language of ['en', 'es']) assert.notEqual(translate(language, key), key)
    assert.notEqual(translate('en', key), translate('es', key))
  }
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.ok(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').includes(`## ${version}`))
})
