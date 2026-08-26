function isMissingKilometres(value) {
  return value === null || value === undefined || value === ''
}

export function hasMissingKilometres(day) {
  return day.visits.some((visit) => isMissingKilometres(visit.kilometres))
    || isMissingKilometres(day.kilometresHome)
}

export function latestUndoableTimestamp(day) {
  if (!day?.leftHomeAt || day.arrivedHomeAt) return null

  const timestamps = [{ field: 'leftHomeAt', timestamp: day.leftHomeAt }]
  day.visits.forEach((visit) => {
    timestamps.push(
      { visitId: visit.id, field: 'arrivedAt', timestamp: visit.arrivedAt },
      { visitId: visit.id, field: 'leftAt', timestamp: visit.leftAt },
    )
  })

  const latest = timestamps.findLast((entry) => entry.timestamp)
  if (latest?.field === 'leftHomeAt' && day.visits.length > 0) return null
  return latest ?? null
}

export function undoLatestTimestamp(day) {
  const latest = latestUndoableTimestamp(day)
  if (!latest) return day

  if (latest.field === 'leftHomeAt') {
    return { ...day, leftHomeAt: null }
  }

  return {
    ...day,
    visits: day.visits.map((visit) =>
      visit.id === latest.visitId ? { ...visit, [latest.field]: null } : visit,
    ),
  }
}

export function latestCompletedWorkday(history) {
  return history.reduce((latest, day) => {
    if (!day?.arrivedHomeAt) return latest
    if (!latest || new Date(day.arrivedHomeAt) > new Date(latest.arrivedHomeAt)) return day
    return latest
  }, null)
}

function isSameLocalDate(firstTimestamp, secondTimestamp) {
  const first = new Date(firstTimestamp)
  const second = new Date(secondTimestamp)
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}

export function canReopenWorkday(day, currentWorkday, history, currentTime = new Date()) {
  const latest = latestCompletedWorkday(history)
  if (!day?.arrivedHomeAt
    || typeof day.id !== 'number'
    || latest?.id !== day.id
    || !isSameLocalDate(day.leftHomeAt, currentTime)) return false

  const differentActiveWorkday = currentWorkday?.leftHomeAt
    && !currentWorkday.arrivedHomeAt
    && currentWorkday.id !== day.id
  return !differentActiveWorkday
}

export function reopenWorkday(day) {
  return { ...day, arrivedHomeAt: null }
}
