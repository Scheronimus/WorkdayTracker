import Icon from './Icon'

export default function RouteTimeline({ day, currentVisit, undoable, t, formatTime, formatDistance, star, onUndo, onEdit }) {
  function undo(field, visitId) {
    if (undoable?.field !== field || undoable?.visitId !== visitId || currentVisit?.id === visitId && visitId != null) return null
    return <button className="undo-timestamp-button" aria-label={t('undoTimestamp')} title={t('undoTimestamp')} onClick={onUndo}><Icon name="undo" /></button>
  }
  function leg(value, from, to, id) {
    return <button className={`trip-leg${value == null ? ' missing' : ''}`} aria-label={t('editLeg', { from, to })}
      onClick={event => onEdit(id, true, event)}>
      <span>{value == null ? t('addKilometres') : `${formatDistance(value)} km`}</span><Icon name="note" />
    </button>
  }
  return <section className="timeline trip-timeline" aria-label={t('workdayRoute')}>
    <ol className="trip-list">
      <li className="trip-origin"><span className="trip-marker" aria-hidden="true" />
        <div className="trip-stop-content"><strong>{t('home')}</strong><div className="trip-times"><span>{t('left')} <time dateTime={day.leftHomeAt}>{formatTime(day.leftHomeAt)}{star('leftHomeAt')}</time></span>{undo('leftHomeAt', undefined)}</div></div>
      </li>
      {day.visits.map((visit, index) => {
        const isCurrent = currentVisit?.id === visit.id
        const from = index ? day.visits[index - 1].name : t('homeLower')
        return <li key={visit.id}>
          {leg(visit.kilometres, from, visit.name, visit.id)}
          <div className={`trip-stop${isCurrent ? ' is-current' : ''}`}>
            <span className={`trip-marker${visit.leftAt && !isCurrent ? ' done' : ''}`} aria-hidden="true">{visit.leftAt && !isCurrent ? <Icon name="check" /> : index + 1}</span>
            <div className="trip-stop-content"><strong>{visit.name}</strong>
              {isCurrent && <span className="trip-state">{t(visit.arrivedAt ? 'atCustomer' : 'travellingToCustomer')}</span>}
              <div className="trip-times"><span>{t('arrived')} <time dateTime={visit.arrivedAt || undefined}>{visit.arrivedAt ? formatTime(visit.arrivedAt) : t('notYet')}{star(`visits.${index}.arrivedAt`)}</time></span>{undo('arrivedAt', visit.id)}</div>
              <div className="trip-times"><span>{t('left')} <time dateTime={visit.leftAt || undefined}>{visit.leftAt ? formatTime(visit.leftAt) : t('notYet')}{star(`visits.${index}.leftAt`)}</time></span>{undo('leftAt', visit.id)}</div>
            </div>
            <button className="trip-edit" aria-label={t('editCustomer', { name: visit.name })} title={t('editCustomer', { name: visit.name })} onClick={event => onEdit(visit.id, false, event)}><Icon name="note" /></button>
          </div>
        </li>
      })}
      {day.homeJourneyStarted && <li>
        {leg(day.kilometresHome, day.visits.at(-1)?.name ?? t('homeLower'), t('homeLower'), null)}
        <div className="trip-stop is-current"><span className="trip-marker" aria-hidden="true" /><div className="trip-stop-content"><strong>{t('home')}</strong><span className="trip-state">{t('travellingHome')}</span></div></div>
      </li>}
    </ol>
  </section>
}
