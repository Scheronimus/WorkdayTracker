import test from 'node:test'
import assert from 'node:assert/strict'
import { commitHistoryEdit, commitTimestampEdit, createHistoryDraft, historyDraftHasChanges, localDateTime } from './historyEdit.js'
import { importWorkdaysFromCsv } from './csvImport.js'

const original = {
  id: 'import-42', leftHomeAt: '2026-10-25T06:00:00.123Z', arrivedHomeAt: '2026-10-25T18:00:00.456Z',
  note: 'Original', kilometresHome: null,
  visits: [{ id: 'visit-1', name: 'Customer', arrivedAt: '2026-10-25T08:00:00.789Z', leftAt: '2026-10-25T09:00:00.123Z', kilometres: 5 }],
}

test('draft and cancelled edits never mutate original data', () => {
  const before = structuredClone(original)
  const draft = createHistoryDraft(original)
  draft.visits[0].name = 'Changed'
  draft.note = 'Changed'
  assert.deepEqual(original, before)
})

test('native omission of zero seconds does not create unsaved timestamp changes', () => {
  const before = structuredClone(original)
  const draft = createHistoryDraft(original)
  draft.leftHomeAt = draft.leftHomeAt.replace(/:00$/, '')
  draft.arrivedHomeAt = draft.arrivedHomeAt.replace(/:00$/, '')
  for (const visit of draft.visits) {
    visit.arrivedAt = visit.arrivedAt.replace(/:00$/, '')
    visit.leftAt = visit.leftAt.replace(/:00$/, '')
  }
  assert.equal(historyDraftHasChanges(original, draft), false)
  assert.deepEqual(original, before, 'Original instants and milliseconds remain untouched')
})

test('actual timestamp, invalid-field and non-time edits still require a discard decision', () => {
  for (const change of [
    draft => { draft.leftHomeAt = '' },
    draft => { draft.leftHomeAt = 'invalid' },
    draft => { draft.visits[0].leftAt = draft.visits[0].leftAt.replace(/:00$/, ':01') },
    draft => { draft.note = 'changed' },
    draft => { draft.visits[0].name = 'changed' },
    draft => { draft.kilometresHome = 0 },
  ]) {
    const draft = createHistoryDraft(original)
    change(draft)
    assert.equal(historyDraftHasChanges(original, draft), true)
  }
})

test('names, notes and kilometres save without timestamp confirmation and preserve exact instants and IDs', () => {
  const draft = createHistoryDraft(original)
  draft.visits[0].name = 'New customer'
  draft.note = 'New note'
  draft.visits[0].kilometres = '0'
  draft.kilometresHome = '12.5'
  const result = commitHistoryEdit(original, draft)
  assert.equal(result.saved, true)
  assert.deepEqual(result.changes, [])
  assert.equal(result.day.leftHomeAt, original.leftHomeAt)
  assert.equal(result.day.visits[0].arrivedAt, original.visits[0].arrivedAt)
  assert.equal(result.day.id, original.id)
  assert.equal(result.day.visits[0].id, original.visits[0].id)
  assert.equal(result.day.visits[0].kilometres, 0)
  assert.equal(result.day.kilometresHome, 12.5)
})

test('every timestamp change blocks saving until explicit confirmation, including clearing optional times', () => {
  for (const field of ['leftHomeAt', 'arrivedHomeAt', 'arrivedAt', 'leftAt']) {
    const draft = createHistoryDraft(original)
    if (field.endsWith('HomeAt')) draft[field] = field === 'leftHomeAt' ? '2026-10-24T23:00:00' : '2026-10-26T02:00:00'
    else draft.visits[0][field] = ''
    draft.note = 'Changed together'
    const pending = commitHistoryEdit(original, draft)
    assert.equal(pending.saved, false, field)
    assert.equal(pending.changes.length, 1)
    assert.ok(pending.changes[0].before)
    assert.equal(commitHistoryEdit(original, draft, true).saved, true, field)
    assert.equal(original.note, 'Original')
  }
})

test('rejects invalid timestamps, impossible dates, missing endpoints and out-of-order events even after confirmation', () => {
  for (const value of ['', 'invalid', '2026-02-30T08:00:00', '2026-10-26T23:00:00']) {
    const draft = createHistoryDraft(original)
    draft.leftHomeAt = value
    const result = commitHistoryEdit(original, draft, true)
    assert.equal(result.saved, false)
    assert.ok(Object.keys(result.errors).length)
  }
})

