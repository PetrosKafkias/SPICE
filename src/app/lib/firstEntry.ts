// A Municipality user's first visit to the Co-Creation Hub starts on the "Choose how you'd like
// to begin" page. Once that page has been shown, later visits go straight to the hub.
const STORAGE_PREFIX = 'spice-first-entry-seen:';

export function hasSeenFirstEntry(userId: number) {
  try { return window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === '1'; } catch { return true; }
}

export function markFirstEntrySeen(userId: number) {
  try { window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, '1'); } catch { /* storage unavailable */ }
}
