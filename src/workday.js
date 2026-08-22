function isMissingKilometres(value) {
  return value === null || value === undefined || value === ''
}

export function hasMissingKilometres(day) {
  return day.visits.some((visit) => isMissingKilometres(visit.kilometres))
    || isMissingKilometres(day.kilometresHome)
}
