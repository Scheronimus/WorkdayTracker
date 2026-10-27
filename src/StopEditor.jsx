import { useState } from 'react'
import Sheet from './Sheet'
import Icon from './Icon'

export default function StopEditor({ visit, kilometresHome, from, focusDistance, t, onSave, onClose }) {
  const [name, setName] = useState(visit?.name ?? '')
  const [kilometres, setKilometres] = useState((visit ? visit.kilometres : kilometresHome) ?? '')
  const [errors, setErrors] = useState({})
  function save(event) {
    event.preventDefault()
    const nextErrors = {}
    if (visit && !name.trim()) nextErrors.name = 'requiredName'
    if (kilometres !== '' && (!Number.isFinite(Number(kilometres)) || Number(kilometres) < 0)) nextErrors.kilometres = 'invalidDistance'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const form = event.currentTarget
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    onSave({ name: name.trim(), kilometres: kilometres === '' ? null : Number(kilometres) })
  }
  return <Sheet titleId="stop-editor-title" className="stop-editor" onClose={onClose}>
    <div className="sheet-heading">
      <h2 id="stop-editor-title">{t('editStop')}</h2>
      <button className="close-sheet" type="button" aria-label={t('close')} onClick={onClose}><Icon name="close" /></button>
    </div>
    <form className="add-customer" noValidate onSubmit={save}>
      {visit && <label>{t('customerName')}
        <input data-primary-focus={!focusDistance || undefined} value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })) }}
          aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'stop-name-error' : undefined} />
        {errors.name && <span className="editor-error" id="stop-name-error">{t(errors.name)}</span>}
      </label>}
      <label>{t('kilometresLeg', { from, to: visit ? name.trim() || t('nextCustomer') : t('homeLower') })}
        <input data-primary-focus={focusDistance || !visit || undefined} type="number" inputMode="decimal" min="0" step="any"
          value={kilometres} placeholder={t('optional')} onChange={event => { setKilometres(event.target.value); setErrors(current => ({ ...current, kilometres: undefined })) }}
          aria-invalid={Boolean(errors.kilometres)} aria-describedby={errors.kilometres ? 'stop-distance-error' : undefined} />
        {errors.kilometres && <span className="editor-error" id="stop-distance-error">{t(errors.kilometres)}</span>}
      </label>
      <div className="stop-editor-actions"><button className="secondary" type="button" onClick={onClose}>{t('cancelEdit')}</button><button className="primary" type="submit">{t('saveChanges')}</button></div>
    </form>
  </Sheet>
}
