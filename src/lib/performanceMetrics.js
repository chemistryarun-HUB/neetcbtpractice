import { MARKS_CORRECT, NEET_CHEMISTRY_SYLLABUS, UNIT_LEVELS, thresholdPctFor } from './constants'

const ALL_UNITS = NEET_CHEMISTRY_SYLLABUS.flatMap(s => s.units)

export function unitName(unitId) {
  return ALL_UNITS.find(u => u.id === unitId)?.name || `Unit ${unitId}`
}

export function levelDef(unitId, level) {
  return (UNIT_LEVELS[unitId] || []).find(l => l.id === level) || null
}

export function totalQuestions(a) {
  return (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
}

// True accuracy (correct / attempted) — distinct from score, which factors in negative marking.
export function accuracyOf(a) {
  const total = totalQuestions(a)
  return total > 0 ? (a.correct_count / total) * 100 : 0
}

// Score as a % of max possible marks — used only for unlock-threshold comparisons,
// matching how TestPage.jsx/AdminStudents.jsx decide level-unlock eligibility.
export function scorePct(a) {
  const total = totalQuestions(a)
  const max = total * MARKS_CORRECT
  return max > 0 ? (a.score / max) * 100 : 0
}

export function aggregateAccuracy(attempts) {
  const totals = attempts.reduce((acc, a) => {
    acc.correct += a.correct_count || 0
    acc.total += totalQuestions(a)
    return acc
  }, { correct: 0, total: 0 })
  return totals.total > 0 ? (totals.correct / totals.total) * 100 : 0
}

// Score as a % of max possible marks, aggregated across many attempts —
// weighted by question count (sum of score / sum of max marks) rather than a
// naive mean of each attempt's own scorePct, so a 25-question attempt isn't
// weighted the same as a 5-question one. Same weighting approach as
// aggregateAccuracy above, just for score-with-negative-marking instead of
// raw correct/attempted.
export function aggregateScorePct(attempts) {
  const totals = attempts.reduce((acc, a) => {
    acc.score += a.score || 0
    acc.max += totalQuestions(a) * MARKS_CORRECT
    return acc
  }, { score: 0, max: 0 })
  return totals.max > 0 ? (totals.score / totals.max) * 100 : 0
}

export function avgTimePerQuestion(attempts) {
  const totals = attempts.reduce((acc, a) => {
    acc.time += a.time_taken || 0
    acc.q += totalQuestions(a)
    return acc
  }, { time: 0, q: 0 })
  return totals.q > 0 ? totals.time / totals.q : 0
}

// Consecutive days with at least one submitted attempt, counting back from
// today (or yesterday, so a streak isn't shown broken just because today's
// practice hasn't happened yet).
export function computeStreak(attempts) {
  const days = new Set(attempts.filter(a => a.submitted_at).map(a => new Date(a.submitted_at).toDateString()))
  if (days.size === 0) return 0
  const cursor = new Date()
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(cursor.toDateString())) return 0
  }
  let streak = 0
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * A level's attempts in the order they actually happened (oldest first), each
 * tagged with the position it occupies in that sequence.
 *
 * `position` exists because the stored `attempt_number` cannot be trusted for
 * display. TestPage assigns it at test-START time from a count, and two things
 * corrupt it:
 *
 *   - An older build counted abandoned (never-submitted) sessions, so a student
 *     who bailed out of four tests before finishing one had their first real
 *     attempt stored as "#5" — a sequence starting at 5 with nothing before it.
 *   - The number is chosen before the row exists, so two sessions started
 *     against the same count both claim it, leaving two "#2"s in one level.
 *
 * Both artifacts are in production data. The counting fix shipped in Jul 2026
 * (8f7a526) with a one-time renumber, but attempts created afterwards by
 * students still running a cached copy of the old bundle kept reproducing it,
 * so this is not a closed historical window that a second backfill would seal.
 *
 * Position is derived from submission order instead — a fact about what
 * happened rather than a number guessed before it happened. `attempt_number`
 * is deliberately still used for the unlock-threshold maths (see clearedInfo /
 * attemptClearedOwnBar): that's the bar the app actually applied at the time,
 * and re-deriving it now would retroactively re-judge levels students have
 * genuinely unlocked.
 */
export function attemptsInOrder(attemptsForLevel) {
  return [...attemptsForLevel]
    .sort((a, b) =>
      String(a.submitted_at || '').localeCompare(String(b.submitted_at || '')) ||
      (a.attempt_number ?? 0) - (b.attempt_number ?? 0))
    .map((attempt, i) => ({ attempt, position: i + 1 }))
}

// "Cleared" = the first attempt whose score crosses that attempt number's
// real unlock threshold (thresholdPctFor) — i.e. the exact attempt where the
// student actually unlocked the next level in the app. Attempt 4 onward
// keeps using the same bar as attempt 3, matching TestPage.jsx. This answers
// "is the level unlocked" (an aggregate, permanent fact once true — TestPage
// never re-locks a level over a later bad attempt), which is what the
// clearedCount stat tile wants.
export function clearedInfo(attemptsForLevel) {
  // Walked in submission order rather than by attempt_number, which duplicates
  // often enough to make that sort unstable (see attemptsInOrder).
  for (const { attempt: a } of attemptsInOrder(attemptsForLevel)) {
    const requiredPct = thresholdPctFor(a.attempt_number)
    if (requiredPct != null && scorePct(a) >= requiredPct) {
      return { cleared: true, attemptNumber: a.attempt_number }
    }
  }
  return { cleared: false }
}

