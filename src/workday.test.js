import assert from 'node:assert/strict'
import test from 'node:test'
import { hasMissingKilometres } from './workday.js'

test('detects missing customer and final-journey kilometres', () => {
  assert.equal(hasMissingKilometres({
    visits: [{ kilometres: null }, { kilometres: 12.5 }],
    kilometresHome: 8,
  }), true)
  assert.equal(hasMissingKilometres({
    visits: [{ kilometres: 12.5 }],
    kilometresHome: '',
  }), true)
})

test('accepts zero as a completed kilometre value', () => {
  assert.equal(hasMissingKilometres({
    visits: [{ kilometres: 0 }],
    kilometresHome: 0,
  }), false)
})

test('requires the final journey for a day without customers', () => {
  assert.equal(hasMissingKilometres({ visits: [], kilometresHome: undefined }), true)
  assert.equal(hasMissingKilometres({ visits: [], kilometresHome: 4 }), false)
})