test('rejects blank names and negative or non-finite distances', () => {
  for (const value of ['-1', 'Infinity', 'no']) {
    const draft = createHistoryDraft(original)
    draft.visits[0].kilometres = value
    assert.equal(commitHistoryEdit(original, draft).saved, false)
  }
  const draft = createHistoryDraft(original)
  draft.visits[0].name = '  '
  assert.equal(commitHistoryEdit(original, draft).saved, false)
})

test('accepts minute-only values emitted by native date/time controls', () => {
  const draft = createHistoryDraft(original)
  draft.leftHomeAt = '2026-10-24T23:00'
  const result = commitHistoryEdit(original, draft, true)
  assert.equal(result.saved, true)
  assert.ok(result.day.leftHomeAt.endsWith('Z'))
})

test('supports overnight workdays, equal times, missing kilometres, and days without customers', () => {
  const draft = createHistoryDraft(original)
  draft.leftHomeAt = '2026-10-24T23:00:00'
  draft.visits[0].arrivedAt = '2026-10-25T10:00:00'
  draft.visits[0].leftAt = draft.visits[0].arrivedAt
  draft.kilometresHome = ''
  const result = commitHistoryEdit(original, draft, true)
  assert.equal(result.saved, true)
  assert.equal(result.day.kilometresHome, null)
  const empty = { ...original, visits: [] }
  assert.equal(commitHistoryEdit(empty, createHistoryDraft(empty)).saved, true)
})

test('CSV imports complete ISO timestamps without losing corrected multi-day dates or milliseconds', () => {
  const csv = 'Workday ID,Date,Leave,Customer,Arrival,Departure,Distance,Home,Distance home,Note\n42,2026-10-24,2026-10-24T06:00:00.123Z,Customer,2026-10-26T08:00:00.789Z,2026-10-26T09:00:00.123Z,5,2026-10-27T18:00:00.456Z,,Note'
  const [day] = importWorkdaysFromCsv(csv)
  assert.equal(day.leftHomeAt, '2026-10-24T06:00:00.123Z')
  assert.equal(day.visits[0].arrivedAt, '2026-10-26T08:00:00.789Z')
  assert.equal(day.arrivedHomeAt, '2026-10-27T18:00:00.456Z')
})

test('focused arrival-home correction follows review then confirmation and preserves unrelated values', () => {
  const day = { ...original, note: 'Keep this note', visits: [{ ...original.visits[0], name: ' Customer ' }] }
  const draft = createHistoryDraft(day)
  const corrected = '2026-10-25T17:15:00.000Z'
  draft.arrivedHomeAt = localDateTime(corrected)
  draft.note = 'Unrelated draft value'
  draft.visits[0].kilometres = 999
  const review = commitTimestampEdit(day, draft, 'arrivedHomeAt')
  assert.equal(review.saved, false)
  assert.deepEqual(review.changes, [{ path: 'arrivedHomeAt', before: day.arrivedHomeAt, after: corrected }])
  const saved = commitTimestampEdit(day, draft, 'arrivedHomeAt', true)
  assert.equal(saved.saved, true)
  assert.deepEqual(saved.day, { ...day, arrivedHomeAt: corrected, timestampCorrections: { arrivedHomeAt: { original: day.arrivedHomeAt } } })
  assert.equal(day.arrivedHomeAt, original.arrivedHomeAt)
})

test('all four focused timestamp types require confirmation and update only the selected timestamp', () => {
  for (const [path, corrected] of [
    ['leftHomeAt', '2026-10-25T05:30:00.000Z'],
    ['arrivedHomeAt', '2026-10-26T00:30:00.000Z'],
    ['visits.0.arrivedAt', '2026-10-25T07:30:00.000Z'],
    ['visits.0.leftAt', '2026-10-25T09:30:00.000Z'],
  ]) {
    const draft = createHistoryDraft(original)
    const expected = structuredClone(original)
    if (path.startsWith('visits')) {
      const key = path.split('.')[2]
      draft.visits[0][key] = localDateTime(corrected)
      expected.visits[0][key] = corrected
    } else {
      draft[path] = localDateTime(corrected)
      expected[path] = corrected
    }
    assert.equal(commitTimestampEdit(original, draft, path).saved, false)
    const result = commitTimestampEdit(original, draft, path, true)
    assert.equal(result.saved, true)
    expected.timestampCorrections = { [path]: { original: result.changes[0].before } }
    assert.deepEqual(result.day, expected)
  }
})

