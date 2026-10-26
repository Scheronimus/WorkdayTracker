const EXPECTED_COLUMN_COUNTS = new Set([9, 10, 11])

function parseTimestampCorrections(value, visitCount) {
  if (!value.trim()) return undefined
  let corrections
  try { corrections = JSON.parse(value) } catch { throw new Error('invalidTimestamp') }
  if (!corrections || typeof corrections !== 'object' || Array.isArray(corrections)) throw new Error('invalidTimestamp')
  for (const [path, entry] of Object.entries(corrections)) {
    const visit = /^visits\.(\d+)\.(arrivedAt|leftAt)$/.exec(path)
    if (!['leftHomeAt', 'arrivedHomeAt'].includes(path) && !(visit && Number(visit[1]) < visitCount)) throw new Error('invalidTimestamp')
    if (!entry || !Object.hasOwn(entry, 'original')) throw new Error('invalidTimestamp')
    if (entry.original !== null && (typeof entry.original !== 'string'
      || !Number.isFinite(new Date(entry.original).getTime())
      || new Date(entry.original).toISOString() !== entry.original)) throw new Error('invalidTimestamp')
  }
  return corrections
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('unclosedQuotedField')
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  return rows.filter((candidate) => candidate.some((value) => value.trim()))
}

function normaliseHeader(value) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase()
}

function parseLocalTimestamp(date, time, required, notBefore = null) {
  const cleanDate = date.trim()
  const cleanTime = time.trim()
  if (!cleanTime && !required) return null
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cleanTime)) {
    const parsed = new Date(cleanTime)
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== cleanTime
      || (notBefore && parsed < notBefore)) throw new Error('invalidTimestamp')
    return parsed.toISOString()
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(cleanTime)) {
    throw new Error('invalidTimestamp')
  }

  const timestamp = new Date(`${cleanDate}T${cleanTime}`)
  if (Number.isNaN(timestamp.getTime())) throw new Error('invalidTimestamp')
  if (notBefore && timestamp < notBefore) timestamp.setDate(timestamp.getDate() + 1)
  return timestamp.toISOString()
}

function parseKilometres(value) {
  if (!value.trim()) return null
  const kilometres = Number(value)
  if (!Number.isFinite(kilometres) || kilometres < 0) throw new Error('invalidKilometres')
  return kilometres
}

export function importWorkdaysFromCsv(text) {
  const rows = parseCsvRows(text)
  if (rows.length < 2) throw new Error('emptyCsv')

  const headers = rows[0]
  const firstHeader = normaliseHeader(headers[0] ?? '')
  if (!EXPECTED_COLUMN_COUNTS.has(headers.length)
    || !['workday id', 'id de jornada'].includes(firstHeader)) {
    throw new Error('unsupportedCsv')
  }

  const groupedRows = new Map()
  rows.slice(1).forEach((row, rowIndex) => {
    if (row.length !== headers.length) throw new Error('inconsistentColumns')
    const sourceId = row[0].trim()
    if (!sourceId) throw new Error('missingWorkdayId')
    const group = groupedRows.get(sourceId) ?? []
    group.push({ values: row, rowIndex })
    groupedRows.set(sourceId, group)
  })

  return [...groupedRows.entries()].map(([sourceId, dayRows]) => {
    const first = dayRows[0].values
    const date = first[1]
    const leftHomeAt = parseLocalTimestamp(date, first[2], true)
    let chronologicalCursor = new Date(leftHomeAt)
    const visits = []

    dayRows
      .filter(({ values }) => values[3].trim())
      .forEach(({ values, rowIndex }, visitIndex) => {
        const arrivedAt = parseLocalTimestamp(date, values[4], false, chronologicalCursor)
        if (arrivedAt) chronologicalCursor = new Date(arrivedAt)
        const leftAt = parseLocalTimestamp(date, values[5], false, chronologicalCursor)
        if (leftAt) chronologicalCursor = new Date(leftAt)
        visits.push({
          id: `import-${sourceId}-${rowIndex}-${visitIndex}`,
          name: values[3].trim(),
          arrivedAt,
          leftAt,
          kilometres: parseKilometres(values[6]),
        })
      })

    const arrivedHomeAt = parseLocalTimestamp(date, first[7], true, chronologicalCursor)
    const timestampCorrections = headers.length === 11 ? parseTimestampCorrections(first[10], visits.length) : undefined

    return {
      id: sourceId,
      leftHomeAt,
      arrivedHomeAt,
      kilometresHome: parseKilometres(first[8]),
      note: headers.length >= 10 ? first[9] : '',
      visits,
      ...(timestampCorrections ? { timestampCorrections } : {}),
    }
  })
}
