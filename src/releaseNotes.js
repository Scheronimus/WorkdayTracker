export const LAST_SEEN_RELEASE_KEY = 'workday-tracker-last-seen-release'

export function shouldShowReleaseNotes(version, storage = localStorage) {
  try { return storage.getItem(LAST_SEEN_RELEASE_KEY) !== version } catch { return true }
}

export function markReleaseNotesSeen(version, storage = localStorage) {
  try { storage.setItem(LAST_SEEN_RELEASE_KEY, version) } catch { /* Dismiss for this session if storage is unavailable. */ }
}

export const releaseNoteKeys = ['releaseEdit', 'releaseConfirm', 'releaseOriginals', 'releaseTransfer']
