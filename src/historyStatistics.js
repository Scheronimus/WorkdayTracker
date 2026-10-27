import { workdayDurations } from './durations.js'
import { totalKilometres } from './distance.js'
import { hasMissingKilometres } from './workday.js'

export function dateKey(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function statisticsPeriod(anchor, period) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  else start.setDate(1)
  const end = new Date(start)
  if (period === 'week') end.setDate(end.getDate() + 7)
  else end.setMonth(end.getMonth() + (period === 'quarter' ? 3 : 1))
  return { start, end }
}

export function movePeriod(anchor, period, direction) {
  const { start } = statisticsPeriod(anchor, period)
  if (period === 'week') start.setDate(start.getDate() + direction * 7)
  else start.setMonth(start.getMonth() + direction * (period === 'quarter' ? 3 : 1))
  return start
}

export function aggregateHistory(history, start, end) {
  const days = []
  for (const date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
    days.push({ key: dateKey(date), date: new Date(date), records: [], workMs: 0, travelMs: 0, km: 0, excluded: 0, incomplete: 0, unusual: false })
  }
  const byDate = new Map(days.map(day => [day.key, day]))
  for (const record of history) {
    const day = byDate.get(dateKey(record.leftHomeAt))
    if (!day || !record.arrivedHomeAt) continue
    day.records.push(record)
    const durations = workdayDurations(record)
    if (durations) {
      day.workMs += durations.workMs
      day.travelMs += durations.travelMs
      day.unusual ||= durations.workMs + durations.travelMs > 24 * 3600000
    } else day.excluded++
    const km = totalKilometres(record)
    if (km !== null && Number.isFinite(km) && km >= 0) day.km += km
    if (hasMissingKilometres(record) || !Number.isFinite(km) || km < 0) day.incomplete++
  }
  return days
}
