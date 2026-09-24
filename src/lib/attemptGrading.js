// How one submitted attempt's answers read back — shared by every screen that
// replays an attempt (the student's own result screen, and the attempt review
// on both Performance pages). These two used to carry separate copies of this
// logic that had already drifted: the result screen treated every pre-status
// attempt as all-skipped, while the performance review re-derived it.
import { optionEntries, correctOptionKey } from './questionOptions'
import { orderOptionsForReview } from './optionShuffle'

export function attemptGrading(attempt) {
  const stored = attempt?.answers || {}
  const hasNewFormat = stored.responses !== undefined
  const responses = hasNewFormat ? (stored.responses || {}) : stored
  const correctIds = new Set(stored.correct_ids || [])
  const wrongIds = new Set(stored.wrong_ids || [])
  const skippedIds = new Set(stored.skipped_ids || [])
  // The option order this student actually saw. Attempts taken before it was
  // recorded fall back to the authored order — what they always displayed.
  const optionOrder = hasNewFormat ? (stored.option_order || {}) : {}
  const hasStoredStatus = hasNewFormat && (correctIds.size || wrongIds.size || skippedIds.size)

  // Attempts submitted before the key-based fix stored the raw selected option
  // text instead of its key — match either form.
  function isChosen(q, opt) {
    const selected = responses[q.id]
    return !!selected && (selected === opt.key || (opt.text !== '' && selected === opt.text))
  }

  // How this answer scores under the CURRENT answer key.
  function liveStatusOf(q) {
    const selected = responses[q.id]
    if (!selected) return 'skipped'
    const correctKey = correctOptionKey(q)
    const correctEntry = optionEntries(q).find(e => e.key === correctKey)
    return (selected === correctKey || (correctEntry?.text && selected === correctEntry.text)) ? 'correct' : 'wrong'
  }

  // What the student was actually graded as. Their score — and any level
  // unlock it triggered — was based on this, so it stays authoritative even
  // after an answer key is corrected. Attempts predating the stored-status
  // field fall back to live derivation.
  function statusOf(q) {
    if (hasStoredStatus) {
      if (correctIds.has(q.id)) return 'correct'
      if (wrongIds.has(q.id)) return 'wrong'
      return 'skipped'
    }
    return liveStatusOf(q)
  }

  // An admin fixing a key afterwards desyncs the frozen grade from the live
  // key — "Wrong" with the student's own answer sitting green. Detected so it
  // can be explained rather than rendered as a silent contradiction.
  function keyChangedOf(q) {
    if (!hasStoredStatus) return null
    const graded = statusOf(q)
    const now = liveStatusOf(q)
    if (graded === 'skipped' || now === 'skipped' || graded === now) return null
    return { graded, now }
  }

  function optionsFor(q) {
    return orderOptionsForReview(q, optionOrder[q.id])
  }

  return { isChosen, statusOf, keyChangedOf, optionsFor }
}
