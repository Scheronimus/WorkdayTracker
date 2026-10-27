import { useEffect, useRef, useState } from 'react'
import { commitHistoryEdit, commitTimestampEdit, createHistoryDraft } from './historyEdit'
import useModalDialog from './useModalDialog'

export default function HistoryEditor({ day, target, t, locale, onSave, onClose }) {
  const dialog = useRef(null)
  const [draft, setDraft] = useState(() => createHistoryDraft(day))
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState(null)
  const [discard, setDiscard] = useState(false)
  useModalDialog(dialog)
  useEffect(() => {
    dialog.current.querySelector('[data-primary-focus]')?.focus()
  }, [review, discard])
  function close() {
    if (JSON.stringify(draft) !== JSON.stringify(createHistoryDraft(day))) setDiscard(true)
    else onClose()
  }
  function update(field, value, index) {
    setReview(null)
    // Revalidate an already-submitted draft so cross-field time conflicts and
    // corrected field messages stay in sync, without saving any values.
    if (Object.keys(errors).length) {
      const next = index == null ? { ...draft, [field]: value } : {
        ...draft, visits: draft.visits.map((visit, i) => i === index ? { ...visit, [field]: value } : visit),
      }
      setErrors((target ? commitTimestampEdit(day, next, target) : commitHistoryEdit(day, next)).errors)
    }
    setDraft((current) => index == null ? { ...current, [field]: value } : {
      ...current, visits: current.visits.map((visit, i) => i === index ? { ...visit, [field]: value } : visit),
    })
  }
  function save(confirmed = false) {
    const result = target ? commitTimestampEdit(day, draft, target, confirmed) : commitHistoryEdit(day, draft, confirmed)
    setErrors(result.errors)
    if (Object.keys(result.errors).length) {
      requestAnimationFrame(() => dialog.current.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    if (!result.saved) setReview(result.changes)
    else onSave(result.day)
  }
  function label(path) {
    const parts = path.split('.')
    if (parts[0] === 'visits') {
      const labels = { arrivedAt: 'arrived', leftAt: 'left', name: 'customerName', kilometres: 'distance' }
      return `${Number(parts[1]) + 1}. ${draft.visits[parts[1]].name} — ${t(labels[parts[2]])}`
    }
    if (path === 'kilometresHome') return t('csvFinalJourney')
    return t(path === 'leftHomeAt' ? 'leftHome' : 'arrivedHome')
  }
  function field(key, title, type = 'text', index) {
    const path = index == null ? key : `visits.${index}.${key}`
    const value = index == null ? draft[key] : draft.visits[index][key]
    return <label className="history-editor-field" key={path}>{title}
      <input type={type} inputMode={type === 'number' ? 'decimal' : undefined} step={type === 'datetime-local' ? '1' : 'any'} min={type === 'number' ? '0' : undefined}
        value={value ?? ''} onChange={(event) => update(key, event.target.value, index)}
        aria-invalid={Boolean(errors[path])} aria-describedby={errors[path] ? `error-${path}` : undefined} />
      {errors[path] && <span className="editor-error" id={`error-${path}`}>{t(errors[path])}</span>}
    </label>
  }
  const display = (value) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(new Date(value)) : t('notRecorded')
  const targetParts = target?.split('.')
  const targetIndex = targetParts?.length === 3 ? Number(targetParts[1]) : undefined
  const targetKey = targetParts?.at(-1)
  const targetValue = target ? (targetIndex == null ? draft[targetKey] : draft.visits[targetIndex][targetKey]) : ''
  const currentValue = target ? (targetIndex == null ? day[targetKey] : day.visits[targetIndex][targetKey]) : null
  function updatePart(part, value) {
    const [date = '', time = ''] = (targetValue || '').split('T')
    update(targetKey, part === 'date' ? `${value}T${time || '00:00:00'}` : `${date || createHistoryDraft(day).leftHomeAt.split('T')[0]}T${value}`, targetIndex)
  }
  return <dialog ref={dialog} className={`history-editor${target ? ' timestamp-editor' : ''}`} aria-labelledby="history-editor-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <h2 id="history-editor-title">{target ? t('correctTimestamp', { event: label(target) }) : t('editWorkday')}</h2>
    <p>{t('workdayDate', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(day.leftHomeAt)) })}</p>
    {discard ? <><p>{t('discardQuestion')}</p><div className="editor-actions"><button className="secondary" data-primary-focus onClick={() => setDiscard(false)}>{t('keepEditing')}</button><button className="delete-day-button" onClick={onClose}>{t('discardChanges')}</button></div></> : review ? <>
      <p>{t('timestampReview')}</p>
      <ul className="timestamp-review">{review.map((change) => <li key={change.path}><strong>{label(change.path)}</strong><div>{t('recordedValue')}: {display(change.before)}</div><div>{t('correctedValue')}: {display(change.after)}</div></li>)}</ul>
      <div className="editor-actions"><button className="secondary" data-primary-focus onClick={() => setReview(null)}>{t('keepEditing')}</button><button className="primary" onClick={() => save(true)}>{t('confirmSave')}</button></div>
    </> : <form noValidate onSubmit={(event) => { event.preventDefault(); save() }}>
      <p>{t('editWorkdayHint')}</p>
      {target ? <>
        <p>{t('recordedValue')}: <strong>{display(currentValue)}</strong></p>
        {day.timestampCorrections?.[target] && <p className="original-timestamp">{t('originalTime')}: {display(day.timestampCorrections[target].original)}</p>}
        <label className="history-editor-field">{t('correctionTime')}<input data-primary-focus type="time" step="1" value={targetValue?.split('T')[1] || ''} onChange={(event) => updatePart('time', event.target.value)} aria-invalid={Boolean(errors[target])} aria-describedby={Object.keys(errors).length ? 'correction-errors' : undefined} /></label>
        <label className="history-editor-field">{t('correctionDate')}<input type="date" value={targetValue?.split('T')[0] || ''} onChange={(event) => updatePart('date', event.target.value)} /></label>
        {targetIndex != null && <button className="secondary" type="button" onClick={() => update(targetKey, '', targetIndex)}>{t('clearTimestamp')}</button>}
        {Object.keys(errors).length > 0 && <div className="editor-error" id="correction-errors" role="alert"><p>{t('correctionConflict')}</p><ul>{Object.entries(errors).map(([path, error]) => <li key={path}>{label(path)}: {t(error)}</li>)}</ul></div>}
      </> : <>
      {field('leftHomeAt', t('leftHome'), 'datetime-local')}
      {draft.visits.map((visit, index) => <fieldset key={visit.id}><legend>{index + 1}. {visit.name}</legend>
        {field('name', t('customerName'), 'text', index)}
        {field('arrivedAt', t('arrived'), 'datetime-local', index)}
        {field('leftAt', t('left'), 'datetime-local', index)}
        {field('kilometres', t('distance') + ' (km)', 'number', index)}
      </fieldset>)}
      {field('arrivedHomeAt', t('arrivedHome'), 'datetime-local')}
      {field('kilometresHome', t('csvFinalJourney'), 'number')}
      <label className="history-editor-field">{t('dayNote')}<textarea value={draft.note ?? ''} onChange={(event) => update('note', event.target.value)} /></label>
      </>}
      {Object.keys(errors).length > 0 && <p className="editor-error" role="alert">{t('fixErrors')}</p>}
      <div className="editor-actions"><button className="secondary" type="button" onClick={close}>{t('cancelEdit')}</button><button className="primary" type="submit">{t(target ? 'reviewCorrection' : 'saveChanges')}</button></div>
    </form>}
  </dialog>
}
