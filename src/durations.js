function instant(value) {
  return typeof value === 'string' && value.trim() ? Date.parse(value) : NaN
}

// Derive from recorded instants; do not write totals into stored workdays.
// Null means the record cannot provide a trustworthy work/travel split.
export function workdayDurations(day) {
  const start = instant(day?.leftHomeAt)
  const end = instant(day?.arrivedHomeAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || !Array.isArray(day?.visits)) return null
  let previous = start
  let workMs = 0
  for (const visit of day.visits) {
    const arrival = instant(visit?.arrivedAt)
    const departure = instant(visit?.leftAt)
    if (!Number.isFinite(arrival) || !Number.isFinite(departure)
      || arrival < previous || departure < arrival || departure > end) return null
    workMs += departure - arrival
    previous = departure
  }
  return { workMs, travelMs: end - start - workMs }
}
