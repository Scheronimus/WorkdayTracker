import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import packageJson from '../package.json'
import { importWorkdaysFromCsv } from './csvImport'
import { LANGUAGE_KEY, languageOptions, locales, translate } from './i18n'
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
} from './workday'
import HistoryEditor from './HistoryEditor'
import ReleaseNotes from './ReleaseNotes.jsx'
import Sheet from './Sheet'
import Icon from './Icon'
import RouteTimeline from './RouteTimeline'
import StopEditor from './StopEditor'
import { markReleaseNotesSeen, shouldShowReleaseNotes } from './releaseNotes.js'
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

function readLanguage() {
  const savedLanguage = readStorage(LANGUAGE_KEY, 'en')
  return Object.hasOwn(locales, savedLanguage) ? savedLanguage : 'en'
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true
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

function formatHistoryTime(timestamp, day, locale, seconds = true) {
  // Share the day's date in the heading, but keep cross-date events explicit.
  const sameDate = csvDate(timestamp) === csvDate(day.leftHomeAt)
  return new Intl.DateTimeFormat(locale, {
    ...(sameDate ? {} : { day: '2-digit', month: 'short', year: 'numeric' }),
    hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}),
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
    homeJourneyStarted: false,
    note: '',
    visits: [],
  }
}

function NavigationIcon({ name }) {
  const paths = {
    today: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7" />,
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    options: (
      <>
        <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="13" cy="18" r="2" />
      </>
    ),
  }

  return (
    <svg className="navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function App() {
  const shellRef = useRef(null)
  const navigationRef = useRef(null)
  const dockRef = useRef(null)
  const [activeView, setActiveView] = useState('today')
  const [language, setLanguage] = useState(readLanguage)
  const [now, setNow] = useState(() => Date.now())
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)
  const [isFinishSheetOpen, setIsFinishSheetOpen] = useState(false)
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isAppInstalled, setIsAppInstalled] = useState(isStandaloneApp)
  const [workday, setWorkday] = useState(() => readStorage(STORAGE_KEY, null))
  const [history, setHistory] = useState(() => {
    const savedHistory = readStorage(HISTORY_KEY, [])
    return savedHistory.sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt))
  })
  const [name, setName] = useState('')
  const [kilometres, setKilometres] = useState('')
  const [editingDay, setEditingDay] = useState(null)
  const [editingTimestamp, setEditingTimestamp] = useState(null)
  const [historySaved, setHistorySaved] = useState(false)
  const [showReleaseNotes, setShowReleaseNotes] = useState(() => shouldShowReleaseNotes(packageJson.version))
  const [importStatus, setImportStatus] = useState(null)
  const locale = locales[language] ?? locales.en
  const iosDevice = isIosDevice()
  const t = (key, replacements) => translate(language, key, replacements)
  const formatKilometres = value => value == null || value === '' ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(value)

  function dismissReleaseNotes() {
    markReleaseNotesSeen(packageJson.version)
    setShowReleaseNotes(false)
  }

  function openHistoryEditor(day, timestamp = null) {
    setHistorySaved(false)
    setEditingTimestamp(timestamp)
    setEditingDay(day)
  }

  function timestampRow(day, path, value, title, editTitle = title) {
    const correction = day.timestampCorrections?.[path]
    return <div className="history-timestamp-row" data-timestamp-path={path}>
      <div><span>{title} <time dateTime={value || undefined}>{value ? formatHistoryTime(value, day, locale) : t('notRecorded')}{timestampStar(day, path)}</time></span>
        {correction && <small className="original-timestamp">{t('originalTime')}: {correction.original ? formatHistoryTime(correction.original, day, locale) : t('notRecorded')}</small>}
      </div>
      <button className="timestamp-edit-button" type="button"
        aria-label={t('editTimestamp', { event: editTitle })}
        title={t('editTimestamp', { event: editTitle })}
        onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); openHistoryEditor(day, path) }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m15 5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z" />
        </svg>
      </button>
    </div>
  }

  function timestampStar(day, path) {
    return day.timestampCorrections?.[path] ? <sup className="manual-timestamp" title={t('manuallyChanged')} aria-label={t('manuallyChanged')}>*</sup> : null
  }

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [activeView])

  useLayoutEffect(() => {
    const shell = shellRef.current
    let frame
    function measure() {
      shell.style.setProperty('--nav-height', `${navigationRef.current?.getBoundingClientRect().height ?? 0}px`)
      shell.style.setProperty('--dock-height', `${dockRef.current?.getBoundingClientRect().height ?? 0}px`)
      shell.dataset.largeText = String(Number.parseFloat(getComputedStyle(shell).fontSize) >= 24)
    }
    // Apply measurements on the next frame so changes to large-text layouts
    // cannot cause a ResizeObserver delivery loop in WebKit.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    if (navigationRef.current) observer.observe(navigationRef.current)
    if (dockRef.current) observer.observe(dockRef.current)
    measure()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [activeView, workday?.leftHomeAt, workday?.arrivedHomeAt])

  useEffect(() => {
    if (!historySaved) return
    const timer = setTimeout(() => setHistorySaved(false), 5000)
    return () => clearTimeout(timer)
  }, [historySaved])

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
    function refreshCurrentTime() {
      if (!document.hidden) setNow(Date.now())
    }

    window.addEventListener('focus', refreshCurrentTime)
    document.addEventListener('visibilitychange', refreshCurrentTime)
    return () => {
      window.removeEventListener('focus', refreshCurrentTime)
      document.removeEventListener('visibilitychange', refreshCurrentTime)
    }
  }, [])

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    function markAppInstalled() {
      setInstallPrompt(null)
      setIsAppInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', markAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', markAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!workday?.leftHomeAt || workday.arrivedHomeAt) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [workday?.leftHomeAt, workday?.arrivedHomeAt])

  const isTravellingHome = Boolean(workday?.homeJourneyStarted)
  const canStartHomeJourney = canBeginHomeJourney(workday)
  const canAddCustomer = canStartHomeJourney
  const canArriveHome = canRecordHomeArrival(workday)
  const currentActionVisit = workday?.visits.find((visit) => !visit.arrivedAt || !visit.leftAt)
  const undoableTimestamp = latestUndoableTimestamp(workday)
  const latestCompleted = latestCompletedWorkday(history)
  const completedVisits = workday?.visits.filter((visit) => visit.leftAt).length ?? 0
  const isLongWorkday = workday?.leftHomeAt
    && !workday.arrivedHomeAt
    && now - new Date(workday.leftHomeAt).getTime() >= 8 * 60 * 60 * 1000
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

  function undoTimestamp() {
    if (!undoableTimestamp) return
    const confirmationKey = undoableTimestamp.field === 'leftHomeAt'
      ? 'undoLeftHomeConfirmation'
      : undoableTimestamp.field === 'arrivedAt'
        ? 'undoCustomerArrivalConfirmation'
        : 'undoCustomerDepartureConfirmation'
    const customer = workday.visits.find((visit) => visit.id === undoableTimestamp.visitId)
    const confirmed = window.confirm(t(confirmationKey, {
      customer: customer?.name ?? '',
      date: formatTime(undoableTimestamp.timestamp, locale),
    }))
    if (!confirmed) return
    setWorkday((current) => undoLatestTimestamp(current))
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

  function arriveHome() {
    const completed = { ...workday, arrivedHomeAt: new Date().toISOString() }
    setWorkday(completed)
    setHistory((current) => [completed, ...current.filter((day) => day.id !== completed.id)])
    setIsFinishSheetOpen(false)
    setIsNoteSheetOpen(false)
  }

  function startHomeJourney() {
    if (!canStartHomeJourney) return
    setWorkday((current) => beginHomeJourney(current))
    setIsFinishSheetOpen(false)
  }

  function reopenCompletedWorkday(day) {
    if (!canReopenWorkday(day, workday, history)) return
    const confirmed = window.confirm(t('reopenConfirmation', {
      date: formatTime(day.arrivedHomeAt, locale),
    }))
    if (!confirmed) return

    setWorkday(reopenWorkday(day))
    setHistory((current) => current.filter((candidate) => candidate.id !== day.id))
    setIsCustomerSheetOpen(false)
    setIsFinishSheetOpen(false)
    setIsNoteSheetOpen(false)
    setNow(Date.now())
    setActiveView('today')
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
    setNow(Date.now())
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
      t('csvTimestampCorrections'),
    ]

    const rows = history.flatMap((day) => {
      const visits = day.visits.length ? day.visits : [null]
      return visits.map((visit) => [
        day.id,
        csvDate(day.leftHomeAt),
        day.leftHomeAt,
        visit?.name ?? '',
        visit?.arrivedAt ?? '',
        visit?.leftAt ?? '',
        visit?.kilometres ?? '',
        day.arrivedHomeAt,
        day.kilometresHome ?? '',
        day.note ?? '',
        day.timestampCorrections ? JSON.stringify(day.timestampCorrections) : '',
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

  async function importCsv(event) {
    const [file] = event.target.files
    event.target.value = ''
    if (!file) return

    try {
      const importedWorkdays = importWorkdaysFromCsv(await file.text())
      const existingIds = new Set(history.map((day) => String(day.id)))
      const newWorkdays = importedWorkdays.filter((day) => !existingIds.has(String(day.id)))
      const duplicateCount = importedWorkdays.length - newWorkdays.length

      if (!newWorkdays.length) {
        setImportStatus({ type: 'info', key: 'importNoNewDays' })
        return
      }

      const confirmed = window.confirm(t('importConfirmation', {
        workdays: t(newWorkdays.length === 1 ? 'newWorkdayCount' : 'newWorkdayCountPlural', {
          count: newWorkdays.length,
        }),
        duplicates: t(duplicateCount === 1 ? 'duplicateCount' : 'duplicateCountPlural', {
          count: duplicateCount,
        }),
      }))
      if (!confirmed) {
        setImportStatus(null)
        return
      }

      setHistory((current) => [...newWorkdays, ...current]
        .sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt)))
      setImportStatus({
        type: 'success',
        key: newWorkdays.length === 1 ? 'importSuccess' : 'importSuccessPlural',
        replacements: {
          count: newWorkdays.length,
          duplicates: t(duplicateCount === 1 ? 'duplicateSkipped' : 'duplicatesSkipped', {
            count: duplicateCount,
          }),
        },
      })
    } catch {
      setImportStatus({ type: 'error', key: 'importInvalidFile' })
    }
  }

  function openCustomerSheet(event) {
    event.currentTarget.focus({ preventScroll: true })
    setIsCustomerSheetOpen(true)
  }

  function openStopEditor(id, focusDistance, event, dayId) {
    event.currentTarget.focus({ preventScroll: true })
    setEditingRoute({ id, focusDistance, dayId })
  }

  function saveRouteStop(values) {
    const edit = day => editingRoute.id == null ? { ...day, kilometresHome: values.kilometres } : {
      ...day, visits: day.visits.map(visit => visit.id === editingRoute.id ? { ...visit, ...values } : visit),
    }
    if (editingRoute.dayId != null) {
      setHistory(current => current.map(day => day.id === editingRoute.dayId ? edit(day) : day))
      setWorkday(current => current?.id === editingRoute.dayId && current.arrivedHomeAt ? edit(current) : current)
      setHistorySaved(true)
    } else setWorkday(edit)
    setEditingRoute(null)
  }

  const routeEditDay = editingRoute?.dayId != null ? history.find(day => day.id === editingRoute.dayId) : workday

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  function renderVisit(visit, index) {
    const isCurrent = visit.id === currentActionVisit?.id
    const isComplete = Boolean(visit.leftAt) && !isCurrent
    return (<article
              className={`visit-card route-stop ${isCurrent ? 'current' : isComplete ? 'complete' : 'upcoming'} ${isComplete && undoableTimestamp?.visitId !== visit.id ? 'compact' : ''}`}
              key={visit.id}
            >
              <div className="visit-heading">
                <span className="visit-number">{isComplete ? <Icon name="check" /> : index + 1}</span>
                <div>
                  <h2>{visit.name}</h2>
                  {!isComplete && <p className="visit-state">{t(!isCurrent ? 'upcomingStop' : visit.arrivedAt ? 'atCustomer' : 'travellingToCustomer')}</p>}
                  {isComplete && (
                    <p className="visit-summary">
                      {visit.arrivedAt ? formatClock(visit.arrivedAt, locale) : t('notRecorded')}{timestampStar(workday, `visits.${index}.arrivedAt`)}–{formatClock(visit.leftAt, locale)}{timestampStar(workday, `visits.${index}.leftAt`)}
                      {visit.kilometres != null ? ` · ${formatKilometres(visit.kilometres)} km` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="timestamps visit-detail">
                <p>
                  <span>{t('arrived')}</span>
                  <strong>{visit.arrivedAt ? formatHistoryTime(visit.arrivedAt, workday, locale) : t('notYet')}{timestampStar(workday, `visits.${index}.arrivedAt`)}</strong>
                  {undoableTimestamp?.visitId === visit.id && undoableTimestamp.field === 'arrivedAt' && (
                    <button className="undo-timestamp-button" type="button" aria-label={t('undoTimestamp')} title={t('undoTimestamp')} onClick={undoTimestamp}>
                      <Icon name="undo" />
                    </button>
                  )}
                </p>
                <p>
                  <span>{t('left')}</span>
                  <strong>{visit.leftAt ? formatHistoryTime(visit.leftAt, workday, locale) : t('notYet')}{timestampStar(workday, `visits.${index}.leftAt`)}</strong>
                  {undoableTimestamp?.visitId === visit.id && undoableTimestamp.field === 'leftAt' && (
                    <button className="undo-timestamp-button" type="button" aria-label={t('undoTimestamp')} title={t('undoTimestamp')} onClick={undoTimestamp}>
                      <Icon name="undo" />
                    </button>
                  )}
                </p>
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

            </article>)
  }

  return (
    <main ref={shellRef} className={`app-shell${workday?.leftHomeAt && !workday.arrivedHomeAt ? ' has-active-day' : ''}`}>
      {activeView === 'today' && (
        <div className="view">
          <header className="app-header">
            <p className="eyebrow">{t('todayOnRoad')}</p>
            <h1>{t('appTitle')}</h1>
            {!workday?.arrivedHomeAt && (
              <p className="status">
                {(!workday || !workday.leftHomeAt) && t('workdayReady')}
                {workday?.leftHomeAt && t('workdayInProgress')}
              </p>
            )}
          </header>

          {showReleaseNotes && <ReleaseNotes version={packageJson.version} t={t} onDismiss={dismissReleaseNotes} compact />}

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
                <strong>{formatKilometres(totalKilometres(workday))} km</strong>
              </div>
            </section>
          )}

          {workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <button className="day-note-button" type="button" aria-label={t(workday.note?.trim() ? 'editDayNote' : 'addDayNote')} onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setIsNoteSheetOpen(true) }}>
              <Icon name="note" />
              <span>
                <strong>{workday.note?.trim() ? t('editDayNote') : t('addDayNote')}</strong>
                {workday.note?.trim() && <small>{t('noteAdded')}</small>}
              </span>
            </button>
          )}

          {isLongWorkday && (
            <aside className="long-workday-warning" role="status">
              <span aria-hidden="true">!</span>
              <p>{t('longWorkdayWarning')}</p>
            </aside>
          )}

          {(!workday || !workday.leftHomeAt) && (
            <section className="prepared-day" aria-labelledby="prepared-day-title">
              <div className="prepared-day-icon"><Icon name="check" /></div>
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
              {currentActionVisit && (
                <section className="current-stop" aria-label={t('currentAction')}>
                  {renderVisit(currentActionVisit, workday.visits.findIndex(visit => visit.id === currentActionVisit.id))}
                </section>
              )}
              <h2 className="route-heading">{t('workdayRoute')}</h2>
              <RouteTimeline day={workday} currentVisit={currentActionVisit} undoable={undoableTimestamp}
                t={t} formatTime={value => formatHistoryTime(value, workday, locale)} formatDistance={formatKilometres}
                star={path => timestampStar(workday, path)} onUndo={undoTimestamp} onEdit={openStopEditor} />

              <div ref={dockRef} className="action-dock" aria-label={t('currentAction')}>
                {currentActionVisit && !currentActionVisit.arrivedAt && (
                  <button className="primary" onClick={() => recordVisitTime(currentActionVisit.id, 'arrivedAt')}>
                    <span className="action-label">{t('arrivedAt', { name: currentActionVisit.name })}</span>
                  </button>
                )}
                {currentActionVisit?.arrivedAt && !currentActionVisit.leftAt && (
                  <button className="primary" onClick={() => recordVisitTime(currentActionVisit.id, 'leftAt')}>
                    <span className="action-label">{t('leaveCustomer', { name: currentActionVisit.name })}</span>
                  </button>
                )}
                {canAddCustomer && (
                  <>
                    <button className="primary" onClick={openCustomerSheet}>
                      {t('addNextStop')}
                    </button>
                    <button
                      className="finish-workday-button"
                      onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setIsFinishSheetOpen(true) }}
                    >
                      {t('driveHome')}
                    </button>
                  </>
                )}
                {canArriveHome && (
                  <button className="primary" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setIsFinishSheetOpen(true) }}>
                    {t('arrivedHomeNow')}
                  </button>
                )}
              </div>
            </>
          )}

          {workday?.arrivedHomeAt && (
            <div className="completed-day-actions">
              {canReopenWorkday(workday, workday, history) && (
                <button className="reopen-workday-button" type="button" onClick={() => reopenCompletedWorkday(workday)}>
                  {t('reopenWorkday')}
                </button>
              )}
              <button className="primary" onClick={startNewDay}>{t('startNewDay')}</button>
            </div>
          )}

          {isCustomerSheetOpen && canAddCustomer && (
            <Sheet titleId="customer-sheet-title" onClose={() => setIsCustomerSheetOpen(false)}>
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
                    <Icon name="close" />
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
                      data-primary-focus
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
            </Sheet>
          )}

          {isNoteSheetOpen && workday?.leftHomeAt && !workday.arrivedHomeAt && (
            <Sheet titleId="note-sheet-title" className="note-sheet" onClose={() => setIsNoteSheetOpen(false)}>
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
                    <Icon name="close" />
                  </button>
                </div>
                <p className="sheet-description" id="note-description">{t('dayNoteDescription')}</p>
                <textarea
                  data-primary-focus
                  aria-label={t('dayNote')}
                  aria-describedby="note-description"
                  value={workday.note ?? ''}
                  placeholder={t('dayNotePlaceholder')}
                  onChange={(event) => updateWorkdayNote(event.target.value)}
                />
                <p className="autosave-status">
                  <Icon name="check" /> {t('noteSavedAutomatically')}
                </p>
            </Sheet>
          )}

          {isFinishSheetOpen && (canStartHomeJourney || canArriveHome) && (
            <Sheet titleId="finish-sheet-title" className="finish-sheet" onClose={() => setIsFinishSheetOpen(false)}>
                <div className="sheet-heading">
                  <div>
                    <p className="eyebrow">{t(isTravellingHome ? 'finalStep' : 'finalJourney')}</p>
                    <h2 id="finish-sheet-title">{t(isTravellingHome ? 'reviewHomeJourney' : 'driveHome')}</h2>
                  </div>
                  <button
                    className="close-sheet"
                    type="button"
                    aria-label={t('close')}
                    onClick={() => setIsFinishSheetOpen(false)}
                  >
                    <Icon name="close" />
                  </button>
                </div>

                <p className="sheet-description">
                  {t(isTravellingHome ? 'arrivalReviewDescription' : 'homeJourneyDescription')}
                </p>
                <label className="kilometres-field">
                  {homeKilometresLegLabel(workday.visits, t)}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    data-primary-focus
                    placeholder={t('optional')}
                    value={workday.kilometresHome ?? ''}
                    onChange={(event) => updateHomeKilometres(event.target.value)}
                  />
                </label>
                <button
                  className="primary finish-confirm"
                  type="button"
                  onClick={isTravellingHome ? arriveHome : startHomeJourney}
                >
                  {t(isTravellingHome ? 'confirmArrivalHome' : 'startDriveHome')}
                </button>
            </Sheet>
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
              const kilometresIncomplete = hasMissingKilometres(day)

              return (
                <details className={`history-card${kilometresIncomplete ? ' incomplete' : ''}`} key={day.id}>
                  <summary>
                    <div>
                      <strong>{formatDate(day.leftHomeAt, locale)}</strong>
                      <span>{formatClock(day.leftHomeAt, locale)}{timestampStar(day, 'leftHomeAt')}–{formatHistoryTime(day.arrivedHomeAt, day, locale, false)}{timestampStar(day, 'arrivedHomeAt')}</span>
                      <span>{t(day.visits.length === 1 ? 'customerCount' : 'customerCountPlural', { count: day.visits.length })}</span>
                      {day.note?.trim() && <span>{t('noteAdded')}</span>}
                      {kilometresIncomplete && (
                        <span className="history-kilometres-warning">{t('kilometresIncomplete')}</span>
                      )}
                    </div>
                    <span className="history-total">{total === null ? t('noKmRecorded') : kilometresIncomplete ? t('kilometresRecorded', { count: formatKilometres(total) }) : `${formatKilometres(total)} km`}</span>
                  </summary>

                  <div className="history-details">
                    <RouteTimeline day={day} t={t} formatTime={value => formatHistoryTime(value, day, locale)}
                      formatDistance={formatKilometres} star={path => timestampStar(day, path)}
                      renderTimestamp={(path, value, label, editLabel) => timestampRow(day, path, value, label, editLabel)}
                      onEdit={(id, focusDistance, event) => openStopEditor(id, focusDistance, event, day.id)} />
                    {Object.keys(day.timestampCorrections ?? {}).length > 0 && <small className="original-timestamp">* {t('manuallyChanged')}</small>}
                    {day.note?.trim() && <div className="history-day-note"><h3>{t('dayNote')}</h3><p>{day.note}</p></div>}
                    <button className="secondary" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); openHistoryEditor(day) }}>{t('editWorkday')}</button>
                    {latestCompleted?.id === day.id && canReopenWorkday(day, workday, history) && (
                      <button
                        className="reopen-workday-button"
                        type="button"
                        onClick={() => reopenCompletedWorkday(day)}
                      >
                        {t('reopenWorkday')}
                      </button>
                    )}
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
            <p className="status">{t('optionsDescription')}</p>
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
                  {option.nativeLabel !== t(option.value === 'en' ? 'english' : 'spanish') && <small lang={option.value}>{option.nativeLabel}</small>}
                </span>
              </label>
            ))}
            <p>{t('savedAutomatically')}</p>
          </fieldset>

          {!isAppInstalled && (installPrompt || iosDevice) && (
            <section className="install-panel" aria-labelledby="install-title">
              <div className="install-icon" aria-hidden="true">
                <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="" />
              </div>
              <div>
                <h3 id="install-title">{iosDevice ? t('installIosTitle') : t('installApp')}</h3>
                <p>{t('installAppDescription')}</p>
              </div>

              {installPrompt && (
                <button className="primary" type="button" onClick={installApp}>
                  {t('installNow')}
                </button>
              )}

              {iosDevice && !installPrompt && (
                <ol className="ios-install-steps">
                  <li>{t('installIosStepShare')}</li>
                  <li>{t('installIosStepHome')}</li>
                </ol>
              )}
            </section>
          )}

          <section className="import-panel data-transfer-panel" aria-labelledby="data-transfer-title">
            <div>
              <p className="panel-eyebrow">{t('dataTransfer')}</p>
              <h3 id="data-transfer-title">{t('importCsv')}</h3>
              <p>{t('importCsvDescription')}</p>
              <p>{t('exportFromHistory')}</p>
            </div>
            <label className="secondary import-button">
              {t('chooseCsvFile')}
              <input type="file" accept=".csv,text/csv" onChange={importCsv} />
            </label>
            {importStatus && (
              <p className={`import-status ${importStatus.type}`} role={importStatus.type === 'error' ? 'alert' : 'status'}>
                {t(importStatus.key, importStatus.replacements)}
              </p>
            )}
          </section>
          <section className="about-panel" aria-labelledby="about-title">
            <h3 id="about-title">{t('aboutApp')}</h3>
            <p>{t('localStorageDescription')}</p>
            <details className="release-archive">
              <summary>{t('whatsNew')} · v{packageJson.version}</summary>
              <ReleaseNotes version={packageJson.version} t={t} />
            </details>
          </section>
        </section>
      )}

      <nav ref={navigationRef} className="bottom-nav" aria-label={t('primaryNavigation')}>
        <button
          className={activeView === 'today' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('today')}
          aria-current={activeView === 'today' ? 'page' : undefined}
        >
          <NavigationIcon name="today" />
          {t('today')}
        </button>
        <button
          className={activeView === 'history' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('history')}
          aria-current={activeView === 'history' ? 'page' : undefined}
        >
          <NavigationIcon name="history" />
          {t('history')}
        </button>
        <button
          className={activeView === 'options' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('options')}
          aria-current={activeView === 'options' ? 'page' : undefined}
        >
          <NavigationIcon name="options" />
          {t('options')}
        </button>
      </nav>

      {editingRoute && routeEditDay && (
        <StopEditor visit={routeEditDay.visits.find(visit => visit.id === editingRoute.id) ?? null}
          kilometresHome={routeEditDay.kilometresHome} focusDistance={editingRoute.focusDistance} t={t}
          from={editingRoute.id == null ? routeEditDay.visits.at(-1)?.name ?? t('homeLower')
            : routeEditDay.visits[routeEditDay.visits.findIndex(visit => visit.id === editingRoute.id) - 1]?.name ?? t('homeLower')}
          onClose={() => setEditingRoute(null)} onSave={saveRouteStop} />
      )}
      {historySaved && <p className="history-save-feedback" role="status">{t('changesSaved')}</p>}
      {editingDay && <HistoryEditor day={editingDay} target={editingTimestamp} t={t} locale={locale} onClose={() => setEditingDay(null)} onSave={(edited) => {
        setHistory((current) => current.map((day) => day.id === edited.id ? edited : day)
          .sort((a, b) => new Date(b.arrivedHomeAt) - new Date(a.arrivedHomeAt)))
        setWorkday((current) => current?.id === edited.id && current.arrivedHomeAt ? edited : current)
        setEditingDay(null)
        setHistorySaved(true)
      }} />}
      <footer className="app-version">v{packageJson.version}</footer>
    </main>
  )
}

export default App
