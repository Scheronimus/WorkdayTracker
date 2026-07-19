import { useEffect, useState } from 'react'
import packageJson from '../package.json'
import './App.css'

const STORAGE_KEY = 'workday-tracker-current'
const HISTORY_KEY = 'workday-tracker-history'

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function formatClock(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function totalKilometres(day) {
  const values = [
    ...day.visits.map((visit) => visit.kilometres),
    day.kilometresHome,
  ].filter((value) => value !== null && value !== undefined && value !== '')

  return values.length ? values.reduce((total, value) => total + Number(value), 0) : null
}

function csvDate(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function csvTime(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function emptyWorkday() {
  return {
    id: Date.now(),
    leftHomeAt: null,
    arrivedHomeAt: null,
    kilometresHome: null,
    visits: [],
  }
}

function App() {
  const [workday, setWorkday] = useState(() => readStorage(STORAGE_KEY, null))
  const [history, setHistory] = useState(() => {
    const savedHistory = readStorage(HISTORY_KEY, [])
    return savedHistory.sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt))
  })
  const [name, setName] = useState('')
  const [kilometres, setKilometres] = useState('')

  useEffect(() => {
    if (workday) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workday))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [workday])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const lastVisit = workday?.visits.at(-1)
  const canAddCustomer = workday?.leftHomeAt && !workday.arrivedHomeAt && (!lastVisit || lastVisit.leftAt)
  const canArriveHome = canAddCustomer

  function leaveHome() {
    setWorkday((current) => ({
      ...(current || emptyWorkday()),
      leftHomeAt: new Date().toISOString(),
    }))
  }

  function addCustomer(event) {
    event.preventDefault()
    if (!name.trim() || (kilometres !== '' && Number(kilometres) < 0)) return

    setWorkday((current) => ({
      ...current,
      visits: [
        ...current.visits,
        {
          id: Date.now(),
          name: name.trim(),
          kilometres: kilometres === '' ? null : Number(kilometres),
          arrivedAt: null,
          leftAt: null,
        },
      ],
    }))
    setName('')
    setKilometres('')
  }

  function recordVisitTime(id, field) {
    setWorkday((current) => ({
      ...current,
      visits: current.visits.map((visit) =>
        visit.id === id ? { ...visit, [field]: new Date().toISOString() } : visit,
      ),
    }))
  }

  function updateVisitKilometres(id, value) {
    const nextValue = value === '' ? null : Number(value)
    if (workday.arrivedHomeAt) {
      updateHistoryVisitKilometres(workday.id, id, value)
    } else {
      setWorkday((current) => ({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === id
            ? { ...visit, kilometres: nextValue }
            : visit,
        ),
      }))
    }
  }

  function updateHomeKilometres(value) {
    const nextValue = value === '' ? null : Number(value)
    if (workday.arrivedHomeAt) {
      updateHistoryHomeKilometres(workday.id, value)
    } else {
      setWorkday((current) => ({
        ...current,
        kilometresHome: nextValue,
      }))
    }
  }

  function arriveHome() {
    const completed = { ...workday, arrivedHomeAt: new Date().toISOString() }
    setWorkday(completed)
    setHistory((current) => [completed, ...current.filter((day) => day.id !== completed.id)])
  }

  function updateHistoryVisitKilometres(dayId, visitId, value) {
    const nextValue = value === '' ? null : Number(value)
    setHistory((current) => current.map((day) =>
      day.id === dayId
        ? {
            ...day,
            visits: day.visits.map((visit) =>
              visit.id === visitId ? { ...visit, kilometres: nextValue } : visit,
            ),
          }
        : day,
    ))
    if (workday?.id === dayId && workday.arrivedHomeAt) {
      setWorkday((current) => ({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === visitId ? { ...visit, kilometres: nextValue } : visit,
        ),
      }))
    }
  }

  function updateHistoryHomeKilometres(dayId, value) {
    const nextValue = value === '' ? null : Number(value)
    setHistory((current) => current.map((day) =>
      day.id === dayId ? { ...day, kilometresHome: nextValue } : day,
    ))
    if (workday?.id === dayId && workday.arrivedHomeAt) {
      setWorkday((current) => ({ ...current, kilometresHome: nextValue }))
    }
  }

  function startNewDay() {
    setName('')
    setKilometres('')
    setWorkday(emptyWorkday())
  }

  function deleteHistoryDay(dayId) {
    const confirmed = window.confirm('Delete this workday? This action cannot be undone.')
    if (confirmed) {
      setHistory((current) => current.filter((day) => day.id !== dayId))
    }
  }

  function exportCsv() {
    const headers = [
      'Workday ID',
      'Workday Date',
      'Leave Home Time',
      'Customer Name',
      'Arrival Time',
      'Departure Time',
      'Kilometres From Previous Stop',
      'Arrive Home Time',
      'Kilometres From Last Customer To Home',
    ]

    const rows = history.flatMap((day) => {
      const visits = day.visits.length ? day.visits : [null]
      return visits.map((visit) => [
        day.id,
        csvDate(day.leftHomeAt),
        csvTime(day.leftHomeAt),
        visit?.name ?? '',
        csvTime(visit?.arrivedAt),
        csvTime(visit?.leftAt),
        visit?.kilometres ?? '',
        csvTime(day.arrivedHomeAt),
        day.kilometresHome ?? '',
      ])
    })

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workday-history-${csvDate(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Today on the road</p>
        <h1>Workday tracker</h1>
        <p className="status">
          {(!workday || !workday.leftHomeAt) && 'Ready when you are.'}
          {workday?.leftHomeAt && !workday.arrivedHomeAt && 'Workday in progress'}
          {workday?.arrivedHomeAt && 'Workday complete'}
        </p>
      </header>

      {(!workday || !workday.leftHomeAt) && (
        <button className="primary start-button" onClick={leaveHome}>
          Leave home now
        </button>
      )}

      {workday?.leftHomeAt && !workday.arrivedHomeAt && (
        <section className="timeline" aria-label="Workday timeline">
          <div className="timeline-row home-row">
            <span className="dot" />
            <div>
              <strong>Left home</strong>
              <time dateTime={workday.leftHomeAt}>{formatTime(workday.leftHomeAt)}</time>
            </div>
          </div>

          {workday.visits.map((visit, index) => (
            <article className="visit-card" key={visit.id}>
              <div className="visit-heading">
                <span className="visit-number">{index + 1}</span>
                <div>
                  <h2>{visit.name}</h2>
                </div>
              </div>

              <label className="kilometres-field">
                Kilometres from previous stop
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder="Unknown for now"
                  value={visit.kilometres ?? ''}
                  onChange={(event) => updateVisitKilometres(visit.id, event.target.value)}
                />
              </label>

              <div className="timestamps">
                <p>
                  <span>Arrived</span>
                  <strong>{visit.arrivedAt ? formatTime(visit.arrivedAt) : 'Not yet'}</strong>
                </p>
                <p>
                  <span>Left</span>
                  <strong>{visit.leftAt ? formatTime(visit.leftAt) : 'Not yet'}</strong>
                </p>
              </div>

              {!visit.arrivedAt && (
                <button className="secondary" onClick={() => recordVisitTime(visit.id, 'arrivedAt')}>
                  Arrive now
                </button>
              )}
              {visit.arrivedAt && !visit.leftAt && (
                <button className="secondary" onClick={() => recordVisitTime(visit.id, 'leftAt')}>
                  Leave now
                </button>
              )}
            </article>
          ))}

          {canAddCustomer && (
            <form className="add-customer" onSubmit={addCustomer}>
              <h2>Add customer</h2>
              <label>
                Customer name
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label>
                Kilometres from previous stop
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder="Unknown for now"
                  value={kilometres}
                  onChange={(event) => setKilometres(event.target.value)}
                />
              </label>
              <button className="secondary" type="submit">Add customer</button>
            </form>
          )}

          <div className="home-actions">
            <label className="kilometres-field">
              Kilometres from last customer to home
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="Unknown for now"
                value={workday.kilometresHome ?? ''}
                onChange={(event) => updateHomeKilometres(event.target.value)}
              />
            </label>
            <button className="primary" onClick={arriveHome} disabled={!canArriveHome}>
              Arrive home now
            </button>
          </div>
        </section>
      )}

      {workday?.arrivedHomeAt && (
        <button className="primary" onClick={startNewDay}>Start new day</button>
      )}

      {history.length > 0 && (
        <section className="history" aria-labelledby="history-title">
          <div className="section-heading">
            <p className="eyebrow">Completed days</p>
            <h2 id="history-title">History</h2>
          </div>

          <button className="secondary export-button" type="button" onClick={exportCsv}>Export CSV</button>

          <div className="history-list">
            {history.map((day) => {
              const total = totalKilometres(day)

              return (
                <details className="history-card" key={day.id}>
                  <summary>
                    <div>
                      <strong>{formatDate(day.leftHomeAt)}</strong>
                      <span>{formatClock(day.leftHomeAt)}–{formatClock(day.arrivedHomeAt)}</span>
                      <span>{day.visits.length} customer{day.visits.length === 1 ? '' : 's'}</span>
                    </div>
                    <span className="history-total">{total === null ? 'No km recorded' : `${total} km`}</span>
                  </summary>

                  <div className="history-details">
                    <div className="history-times">
                      <p><span>Left home</span><strong>{formatTime(day.leftHomeAt)}</strong></p>
                      <p><span>Arrived home</span><strong>{formatTime(day.arrivedHomeAt)}</strong></p>
                    </div>

                    <div className="history-visits">
                      {day.visits.map((visit, index) => (
                        <article className="history-visit" key={visit.id}>
                          <h3>{index + 1}. {visit.name}</h3>
                          <div className="history-times">
                            <p><span>Arrived</span><strong>{visit.arrivedAt ? formatTime(visit.arrivedAt) : 'Not recorded'}</strong></p>
                            <p><span>Left</span><strong>{visit.leftAt ? formatTime(visit.leftAt) : 'Not recorded'}</strong></p>
                          </div>
                          <label className="kilometres-field">
                            Kilometres from previous stop
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              placeholder="Unknown for now"
                              value={visit.kilometres ?? ''}
                              onChange={(event) => updateHistoryVisitKilometres(day.id, visit.id, event.target.value)}
                            />
                          </label>
                        </article>
                      ))}
                    </div>

                    <label className="kilometres-field">
                      Kilometres from last customer to home
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        placeholder="Unknown for now"
                        value={day.kilometresHome ?? ''}
                        onChange={(event) => updateHistoryHomeKilometres(day.id, event.target.value)}
                      />
                    </label>
                    <button
                      className="delete-day-button"
                      type="button"
                      onClick={() => deleteHistoryDay(day.id)}
                    >
                      Delete day
                    </button>
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      )}

      <footer className="app-version">v{packageJson.version}</footer>
    </main>
  )
}

export default App
