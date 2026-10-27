import { useState } from 'react'
import { aggregateHistory, statisticsPeriod, movePeriod } from './historyStatistics'

export default function HistoryStatistics({ history, locale, t, onViewDays, onExport }) {
  const [metric, setMetric] = useState('time')
  const [period, setPeriod] = useState('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedKey, setSelectedKey] = useState(null)
  const { start, end } = statisticsPeriod(anchor, period)
  const days = aggregateHistory(history, start, end)
  const selected = days.find(day => day.key === selectedKey) ?? days.findLast(day => day.records.length) ?? days[0]
  const records = days.flatMap(day => day.records)
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  const duration = ms => `${Math.floor(ms / 3600000)} h ${Math.floor(ms / 60000) % 60} min`
  const compactDuration = ms => {
    const minutes = Math.floor(ms / 60000)
    return minutes < 60 ? t('durationMinutes', { minutes }) : t('durationHoursMinutes', { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, '0') })
  }
  const date = value => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(value)
  const value = day => metric === 'time' ? (day.workMs + day.travelMs) / 3600000 : day.km
  const maximum = Math.max(1, ...days.map(value))
  const ceiling = Math.ceil(maximum)
  const totals = days.reduce((sum, day) => ({ workMs: sum.workMs + day.workMs, travelMs: sum.travelMs + day.travelMs, km: sum.km + day.km, excluded: sum.excluded + day.excluded, incomplete: sum.incomplete + day.incomplete }), { workMs: 0, travelMs: 0, km: 0, excluded: 0, incomplete: 0 })
  const lastDate = new Date(end); lastDate.setDate(lastDate.getDate() - 1)
  const description = day => `${date(day.date)}: ${!day.records.length ? t('statsNoDays') : metric === 'time' ? `${t('workTime')} ${duration(day.workMs)}, ${t('travelTime')} ${duration(day.travelMs)}` : `${number(day.km)} km`}${day.incomplete ? `, ${t('kilometresIncomplete')}` : ''}${day.excluded ? `, ${t('statsExcluded', { count: day.excluded })}` : ''}`

  return <div className="statistics">
    <div className="stats-segments" role="group" aria-label={t('statsMetric')}>
      {['time', 'distance'].map(item => <button key={item} aria-pressed={metric === item} onClick={() => setMetric(item)}>{t(item === 'time' ? 'statsTime' : 'statsDistance')}</button>)}
    </div>
    <div className="stats-segments" role="group" aria-label={t('statsPeriod')}>
      {['week', 'month', 'quarter'].map(item => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{t(`stats${item}`)}</button>)}
    </div>
    <div className="stats-period">
      <button aria-label={t('statsPrevious')} onClick={() => setAnchor(movePeriod(anchor, period, -1))}>‹</button>
      <strong aria-live="polite">{date(start)} – {date(lastDate)}</strong>
      <button aria-label={t('statsNext')} onClick={() => setAnchor(movePeriod(anchor, period, 1))}>›</button>
    </div>
    <button className="stats-current" onClick={() => setAnchor(new Date())}>{t('statsCurrent')}</button>
    <div className="stats-card">
      <p className="eyebrow">{t(metric === 'time' ? 'statsTotalTime' : 'statsRecordedDistance')}</p>
      <p className="stats-total">{metric === 'time' ? duration(totals.workMs + totals.travelMs) : `${number(totals.km)} km`}</p>
      {metric === 'time' && <div className="stats-legend"><span><i className="stats-work" />{t('workTime')} {duration(totals.workMs)}</span><span><i className="stats-travel" />{t('travelTime')} {duration(totals.travelMs)}</span></div>}
      {!records.length && <p role="status">{t('statsEmpty')}</p>}
      <div className="stats-chart-layout">
        <div className="stats-axis" aria-hidden="true">{[4, 3, 2, 1, 0].map(step => <span key={step}>{number(ceiling * step / 4)}{step === 4 ? metric === 'time' ? ' h' : ' km' : ''}</span>)}</div>
        <div className="stats-scroll" tabIndex="0" role="region" aria-label={t('statsChart')}>
          <div className={`stats-bars ${period === 'quarter' ? 'stats-wide' : ''}`}>
            {days.map((day, index) => <button key={day.key} className={`stats-day ${selected.key === day.key ? 'is-selected' : ''}`} aria-label={description(day)} aria-pressed={selected.key === day.key} onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const target = event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))
              setSelectedKey(days[target].key)
              event.currentTarget.parentElement.children[target].focus()
            }} onClick={() => setSelectedKey(day.key)}>
              <svg viewBox="0 0 20 200" preserveAspectRatio="none" aria-hidden="true">
                <rect x="1" y="0" width="18" height="200" fill="transparent" />
                {metric === 'time' ? <><rect x="3" y={200 - day.workMs / 3600000 / ceiling * 200} width="14" height={day.workMs / 3600000 / ceiling * 200} fill="#4338ca" /><rect x="3" y={200 - value(day) / ceiling * 200} width="14" height={day.travelMs / 3600000 / ceiling * 200} fill="#087f8c" /></> : <rect x="3" y={200 - value(day) / ceiling * 200} width="14" height={value(day) / ceiling * 200} fill="#4338ca" />}
                {day.records.length > 0 && value(day) === 0 && <circle cx="10" cy="197" r="3" fill="#586579" />}
              </svg>
              <span aria-hidden="true">{period === 'week' ? new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date) : index % (period === 'quarter' ? 7 : 5) === 0 || day.date.getDate() === 1 ? new Intl.DateTimeFormat(locale, { day: 'numeric', ...(period === 'quarter' ? { month: 'short' } : {}) }).format(day.date) : ' '}</span>
            </button>)}
          </div>
        </div>
      </div>
      <p className="stats-hint">{t(period === 'quarter' ? 'statsScrollHint' : 'statsTapHint')}</p>
      <label className="stats-day-picker">{t('statsSelectDay')}<select value={selected.key} onChange={event => setSelectedKey(event.target.value)}>{days.map(day => <option key={day.key} value={day.key}>{date(day.date)}{day.records.length ? '' : ` · ${t('statsNoDays')}`}</option>)}</select></label>
      <div className="stats-detail" aria-live="polite">
        <h3 className="stats-detail-date">{new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(selected.date)}</h3>
        {!selected.records.length ? <p>{t('statsNoDays')}</p> : <>
          <dl className="stats-detail-metrics">
            {metric === 'time' ? <>
              <div><dt><i className="stats-work" aria-hidden="true" />{t('workTime')}</dt><dd>{compactDuration(selected.workMs)}</dd></div>
              <div><dt><i className="stats-travel" aria-hidden="true" />{t('travelTime')}</dt><dd>{compactDuration(selected.travelMs)}</dd></div>
              <div className="stats-detail-total"><dt>{t('statsTotalTime')}</dt><dd>{compactDuration(selected.workMs + selected.travelMs)}</dd></div>
            </> : <div className="stats-detail-total"><dt>{t('statsRecordedDistance')}</dt><dd>{number(selected.km)} <span className="stats-detail-unit">km</span></dd></div>}
          </dl>
          {!!selected.incomplete && <p className="stats-warning">{t('kilometresIncomplete')}</p>}
          {!!selected.excluded && <p className="stats-warning">{t('statsExcluded', { count: selected.excluded })}</p>}
          {selected.unusual && <p className="stats-warning">{t('statsUnusual')}</p>}
          <button className="stats-view-days" onClick={() => onViewDays(selected.key)}><span>{t('statsViewDays')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
        </>}
      </div>
      {metric === 'time' && totals.excluded > 0 && <p className="stats-warning">{t('statsExcluded', { count: totals.excluded })}</p>}
      {metric === 'distance' && totals.incomplete > 0 && <p className="stats-warning">{t('statsIncomplete', { count: totals.incomplete })}</p>}
      <details className="stats-table"><summary>{t('statsTable')}</summary><div className="stats-table-scroll"><table><caption>{date(start)} – {date(lastDate)}</caption><thead><tr><th>{t('statsDate')}</th><th>{t('workTime')}</th><th>{t('travelTime')}</th><th>km</th><th>{t('statsNotes')}</th></tr></thead><tbody>{days.map(day => <tr key={day.key}><th scope="row">{date(day.date)}</th><td>{day.records.length ? duration(day.workMs) : '—'}</td><td>{day.records.length ? duration(day.travelMs) : '—'}</td><td>{day.records.length ? number(day.km) : '—'}</td><td>{!day.records.length ? t('statsNoDays') : [day.incomplete && t('kilometresIncomplete'), day.excluded && t('statsExcluded', { count: day.excluded }), day.unusual && t('statsUnusual')].filter(Boolean).join('; ')}</td></tr>)}</tbody></table></div></details>
    </div>
    <button className="secondary" disabled={!records.length} onClick={() => onExport(records)}>{t('statsExport')}</button>
  </div>
}
