import { useCallback, useEffect, useState } from 'react'

// Shared by the two places a student reads back a test — ResultPage's
// Correct/Wrong/Skipped modal and AttemptReviewModal on My Performance — so the
// two can't drift apart, and so expanding in one is remembered in the other.
const STORAGE_KEY = 'neetcbt:review-expanded'

// localStorage can throw (Safari private mode). A review screen failing to open
// would be far worse than losing the preference, hence the try/catch on both
// sides of it.
function readStored() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

/**
 * Expanded/collapsed state for a review modal, persisted across sessions.
 *
 * Persisted because this is a standing preference, not a per-dialog decision:
 * a student who wants the roomy view wants it on every question they review,
 * and having to press expand again on each attempt would be the original
 * complaint in miniature.
 */
export function useModalExpand() {
  const [expanded, setExpanded] = useState(readStored)
  const toggle = useCallback(() => setExpanded(prev => !prev), [])

  // Written as an effect of the value rather than inside the state updater:
  // React may invoke an updater more than once for a single click (StrictMode
  // does so deliberately), and a writer living in there runs on each of those
  // passes. Here it's one write per settled value.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0') } catch { /* preference is optional */ }
  }, [expanded])

  return [expanded, toggle]
}

/**
 * Freeze the page behind an open modal.
 *
 * A modal is a scroll container of its own sitting on top of a page that also
 * scrolls. On a phone that means a flick near the edge scrolls the dashboard
 * behind instead of the questions — the "it moves the wrong thing" half of the
 * complaint. `active` exists because ResultPage renders its review modal
 * conditionally and so must call this from the page body; AttemptReviewModal
 * only mounts when open and can leave it defaulted.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}
