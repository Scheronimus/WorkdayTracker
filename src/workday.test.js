import assert from 'node:assert/strict'
import test from 'node:test'
import {
  beginHomeJourney,
  canBeginHomeJourney,
  canRecordHomeArrival,
  canReopenWorkday,
  hasMissingKilometres,
  latestCompletedWorkday,
  latestUndoableTimestamp,
  reopenWorkday,
  undoLatestTimestamp,
} from './workday.js'

test('keeps the home journey separate from the arrival timestamp', () => {
  const readyDay = {
    leftHomeAt: '2026-08-26T06:00:00.000Z',
    arrivedHomeAt: null,
    kilometresHome: 8,
    visits: [{ arrivedAt: '2026-08-26T07:00:00.000Z', leftAt: '2026-08-26T08:00:00.000Z' }],
  }

  assert.equal(canBeginHomeJourney(readyDay), true)
  assert.equal(canRecordHomeArrival(readyDay), false)

  const travellingDay = beginHomeJourney(readyDay)
  assert.equal(travellingDay.homeJourneyStarted, true)
  assert.equal(travellingDay.arrivedHomeAt, null)
  assert.equal(travellingDay.kilometresHome, 8)
  assert.equal(canBeginHomeJourney(travellingDay), false)
  assert.equal(canRecordHomeArrival(travellingDay), true)
})

test('does not begin the home journey while a customer visit is incomplete', () => {
  const incompleteDay = {
    leftHomeAt: '2026-08-26T06:00:00.000Z',
    arrivedHomeAt: null,
    visits: [{ arrivedAt: '2026-08-26T07:00:00.000Z', leftAt: null }],
  }

  assert.equal(canBeginHomeJourney(incompleteDay), false)
  assert.equal(beginHomeJourney(incompleteDay), incompleteDay)
})

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

const activeDay = {
  id: 100,
  leftHomeAt: '2026-08-26T06:00:00.000Z',
  arrivedHomeAt: null,
  kilometresHome: 8,
  note: 'Keep this',
  visits: [{
    id: 101,
    name: 'Customer',
    kilometres: 12,
    arrivedAt: '2026-08-26T07:00:00.000Z',
    leftAt: '2026-08-26T08:00:00.000Z',
  }],
}

test('undoes only the latest recorded normal timestamp', () => {
  assert.deepEqual(latestUndoableTimestamp(activeDay), {
    visitId: 101,
    field: 'leftAt',
    timestamp: '2026-08-26T08:00:00.000Z',
  })

  const undone = undoLatestTimestamp(activeDay)
  assert.equal(undone.visits[0].leftAt, null)
  assert.equal(undone.visits[0].arrivedAt, activeDay.visits[0].arrivedAt)
  assert.equal(undone.leftHomeAt, activeDay.leftHomeAt)
  assert.equal(undone.note, activeDay.note)
  assert.equal(undone.kilometresHome, activeDay.kilometresHome)
})

test('allows undoing leave-home only when the UI can safely show the result', () => {
  const dayWithoutVisits = { ...activeDay, visits: [] }
  assert.equal(undoLatestTimestamp(dayWithoutVisits).leftHomeAt, null)

  const dayWithUntimestampedVisit = {
    ...activeDay,
    visits: [{ ...activeDay.visits[0], arrivedAt: null, leftAt: null }],
  }
  assert.equal(latestUndoableTimestamp(dayWithUntimestampedVisit), null)
  assert.equal(undoLatestTimestamp(dayWithUntimestampedVisit), dayWithUntimestampedVisit)
})

test('does not expose normal timestamp undo for a completed day', () => {
  assert.equal(latestUndoableTimestamp({ ...activeDay, arrivedHomeAt: '2026-08-26T09:00:00.000Z' }), null)
})

test('finds the latest completed workday by arrival time', () => {
  const older = { ...activeDay, id: 1, arrivedHomeAt: '2026-08-25T09:00:00.000Z' }
  const latest = { ...activeDay, id: 2, arrivedHomeAt: '2026-08-26T09:00:00.000Z' }
  assert.equal(latestCompletedWorkday([older, latest]), latest)
})

test('reopens only the latest local day without a different active workday', () => {
  const older = { ...activeDay, id: 1, arrivedHomeAt: '2026-08-25T09:00:00.000Z' }
  const latest = { ...activeDay, id: 2, arrivedHomeAt: '2026-08-26T09:00:00.000Z' }
  const history = [older, latest]

  const sameDay = new Date('2026-08-26T12:00:00.000Z')
  assert.equal(canReopenWorkday(latest, latest, history, sameDay), true)
  assert.equal(canReopenWorkday(older, latest, history, sameDay), false)
  assert.equal(canReopenWorkday(latest, { ...activeDay, id: 3 }, history, sameDay), false)
  assert.equal(canReopenWorkday(latest, { id: 4, leftHomeAt: null, arrivedHomeAt: null, visits: [] }, history, sameDay), true)
  assert.equal(canReopenWorkday({ ...latest, id: 'imported-2' }, null, [{ ...latest, id: 'imported-2' }], sameDay), false)
})

test('does not reopen a workday from a previous local calendar day', () => {
  const completed = { ...activeDay, arrivedHomeAt: '2026-08-26T09:00:00.000Z' }
  assert.equal(
    canReopenWorkday(completed, completed, [completed], new Date('2026-08-27T12:00:00.000Z')),
    false,
  )
})

test('reopening clears only arrival home', () => {
  const completed = { ...activeDay, arrivedHomeAt: '2026-08-26T09:00:00.000Z' }
  assert.deepEqual(reopenWorkday(completed), { ...completed, arrivedHomeAt: null })
})
