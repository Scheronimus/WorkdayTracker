import { releaseNoteKeys } from './releaseNotes.js'

export default function ReleaseNotes({ version, t, onDismiss }) {
  return <aside className="release-notes" aria-labelledby="release-notes-title">
    <div className="release-notes-heading">
      <div><p className="eyebrow">{t('whatsNew')}</p><h2 id="release-notes-title">Workday Tracker · v{version}</h2></div>
      {onDismiss && <button className="release-dismiss" type="button" aria-label={t('dismissReleaseNotes')} title={t('dismissReleaseNotes')} onClick={onDismiss}>×</button>}
    </div>
    <ul>{releaseNoteKeys.map((key) => <li key={key}>{t(key)}</li>)}</ul>
  </aside>
}
