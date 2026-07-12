import { UNLOCK_THRESHOLDS, MARKS_CORRECT, NEET_CHEMISTRY_SYLLABUS, UNIT_LEVELS } from './constants'

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

// "Cleared" = the first attempt (1-3) whose score crosses that attempt
// number's real unlock threshold (UNLOCK_THRESHOLDS) — i.e. the exact attempt
// where the student actually unlocked the next level in the app. Attempts
// beyond #3 never retroactively count, matching TestPage.jsx (which never
// re-checks the unlock condition after attempt 3 either).
export function clearedInfo(attemptsForLevel) {
  const sorted = [...attemptsForLevel].sort((a, b) => a.attempt_number - b.attempt_number)
  for (const a of sorted) {
    const threshold = UNLOCK_THRESHOLDS.find(t => t.attempt === a.attempt_number)
    if (threshold && scorePct(a) >= threshold.score_pct) {
      return { cleared: true, attemptNumber: a.attempt_number }
    }
  }
  return { cleared: false }
}

// Trend as of a specific attempt (defaults to the latest) — lets a per-attempt
// row show its own trend at that point in time, not just the group's overall one.
export function trendLabel(attemptsForLevel, atAttemptNumber = null) {
  const sorted = [...attemptsForLevel].sort((a, b) => a.attempt_number - b.attempt_number)
  const idx = atAttemptNumber == null ? sorted.length - 1 : sorted.findIndex(a => a.attempt_number === atAttemptNumber)
  if (idx < 1) return 'needs-work'
  const last = scorePct(sorted[idx])
  const prev = scorePct(sorted[idx - 1])
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
