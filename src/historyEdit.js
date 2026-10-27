export function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function createHistoryDraft(day) {
  return {
    ...day,
    leftHomeAt: localDateTime(day.leftHomeAt),
    arrivedHomeAt: localDateTime(day.arrivedHomeAt),
    visits: day.visits.map((visit) => ({ ...visit, arrivedAt: localDateTime(visit.arrivedAt), leftAt: localDateTime(visit.leftAt) })),
  }
}

export function historyDraftHasChanges(original, draft) {
  // Native datetime inputs may omit zero seconds. Compare representations
  // without parsing dates, so invalid edits still require a discard decision.
  const seconds = value => typeof value === 'string'
    ? value.replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/, '$1:00') : value
  const normalized = {
    ...draft,
    leftHomeAt: seconds(draft.leftHomeAt),
    arrivedHomeAt: seconds(draft.arrivedHomeAt),
    visits: draft.visits.map(visit => ({ ...visit, arrivedAt: seconds(visit.arrivedAt), leftAt: seconds(visit.leftAt) })),
  }
  return JSON.stringify(normalized) !== JSON.stringify(createHistoryDraft(original))
}

export function prepareHistoryEdit(original, draft) {
  const errors = {}
  const changes = []
  let cursor = -Infinity
  function timestamp(value, previous, path, required) {
    if (!value) {
      if (required) errors[path] = 'requiredTime'
      if (previous) changes.push({ path, before: previous, after: null })
      return null
    }
    // Browsers omit seconds from datetime-local values when they are zero.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) value += ':00'
    // Preserve the exact original instant, including milliseconds and DST offset.
    const date = new Date(value)
    if (!Number.isFinite(date.getTime()) || localDateTime(date) !== value) {
      errors[path] = 'invalidTime'
      return previous
    }
    const result = value === localDateTime(previous) ? previous : date.toISOString()
    if (new Date(result).getTime() < cursor) errors[path] = 'timeOrder'
    cursor = new Date(result).getTime()
    if (result !== previous) changes.push({ path, before: previous, after: result })
    return result
  }
  function kilometres(value, path) {
    if (value === '' || value == null) return null
    const result = Number(value)
    if (!Number.isFinite(result) || result < 0) errors[path] = 'invalidDistance'
    return result
  }
  const day = { ...original, note: draft.note ?? '' }
  day.leftHomeAt = timestamp(draft.leftHomeAt, original.leftHomeAt, 'leftHomeAt', true)
  day.visits = original.visits.map((visit, index) => {
    const edited = draft.visits[index]
    const prefix = `visits.${index}.`
    if (!edited.name.trim()) errors[`${prefix}name`] = 'requiredName'
    return {
      ...visit,
      name: edited.name.trim(),
      arrivedAt: timestamp(edited.arrivedAt, visit.arrivedAt, `${prefix}arrivedAt`, false),
      leftAt: timestamp(edited.leftAt, visit.leftAt, `${prefix}leftAt`, false),
      kilometres: kilometres(edited.kilometres, `${prefix}kilometres`),
    }
  })
  day.arrivedHomeAt = timestamp(draft.arrivedHomeAt, original.arrivedHomeAt, 'arrivedHomeAt', true)
  day.kilometresHome = kilometres(draft.kilometresHome, 'kilometresHome')
  return { day, errors, changes }
}

export function commitHistoryEdit(original, draft, confirmed = false) {
  const result = prepareHistoryEdit(original, draft)
  if (Object.keys(result.errors).length || (result.changes.length && !confirmed)) return { ...result, saved: false }
  if (result.changes.length) {
    const corrections = { ...original.timestampCorrections }
    for (const change of result.changes) {
      if (!Object.hasOwn(corrections, change.path)) corrections[change.path] = { original: change.before ?? null }
    }
    result.day.timestampCorrections = corrections
  }
  return { ...result, saved: true }
}

export function commitTimestampEdit(original, draft, path, confirmed = false) {
  const parts = path.split('.')
  const visitIndex = Number(parts[1])
  const isVisit = parts.length === 3 && parts[0] === 'visits'
    && Number.isInteger(visitIndex) && original.visits[visitIndex]
    && ['arrivedAt', 'leftAt'].includes(parts[2])
  if (!isVisit && !['leftHomeAt', 'arrivedHomeAt'].includes(path)) throw new Error('Invalid timestamp field')
  const isolated = createHistoryDraft(original)
  if (isVisit) isolated.visits[visitIndex][parts[2]] = draft.visits[visitIndex][parts[2]]
  else isolated[path] = draft[path]
  const result = commitHistoryEdit(original, isolated, confirmed)
  // A focused correction must preserve every unrelated value exactly.
  const day = { ...original, visits: original.visits.map((visit) => ({ ...visit })) }
  if (isVisit) day.visits[visitIndex][parts[2]] = result.day.visits[visitIndex][parts[2]]
  else day[path] = result.day[path]
  if (result.saved && result.changes.length) day.timestampCorrections = result.day.timestampCorrections
  return { ...result, day }
}
