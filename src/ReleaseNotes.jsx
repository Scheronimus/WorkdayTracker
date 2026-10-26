import { releaseNoteKeys } from './releaseNotes.js'
import Icon from './Icon'

export default function ReleaseNotes({ version, t, onDismiss, compact = false }) {
  const items = <ul>{releaseNoteKeys.map((key) => <li key={key}>{t(key)}</li>)}</ul>
  return <aside className={`release-notes${compact ? ' release-notes-compact' : ''}`} aria-labelledby="release-notes-title">
    <div className="release-notes-heading">
      <div><p className="eyebrow">{t('whatsNew')}</p><h2 id="release-notes-title">Workday Tracker · v{version}</h2></div>
      {onDismiss && <button className="release-dismiss" type="button" aria-label={t('dismissReleaseNotes')} title={t('dismissReleaseNotes')} onClick={onDismiss}><Icon name="close" /></button>}
    </div>
    {compact ? <details className="release-preview"><summary>{t('viewReleaseNotes')}</summary>{items}</details> : items}
  </aside>
}
