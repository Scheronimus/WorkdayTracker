import { useEffect, useState } from 'react'
import packageJson from '../package.json'
import { LANGUAGE_KEY, languageOptions, locales, translate } from './i18n'
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

function formatTime(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function formatDate(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function formatClock(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatDuration(start, end) {
  if (!start) return '0h 00m'
  const minutes = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60000))
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

function totalKilometres(day) {
  const values = [
    ...day.visits.map((visit) => visit.kilometres),
    day.kilometresHome,
  ].filter((value) => value !== null && value !== undefined && value !== '')

  return values.length ? values.reduce((total, value) => total + Number(value), 0) : null
}

function kilometresLegLabel(visits, index, t) {
  const from = index === 0 ? t('homeLower') : visits[index - 1].name
  return t('kilometresLeg', { from, to: visits[index].name })
}

function nextKilometresLegLabel(visits, nextCustomerName, t) {
  const from = visits.length ? visits.at(-1).name : t('homeLower')
  return t('kilometresLeg', { from, to: nextCustomerName.trim() || t('nextCustomer') })
}

function homeKilometresLegLabel(visits, t) {
  const from = visits.length ? visits.at(-1).name : t('homeLower')
  return t('kilometresLeg', { from, to: t('homeLower') })
}

function csvDate(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function csvTime(timestamp, locale) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(locale, {
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
    note: '',
    visits: [],
  }
}

function App() {
  const [activeView, setActiveView] = useState('today')
  const [language, setLanguage] = useState(() => readStorage(LANGUAGE_KEY, 'en'))
  const [now, setNow] = useState(() => Date.now())
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)
  const [isFinishSheetOpen, setIsFinishSheetOpen] = useState(false)
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false)
  const [workday, setWorkday] = useState(() => readStorage(STORAGE_KEY, null))
  const [history, setHistory] = useState(() => {
    const savedHistory = readStorage(HISTORY_KEY, [])
    return savedHistory.sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt))
  })
  const [name, setName] = useState('')
  const [kilometres, setKilometres] = useState('')
  const locale = locales[language] ?? locales.en
  const t = (key, replacements) => translate(language, key, replacements)

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

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language))
    document.documentElement.lang = language
  }, [language])
  useEffect(() => {
    if (!workday?.leftHomeAt || workday.arrivedHomeAt) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [workday?.leftHomeAt, workday?.arrivedHomeAt])

  const lastVisit = workday?.visits.at(-1)
  const canAddCustomer = workday?.leftHomeAt && !workday.arrivedHomeAt && (!lastVisit || lastVisit.leftAt)
  const canArriveHome = canAddCustomer
  const completedVisits = workday?.visits.filter((visit) => visit.leftAt).length ?? 0
  const recentCustomers = [...(workday?.visits ?? []), ...history.flatMap((day) => day.visits)]
    .map((visit) => visit.name)
    .filter((customerName, index, names) =>
      customerName.toLocaleLowerCase() !== name.trim().toLocaleLowerCase()
      && names.findIndex((candidate) =>
        candidate.toLocaleLowerCase() === customerName.toLocaleLowerCase(),
      ) === index,
    )
    .slice(0, 5)

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
    setIsCustomerSheetOpen(false)
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

  function updateWorkdayNote(value) {
    setWorkday((current) => ({ ...current, note: value }))
  }

  function updateHistoryNote(dayId, value) {
    setHistory((current) => current.map((day) =>
      day.id === dayId ? { ...day, note: value } : day,
    ))
    if (workday?.id === dayId && workday.arrivedHomeAt) {
      setWorkday((current) => ({ ...current, note: value }))
    }
  }

  function arriveHome() {
    const completed = { ...workday, arrivedHomeAt: new Date().toISOString() }
    setWorkday(completed)
    setHistory((current) => [completed, ...current.filter((day) => day.id !== completed.id)])
    setIsFinishSheetOpen(false)
    setIsNoteSheetOpen(false)
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
    setIsCustomerSheetOpen(false)
    setIsFinishSheetOpen(false)
    setIsNoteSheetOpen(false)
    setWorkday(emptyWorkday())
  }

  function deleteHistoryDay(dayId) {
    const confirmed = window.confirm(t('deleteConfirmation'))
    if (confirmed) {
      setHistory((current) => current.filter((day) => day.id !== dayId))
    }
  }

  function exportCsv() {
    const headers = [
      t('csvWorkdayId'),
      t('csvWorkdayDate'),
      t('csvLeaveHome'),
      t('csvCustomerName'),
      t('csvArrival'),
      t('csvDeparture'),
      t('csvPreviousStop'),
      t('csvArriveHome'),
      t('csvFinalJourney'),
      t('csvDayNote'),
    ]

    const rows = history.flatMap((day) => {
      const visits = day.visits.length ? day.visits : [null]
      return visits.map((visit) => [
        day.id,
        csvDate(day.leftHomeAt),
        csvTime(day.leftHomeAt, locale),
        visit?.name ?? '',
        csvTime(visit?.arrivedAt, locale),
        csvTime(visit?.leftAt, locale),
        visit?.kilometres ?? '',
        csvTime(day.arrivedHomeAt, locale),
        day.kilometresHome ?? '',
        day.note ?? '',
      ])
    })

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${t('exportFilename')}-${csvDate(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function openCustomerSheet() {
    setIsCustomerSheetOpen(true)
    window.setTimeout(() => document.querySelector('#customer-name')?.focus(), 0)
  }

  return (
    <main className="app-shell">
      {activeView === 'today' && (
        <div className="view">
          <header className="app-header">
            <p className="eyebrow">{t('todayOnRoad')}</p>
            <h1>{t('appTitle')}</h1>
            <p className="status">
              {(!workday || !workday.leftHomeAt) && t('workdayReady')}
              {workday?.leftHomeAt && !workday.arrivedHomeAt && t('workdayInProgress')}
              {workday?.arrivedHomeAt && t('workdayComplete')}
            </p>
          </header>

          {workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <section className="day-overview" aria-label={t('workdayProgress')}>
              <div>
                <span>{t('onRoad')}</span>
                <strong>{formatDuration(workday.leftHomeAt, now)}</strong>
              </div>
              <div>
                <span>{t('customers')}</span>
                <strong>{completedVisits}/{workday.visits.length}</strong>
              </div>
              <div>
                <span>{t('distance')}</span>
                <strong>{totalKilometres(workday) ?? '—'} km</strong>
              </div>
            </section>
          )}

          {workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <button className="day-note-button" type="button" onClick={() => setIsNoteSheetOpen(true)}>
              <span aria-hidden="true">✎</span>
              <span>
                <strong>{workday.note?.trim() ? t('editDayNote') : t('addDayNote')}</strong>
                {workday.note?.trim() && <small>{t('noteAdded')}</small>}
              </span>
            </button>
          )}

          {(!workday || !workday.leftHomeAt) && (
            <section className="prepared-day" aria-labelledby="prepared-day-title">
              <div className="prepared-day-icon" aria-hidden="true">✓</div>
              <div>
                <p className="eyebrow">{t('preparedFor')}</p>
                <h2 id="prepared-day-title">{formatDate(now, locale)}</h2>
                <p>{t('startInstruction')}</p>
              </div>
              <button className="primary start-button" onClick={leaveHome}>
                {t('leaveHomeNow')}
              </button>
            </section>
          )}

          {workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <>
              <section className="timeline" aria-label={t('workdayRoute')}>
                <div className="timeline-row home-row route-stop complete">
                  <span className="dot" />
                  <div>
                    <strong>{t('home')}</strong>
                    <time dateTime={workday.leftHomeAt}>{t('left')} {formatClock(workday.leftHomeAt, locale)}</time>
                  </div>
                </div>

          {workday.visits.map((visit, index) => (
            <article
              className={`visit-card route-stop ${visit.leftAt ? 'complete compact' : 'current'}`}
              key={visit.id}
            >
              <div className="visit-heading">
                <span className="visit-number">{visit.leftAt ? '✓' : index + 1}</span>
                <div>
                  <h2>{visit.name}</h2>
                  {visit.leftAt && (
                    <p className="visit-summary">
                      {formatClock(visit.arrivedAt, locale)}–{formatClock(visit.leftAt, locale)}
                      {visit.kilometres !== null ? ` · ${visit.kilometres} km` : ''}
                    </p>
                  )}
                </div>
              </div>

              <label className="kilometres-field visit-detail">
                {kilometresLegLabel(workday.visits, index, t)}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder={t('unknownForNow')}
                  value={visit.kilometres ?? ''}
                  onChange={(event) => updateVisitKilometres(visit.id, event.target.value)}
                />
              </label>

              <div className="timestamps visit-detail">
                <p>
                  <span>{t('arrived')}</span>
                  <strong>{visit.arrivedAt ? formatTime(visit.arrivedAt, locale) : t('notYet')}</strong>
                </p>
                <p>
                  <span>{t('left')}</span>
                  <strong>{visit.leftAt ? formatTime(visit.leftAt, locale) : t('notYet')}</strong>
                </p>
              </div>

            </article>
          ))}

          <div className="timeline-row route-stop next-home">
            <span className="dot" />
            <div>
              <strong>{t('home')}</strong>
              <span>{t('endOfRoute')}</span>
            </div>
          </div>

              </section>

              <div className="action-dock" aria-label={t('currentAction')}>
                {lastVisit && !lastVisit.arrivedAt && (
                  <button className="primary" onClick={() => recordVisitTime(lastVisit.id, 'arrivedAt')}>
                    {t('arrivedAt', { name: lastVisit.name })}
                  </button>
                )}
                {lastVisit?.arrivedAt && !lastVisit.leftAt && (
                  <button className="primary" onClick={() => recordVisitTime(lastVisit.id, 'leftAt')}>
                    {t('leaveCustomer', { name: lastVisit.name })}
                  </button>
                )}
                {canAddCustomer && (
                  <>
                    <button className="primary" onClick={openCustomerSheet}>
                      {t('addNextStop')}
                    </button>
                    <button
                      className="finish-workday-button"
                      onClick={() => setIsFinishSheetOpen(true)}
                      disabled={!canArriveHome}
                    >
                      {t('finishAtHome')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {workday?.arrivedHomeAt && (
            <button className="primary" onClick={startNewDay}>{t('startNewDay')}</button>
          )}

          {isCustomerSheetOpen && canAddCustomer && (
            <div
              className="sheet-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsCustomerSheetOpen(false)
              }}
            >
              <section
                className="customer-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-sheet-title"
              >
                <div className="sheet-handle" aria-hidden="true" />
                <div className="sheet-heading">
                  <div>
                    <p className="eyebrow">{t('nextOnRoute')}</p>
                    <h2 id="customer-sheet-title">{t('addCustomer')}</h2>
                  </div>
                  <button
                    className="close-sheet"
                    type="button"
                    aria-label={t('close')}
                    onClick={() => setIsCustomerSheetOpen(false)}
                  >
                    ×
                  </button>
                </div>

                {recentCustomers.length > 0 && (
                  <div className="recent-customers">
                    <span>{t('recentCustomers')}</span>
                    <div>
                      {recentCustomers.map((customerName) => (
                        <button
                          type="button"
                          key={customerName}
                          onClick={() => setName(customerName)}
                        >
                          {customerName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form className="add-customer" onSubmit={addCustomer}>
                  <label>
                    {t('customerName')}
                    <input
                      id="customer-name"
                      autoComplete="organization"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {nextKilometresLegLabel(workday.visits, name, t)}
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      placeholder={t('optional')}
                      value={kilometres}
                      onChange={(event) => setKilometres(event.target.value)}
                    />
                  </label>
                  <button className="primary" type="submit">{t('addToRoute')}</button>
                </form>
              </section>
            </div>
          )}

          {isNoteSheetOpen && workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <div
              className="sheet-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsNoteSheetOpen(false)
              }}
            >
              <section
                className="customer-sheet note-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="note-sheet-title"
              >
                <div className="sheet-handle" aria-hidden="true" />
                <div className="sheet-heading">
                  <div>
                    <p className="eyebrow">{t('workdayInProgress')}</p>
                    <h2 id="note-sheet-title">{t('dayNote')}</h2>
                  </div>
                  <button
                    className="close-sheet"
                    type="button"
                    aria-label={t('close')}
                    onClick={() => setIsNoteSheetOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <p className="sheet-description">{t('dayNoteDescription')}</p>
                <textarea
                  autoFocus
                  value={workday.note ?? ''}
                  placeholder={t('dayNotePlaceholder')}
                  onChange={(event) => updateWorkdayNote(event.target.value)}
                />
                <p className="autosave-status">
                  <span aria-hidden="true">✓</span> {t('noteSavedAutomatically')}
                </p>
              </section>
            </div>
          )}

          {isFinishSheetOpen && canArriveHome && (
            <div
              className="sheet-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsFinishSheetOpen(false)
              }}
            >
              <section
                className="customer-sheet finish-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="finish-sheet-title"
              >
                <div className="sheet-handle" aria-hidden="true" />
                <div className="sheet-heading">
                  <div>
                    <p className="eyebrow">{t('finalStep')}</p>
                    <h2 id="finish-sheet-title">{t('finishWorkday')}</h2>
                  </div>
                  <button
                    className="close-sheet"
                    type="button"
                    aria-label={t('close')}
                    onClick={() => setIsFinishSheetOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <p className="sheet-description">
                  {t('finishDescription')}
                </p>
                <label className="kilometres-field">
                  {homeKilometresLegLabel(workday.visits, t)}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    autoFocus
                    placeholder={t('optional')}
                    value={workday.kilometresHome ?? ''}
                    onChange={(event) => updateHomeKilometres(event.target.value)}
                  />
                </label>
                <button className="primary finish-confirm" type="button" onClick={arriveHome}>
                  {t('confirmFinish')}
                </button>
              </section>
            </div>
          )}
        </div>
      )}

      {activeView === 'history' && (
        <section className="history view" aria-labelledby="history-title">
          <div className="section-heading">
            <p className="eyebrow">{t('completedDays')}</p>
            <h2 id="history-title">{t('history')}</h2>
            <p className="status">
              {history.length
                ? t(history.length === 1 ? 'savedWorkdays' : 'savedWorkdaysPlural', { count: history.length })
                : t('emptyHistory')}
            </p>
          </div>

          {history.length > 0 && (
            <>
              <button className="secondary export-button" type="button" onClick={exportCsv}>{t('exportCsv')}</button>

              <div className="history-list">
            {history.map((day) => {
              const total = totalKilometres(day)

              return (
                <details className="history-card" key={day.id}>
                  <summary>
                    <div>
                      <strong>{formatDate(day.leftHomeAt, locale)}</strong>
                      <span>{formatClock(day.leftHomeAt, locale)}–{formatClock(day.arrivedHomeAt, locale)}</span>
                      <span>{t(day.visits.length === 1 ? 'customerCount' : 'customerCountPlural', { count: day.visits.length })}</span>
                      {day.note?.trim() && <span>{t('noteAdded')}</span>}
                    </div>
                    <span className="history-total">{total === null ? t('noKmRecorded') : `${total} km`}</span>
                  </summary>

                  <div className="history-details">
                    <div className="history-times">
                      <p><span>{t('leftHome')}</span><strong>{formatTime(day.leftHomeAt, locale)}</strong></p>
                      <p><span>{t('arrivedHome')}</span><strong>{formatTime(day.arrivedHomeAt, locale)}</strong></p>
                    </div>

                    <label className="history-note-field">
                      {t('dayNote')}
                      <textarea
                        value={day.note ?? ''}
                        placeholder={t('dayNotePlaceholder')}
                        onChange={(event) => updateHistoryNote(day.id, event.target.value)}
                      />
                    </label>

                    <div className="history-visits">
                      {day.visits.map((visit, index) => (
                        <article className="history-visit" key={visit.id}>
                          <h3>{index + 1}. {visit.name}</h3>
                          <div className="history-times">
                            <p><span>{t('arrived')}</span><strong>{visit.arrivedAt ? formatTime(visit.arrivedAt, locale) : t('notRecorded')}</strong></p>
                            <p><span>{t('left')}</span><strong>{visit.leftAt ? formatTime(visit.leftAt, locale) : t('notRecorded')}</strong></p>
                          </div>
                          <label className="kilometres-field">
                            {kilometresLegLabel(day.visits, index, t)}
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              placeholder={t('unknownForNow')}
                              value={visit.kilometres ?? ''}
                              onChange={(event) => updateHistoryVisitKilometres(day.id, visit.id, event.target.value)}
                            />
                          </label>
                        </article>
                      ))}
                    </div>

                    <label className="kilometres-field">
                      {homeKilometresLegLabel(day.visits, t)}
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        placeholder={t('unknownForNow')}
                        value={day.kilometresHome ?? ''}
                        onChange={(event) => updateHistoryHomeKilometres(day.id, event.target.value)}
                      />
                    </label>
                    <button
                      className="delete-day-button"
                      type="button"
                      onClick={() => deleteHistoryDay(day.id)}
                    >
                      {t('deleteDay')}
                    </button>
                  </div>
                </details>
              )
            })}
              </div>
            </>
          )}
        </section>
      )}

      {activeView === 'options' && (
        <section className="options view" aria-labelledby="options-title">
          <div className="section-heading">
            <p className="eyebrow">{t('options')}</p>
            <h2 id="options-title">{t('preferences')}</h2>
            <p className="status">{t('languageDescription')}</p>
          </div>

          <fieldset className="language-panel">
            <legend>{t('language')}</legend>
            {languageOptions.map((option) => (
              <label className="language-option" key={option.value}>
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={language === option.value}
                  onChange={(event) => setLanguage(event.target.value)}
                />
                <span>
                  <strong>{t(option.value === 'en' ? 'english' : 'spanish')}</strong>
                  <small>{option.nativeLabel}</small>
                </span>
              </label>
            ))}
            <p>{t('savedAutomatically')}</p>
          </fieldset>
        </section>
      )}

      <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
        <button
          className={activeView === 'today' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('today')}
          aria-current={activeView === 'today' ? 'page' : undefined}
        >
          <span aria-hidden="true">⌂</span>
          {t('today')}
        </button>
        <button
          className={activeView === 'history' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('history')}
          aria-current={activeView === 'history' ? 'page' : undefined}
        >
          <span aria-hidden="true">◷</span>
          {t('history')}
        </button>
        <button
          className={activeView === 'options' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('options')}
          aria-current={activeView === 'options' ? 'page' : undefined}
        >
          <span aria-hidden="true">⚙</span>
          {t('options')}
        </button>
      </nav>

      <footer className="app-version">v{packageJson.version}</footer>
    </main>
  )
}

export default App
