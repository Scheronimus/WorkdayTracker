import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateHistory, dateKey, statisticsPeriod, movePeriod } from './historyStatistics.js'

const record = (id, start, end, km = 10) => ({ id, leftHomeAt: start, arrivedHomeAt: end, visits: [], kilometresHome: km })

test('missing departure dates never become the Unix epoch date', () => {
  for (const missing of [null, undefined, '', 'invalid']) assert.equal(dateKey(missing), null)
})

test('combining decimal workday distances keeps the correct integer axis ceiling', () => {
  const { start, end } = statisticsPeriod(new Date(2026, 9, 27), 'week')
  const records = Array.from({ length: 30 }, (_, id) => record(id, '2026-10-27T08:00:00', '2026-10-27T09:00:00', 0.1))
  const day = aggregateHistory(records, start, end).find(day => day.records.length)
  assert.equal(day.km, 3)
  assert.equal(Math.ceil(day.km), 3)
})

test('periods use local calendar boundaries and Monday weeks', () => {
  const anchor = new Date(2026, 9, 27)
  const week = statisticsPeriod(anchor, 'week')
  assert.equal(dateKey(week.start), '2026-10-26')
  assert.equal(dateKey(week.end), '2026-11-02')
  assert.equal(dateKey(movePeriod(new Date(2026, 0, 31), 'month', 1)), '2026-02-01')
  assert.equal(dateKey(statisticsPeriod(new Date(2026, 10, 15), 'quarter').end), '2027-02-01')
})

test('daily aggregation combines records, uses departure date, and excludes end boundary', () => {
  const { start, end } = statisticsPeriod(new Date(2026, 9, 27), 'month')
  const days = aggregateHistory([
    record(1, '2026-10-27T08:00:00', '2026-10-27T09:00:00', 10.1),
    record(2, '2026-10-27T23:00:00', '2026-10-28T01:00:00', 5.2),
    record(3, '2026-11-01T08:00:00', '2026-11-01T09:00:00'),
  ], start, end)
  assert.equal(days.length, 31)
  const day = days.find(day => day.key === '2026-10-27')
  assert.equal(day.records.length, 2)
  assert.equal(day.travelMs, 3 * 3600000)
  assert.ok(Math.abs(day.km - 15.3) < 1e-10)
  assert.equal(days.find(day => day.key === '2026-10-28').records.length, 0)
})

test('invalid timestamps and missing distances are marked rather than silently treated as complete', () => {
  const { start, end } = statisticsPeriod(new Date(2026, 9, 27), 'week')
  const days = aggregateHistory([
    record(1, '2026-10-27T10:00:00', '2026-10-27T09:00:00', null),
    record(2, '2026-10-27T10:00:00', '2026-10-29T10:00:00'),
    { ...record(3, '2026-10-28T10:00:00', null), arrivedHomeAt: null },
  ], start, end)
  const day = days.find(day => day.key === '2026-10-27')
  assert.equal(day.excluded, 1)
  assert.equal(day.incomplete, 1)
  assert.equal(day.unusual, true)
  assert.equal(day.travelMs, 48 * 3600000)
  assert.equal(days.find(day => day.key === '2026-10-28').records.length, 0)
})

test('calendar iteration handles daylight saving and leap years', () => {
  const { start, end } = statisticsPeriod(new Date(2024, 1, 15), 'month')
  assert.equal(aggregateHistory([], start, end).length, 29)
  const spring = statisticsPeriod(new Date(2026, 2, 29), 'week')
  const days = aggregateHistory([], spring.start, spring.end)
  assert.equal(days.length, 7)
  assert.equal(new Set(days.map(day => day.key)).size, 7)
})