// Did THIS specific attempt clear its own attempt-scaled threshold — distinct
// from clearedInfo(), which answers "is the level unlocked" as a permanent,
// aggregate fact. Used for the per-row "Level cleared" badge: once a level is
// cleared once, the level stays unlocked, but a later attempt that itself
// scored badly (even negative, from heavy negative marking) shouldn't still
// be badged "Level cleared" — that misrepresents that specific attempt.
export function attemptClearedOwnBar(a) {
  const requiredPct = thresholdPctFor(a.attempt_number)
  return requiredPct != null && scorePct(a) >= requiredPct
}

// Trend as of a specific attempt, identified by its 1-based position in the
// level's submission order (defaults to the latest) — lets a per-attempt row
// show its own trend at that point in time, not just the group's overall one.
//
// Positional rather than keyed on attempt_number: a level with two attempts
// stored as "#2" made the old lookup resolve both rows to the same earlier
// attempt, so one of them showed a trend computed against the wrong test.
export function trendLabel(attemptsForLevel, atPosition = null) {
  const ordered = attemptsInOrder(attemptsForLevel)
  const idx = atPosition == null ? ordered.length - 1 : atPosition - 1
  if (idx < 1 || idx >= ordered.length) return 'needs-work'
  const last = scorePct(ordered[idx].attempt)
  const prev = scorePct(ordered[idx - 1].attempt)
  if (last > prev + 2) return 'improving'
  if (last < prev - 2) return 'declining'
  return 'needs-work'
}

// Level numbers repeat across units, so grouping must always be by the
// composite (unit_id, level) key, never level alone. Attempts predating the
// unit_id column (or otherwise missing it) can't be attributed to any unit,
// so they're excluded here rather than surfacing as a bogus "Unit NaN".
export function groupByUnitLevel(attempts) {
  const map = {}
  for (const a of attempts) {
    if (a.unit_id == null) continue
    const key = `${a.unit_id}-${a.level}`
    if (!map[key]) map[key] = []
    map[key].push(a)
  }
  return map
}

export function mostRecent(attempts) {
  return attempts.reduce((best, a) => (!best || a.submitted_at > best.submitted_at) ? a : best, null)
}

export function fmtDuration(seconds) {
  if (!seconds && seconds !== 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function fmtWhen(iso) {
  if (!iso) return { day: '—', time: '' }
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

export function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

const PRACTICE_LOGIN_URL = 'https://chemistryarun-hub.github.io/neetcbtpractice/'

// Picks one of several warm, data-driven WhatsApp nudges instead of the same
// generic line for every student — a "smart template" rather than a live AI
// call, since it needs no backend, no API key, and has zero per-message cost
// or latency, while still reading as genuinely personalized (name, streak,
// days since last practice, accuracy, weakest topic — whatever's available).
// Every param except `name` is optional; branches degrade gracefully when a
// caller doesn't have richer data computed (e.g. AdminStudents.jsx's lighter
// per-student view vs. the full StudentProfile.jsx).
export function buildActivityMessage({ name, totalAttempts = 0, streak = 0, lastActiveIso, overallAccuracy = 0, weakestUnitName }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there'
  const daysAgo = daysSince(lastActiveIso)
  const acc = Math.round(overallAccuracy)

  if (!totalAttempts) {
    return `Hi ${first}, your NEET Chemistry practice account is ready, but you haven't started yet. Even 10-15 minutes today builds a great habit — try your first level here: ${PRACTICE_LOGIN_URL}`
  }
  if (streak >= 3) {
    return `Great going ${first}! You're on a ${streak}-day practice streak (${acc}% accuracy). Keep it up today: ${PRACTICE_LOGIN_URL}`
  }
  if (daysAgo != null && daysAgo <= 1) {
    return `Hi ${first}, good to see you practicing regularly. A quick session today keeps the momentum going: ${PRACTICE_LOGIN_URL}`
  }
  if (daysAgo != null && daysAgo <= 4) {
    const weakLine = weakestUnitName ? ` ${weakestUnitName} could use a bit more practice.` : ''
    return `Hi ${first}, it's been ${daysAgo} day${daysAgo === 1 ? '' : 's'} since your last practice.${weakLine} A short session today keeps you on track: ${PRACTICE_LOGIN_URL}`
  }
  if (daysAgo != null && daysAgo <= 10) {
    return `Hi ${first}, it's been over a week since your last practice. Even 15-20 minutes today will help you stay NEET-ready — login here: ${PRACTICE_LOGIN_URL}`
  }
  return `Hi ${first}, it's been a while (${daysAgo ?? 'many'} days) since we last saw you practice. Everything okay? Your progress is saved and ready whenever you're ready to jump back in: ${PRACTICE_LOGIN_URL}`
}