test('focused correction rejects arrival before the last departure even with confirmation', () => {
  const draft = createHistoryDraft(original)
  draft.arrivedHomeAt = localDateTime('2026-10-25T08:30:00.000Z')
  const result = commitTimestampEdit(original, draft, 'arrivedHomeAt', true)
  assert.equal(result.saved, false)
  assert.equal(result.errors.arrivedHomeAt, 'timeOrder')
})

test('clearing an optional timestamp requires confirmation; home timestamps remain required', () => {
  const draft = createHistoryDraft(original)
  draft.visits[0].arrivedAt = ''
  assert.equal(commitTimestampEdit(original, draft, 'visits.0.arrivedAt').saved, false)
  assert.equal(commitTimestampEdit(original, draft, 'visits.0.arrivedAt', true).day.visits[0].arrivedAt, null)
  draft.arrivedHomeAt = ''
  assert.equal(commitTimestampEdit(original, draft, 'arrivedHomeAt', true).saved, false)
})

test('focused edits reject non-timestamp paths', () => {
  const draft = createHistoryDraft(original)
  for (const path of ['note', 'visits.0.name', 'visits.-1.leftAt', 'visits.9.leftAt']) {
    assert.throws(() => commitTimestampEdit(original, draft, path, true), /Invalid timestamp field/)
  }
})

test('repeated corrections preserve the first recorded instant, including milliseconds, across reloads', () => {
  const draft = createHistoryDraft(original)
  draft.arrivedHomeAt = localDateTime('2026-10-25T17:15:00.000Z')
  const first = commitTimestampEdit(original, draft, 'arrivedHomeAt', true).day
  const reloaded = JSON.parse(JSON.stringify(first))
  const next = createHistoryDraft(reloaded)
  next.arrivedHomeAt = localDateTime('2026-10-25T17:30:00.000Z')
  const second = commitHistoryEdit(reloaded, next, true).day
  assert.equal(second.timestampCorrections.arrivedHomeAt.original, original.arrivedHomeAt)
  assert.equal(first.arrivedHomeAt, '2026-10-25T17:15:00.000Z')
  assert.equal(second.arrivedHomeAt, '2026-10-25T17:30:00.000Z')
  assert.equal(original.timestampCorrections, undefined)
})

test('unconfirmed, invalid and unchanged drafts do not create correction markers', () => {
  const draft = createHistoryDraft(original)
  assert.equal(commitHistoryEdit(original, draft).day.timestampCorrections, undefined)
  draft.arrivedHomeAt = localDateTime('2026-10-25T17:15:00.000Z')
  assert.equal(commitHistoryEdit(original, draft).day.timestampCorrections, undefined)
  draft.arrivedHomeAt = ''
  assert.equal(commitHistoryEdit(original, draft, true).day.timestampCorrections, undefined)
})

test('cleared and newly filled customer timestamps retain their original values', () => {
  const draft = createHistoryDraft(original)
  draft.visits[0].arrivedAt = ''
  const cleared = commitTimestampEdit(original, draft, 'visits.0.arrivedAt', true).day
  assert.equal(cleared.timestampCorrections['visits.0.arrivedAt'].original, original.visits[0].arrivedAt)
  const next = createHistoryDraft(cleared)
  next.visits[0].arrivedAt = localDateTime(original.visits[0].arrivedAt)
  const filled = commitTimestampEdit(cleared, next, 'visits.0.arrivedAt', true).day
  assert.equal(filled.timestampCorrections['visits.0.arrivedAt'].original, original.visits[0].arrivedAt)
  const missing = { ...original, visits: [{ ...original.visits[0], arrivedAt: null }] }
  const missingDraft = createHistoryDraft(missing)
  missingDraft.visits[0].arrivedAt = localDateTime(original.visits[0].arrivedAt)
  assert.equal(commitHistoryEdit(missing, missingDraft, true).day.timestampCorrections['visits.0.arrivedAt'].original, null)
})

test('editing non-timestamp values retains existing correction records', () => {
  const draft = createHistoryDraft(original)
  draft.arrivedHomeAt = localDateTime('2026-10-25T17:15:00.000Z')
  const edited = commitHistoryEdit(original, draft, true).day
  const next = createHistoryDraft(edited)
  next.note = 'Updated note'
  const result = commitHistoryEdit(edited, next)
  assert.equal(result.saved, true)
  assert.deepEqual(result.day.timestampCorrections, edited.timestampCorrections)
})
