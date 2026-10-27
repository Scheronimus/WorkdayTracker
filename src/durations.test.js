import test from 'node:test'
import assert from 'node:assert/strict'
import { workdayDurations } from './durations.js'

const time = value => `2026-10-27T${value}:00Z`
const visit = (arrival, departure) => ({ arrivedAt: time(arrival), leftAt: time(departure) })
const record = visits => ({ leftHomeAt: time('07:00'), arrivedHomeAt: time('12:00'), visits })
const hour = 3600000

test('sums all customer work and assigns all remaining elapsed time to travel', () => {
  const day = record([visit('07:30', '09:00'), visit('09:30', '11:00')])
  const before = structuredClone(day)
  assert.deepEqual(workdayDurations(day), { workMs: 3 * hour, travelMs: 2 * hour })
  assert.deepEqual(day, before)
})
test('days without customers are entirely travel; equal instants give zero durations', () => {
  assert.deepEqual(workdayDurations(record([])), { workMs: 0, travelMs: 5 * hour })
  assert.deepEqual(workdayDurations({ leftHomeAt: time('07:00'), arrivedHomeAt: time('07:00'), visits: [visit('07:00', '07:00')] }), { workMs: 0, travelMs: 0 })
})
test('overnight and multi-day dates use full timestamps and retain seconds', () => {
  assert.deepEqual(workdayDurations({ leftHomeAt: '2026-10-26T22:00:00Z', arrivedHomeAt: '2026-10-27T02:00:40Z',
    visits: [{ arrivedAt: '2026-10-26T23:00:10Z', leftAt: '2026-10-27T01:00:30Z' }] }),
  { workMs: 2 * hour + 20000, travelMs: 2 * hour + 20000 })
  assert.deepEqual(workdayDurations({ leftHomeAt: '2026-10-25T07:00:00Z', arrivedHomeAt: '2026-10-27T07:00:00Z', visits: [] }), { workMs: 0, travelMs: 48 * hour })
})
test('daylight-saving offset changes count actual elapsed time', () => {
  assert.deepEqual(workdayDurations({ leftHomeAt: '2026-10-25T01:30:00+02:00', arrivedHomeAt: '2026-10-25T03:30:00+01:00',
    visits: [{ arrivedAt: '2026-10-25T02:00:00+02:00', leftAt: '2026-10-25T02:00:00+01:00' }] }), { workMs: hour, travelMs: 2 * hour })
})
test('missing, invalid, reversed, overlapping or out-of-day timestamps invalidate both totals', () => {
  const valid = record([visit('08:00', '09:00')])
  for (const day of [null, {}, { ...valid, leftHomeAt: null }, { ...valid, arrivedHomeAt: 'invalid' },
    { ...valid, arrivedHomeAt: time('06:00') }, { ...valid, visits: null },
    record([{ arrivedAt: null, leftAt: time('09:00') }]), record([{ arrivedAt: time('08:00'), leftAt: '' }]),
    record([visit('09:00', '08:00')]), record([visit('06:00', '08:00')]), record([visit('11:00', '13:00')]),
    record([visit('08:00', '10:00'), visit('09:00', '11:00')])]) assert.equal(workdayDurations(day), null)
})
test('timestamp corrections immediately change the split, independently of notes and kilometres', () => {
  const day = record([visit('08:00', '09:00')])
  assert.deepEqual(workdayDurations(day), { workMs: hour, travelMs: 4 * hour })
  assert.deepEqual(workdayDurations({ ...day, visits: [{ ...visit('08:00', '10:00'), kilometres: null, name: 'Renamed' }],
    note: 'Updated', timestampCorrections: { 'visits.0.leftAt': { original: time('09:00') } } }), { workMs: 2 * hour, travelMs: 3 * hour })
})
