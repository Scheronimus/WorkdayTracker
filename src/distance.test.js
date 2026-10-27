import test from 'node:test'
import assert from 'node:assert/strict'
import { totalKilometres } from './distance.js'

const day = (values, kilometresHome = null) => ({ visits: values.map(kilometres => ({ kilometres })), kilometresHome })
test('decimal journey totals do not expose binary addition tails', () => {
  assert.equal(totalKilometres(day([0.1, 0.2], 0.3)), 0.6)
  assert.equal(totalKilometres(day([1.1, 2.2], 3.3)), 6.6)
})
test('missing distances remain distinct from recorded zero', () => {
  assert.equal(totalKilometres(day([null, undefined, ''])), null)
  assert.equal(totalKilometres(day([0, null])), 0)
  assert.equal(totalKilometres(day([], 0)), 0)
})
test('entered precision and exponent notation remain supported without mutating records', () => {
  const record = day([0.0000001, 0.0000002, '1.23456789'], 10)
  const before = structuredClone(record)
  assert.equal(totalKilometres(record), 11.23456819)
  assert.deepEqual(record, before)
  assert.equal(totalKilometres(day([1e21], 0)), 1e21)
})
