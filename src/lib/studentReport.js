// Builds the parent-facing progress report for one student.
//
// Deliberately separate from the PDF drawing code: this file decides WHAT the
// report says, reportPdf.js decides how it looks. That split is what lets the
// wording be checked against real data without rendering anything.
import {
  attemptsInOrder, attemptClearedOwnBar, totalQuestions,
  aggregateAccuracy, computeStreak, mostRecent, daysSince, unitName, scorePct,
} from './performanceMetrics'
import { UNIT_LEVELS, levelBadge, thresholdPctFor, MARKS_CORRECT, MARKS_WRONG, QUESTIONS_PER_ATTEMPT } from './constants'


// "5 days ago" / "today" / "yesterday" — the phrasing the request asked for,
// and the thing a parent actually reads a report for: not just what happened
// but how long ago, which is what turns a number into a nudge.
export function agoLabel(iso) {
  const d = daysSince(iso)
  if (d == null) return ''
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d} days ago`
  const m = Math.floor(d / 30)
  return m === 1 ? 'about a month ago' : `about ${m} months ago`
}

/**
 * Per-unit story for this student.
 *
 * Each unit resolves to exactly one status so the report can lead with the
 * headline rather than making a parent infer it from a table:
 *   complete    — every sequential level cleared
 *   on-track    — cleared something recently, still moving
 *   stuck       — has attempted the next level repeatedly without clearing it
 *   stalled     — started, but nothing cleared for a long while
 *   not-started — never opened
 */
export function buildUnitStories(attempts) {
  const byUnit = {}
  for (const a of attempts) {
    if (a.unit_id == null) continue
    ;(byUnit[a.unit_id] ||= []).push(a)
  }

  return Object.entries(byUnit).map(([uid, unitAttempts]) => {
    const unitId = Number(uid)
    const defs = UNIT_LEVELS[unitId] || []
    const lastLevelId = defs.length > 0 ? defs[defs.length - 1].id : null
    // The CCT is open from day one and draws from the whole chapter, so it
    // isn't part of the sequential ladder a student climbs.
    const ladderIds = defs.filter(l => l.id !== lastLevelId).map(l => l.id)

    const byLevel = {}
    for (const a of unitAttempts) (byLevel[a.level] ||= []).push(a)

    const cleared = []       // { level, onAttempt, whenIso }
    const attemptedNotCleared = []
    for (const [lvl, arr] of Object.entries(byLevel)) {
      const level = Number(lvl)
      const ordered = attemptsInOrder(arr)
      const hit = ordered.find(({ attempt }) => attemptClearedOwnBar(attempt))
      if (hit) cleared.push({ level, onAttempt: hit.position, whenIso: hit.attempt.submitted_at, tries: ordered.length })
      else attemptedNotCleared.push({ level, tries: ordered.length, bestPct: Math.max(...arr.map(scorePct)) })
    }

    const ladderCleared = cleared.filter(c => c.level !== lastLevelId).sort((a, b) => a.level - b.level)
    const latestClear = ladderCleared.length
      ? ladderCleared.reduce((best, c) => (c.whenIso > (best?.whenIso || '') ? c : best), null)
      : null
    const cctCleared = lastLevelId != null && cleared.some(c => c.level === lastLevelId)

    // The next rung: lowest ladder level they haven't cleared.
    const clearedSet = new Set(ladderCleared.map(c => c.level))
    const nextLevel = ladderIds.find(id => !clearedSet.has(id)) ?? null
    const stuckOn = nextLevel != null ? attemptedNotCleared.find(x => x.level === nextLevel) : null

    const lastActivity = mostRecent(unitAttempts)?.submitted_at || null
    const idleDays = daysSince(lastActivity)

    let status
    if (ladderIds.length > 0 && ladderCleared.length >= ladderIds.length) status = 'complete'
    else if (stuckOn && stuckOn.tries >= 2) status = 'stuck'
    else if (idleDays != null && idleDays > 14) status = 'stalled'
    else status = 'on-track'

    return {
      unitId,
      name: unitName(unitId),
      status,
      ladderTotal: ladderIds.length,
      clearedCount: ladderCleared.length,
      latestClear,
      nextLevel,
      nextLevelBadge: nextLevel != null ? levelBadge(unitId, nextLevel) : null,
      stuckOn,
      cctCleared,
      attempts: unitAttempts.length,
      questionsDone: unitAttempts.reduce((s, a) => s + totalQuestions(a), 0),
      accuracy: aggregateAccuracy(unitAttempts),
      lastActivity,
      idleDays,
    }
  }).sort((a, b) => a.unitId - b.unitId)
}

// Plain-English line a parent reads without needing to know the app.
export function unitHeadline(u) {
  switch (u.status) {
    case 'complete':
      return `All ${u.ladderTotal} levels cleared. Chapter complete.`
    case 'stuck': {
      const last = u.latestClear
        ? `Cleared ${levelBadge(u.unitId, u.latestClear.level)} ${agoLabel(u.latestClear.whenIso)}. `
        : ''
      // No "Needs attention" tacked on here — the PDF already shows that as a
      // status pill and the WhatsApp message prefixes it, so repeating it read
      // as scolding rather than informing.
      return `${last}Has tried ${u.nextLevelBadge} ${u.stuckOn.tries} times without clearing it — best score so far ${u.stuckOn.bestPct.toFixed(0)}%.`
    }
    case 'stalled': {
      const last = u.latestClear
        ? `Last cleared ${levelBadge(u.unitId, u.latestClear.level)} ${agoLabel(u.latestClear.whenIso)}. `
        : 'Started but hasn\'t cleared a level yet. '
      return `${last}No practice here for ${u.idleDays} days.`
    }
    default: {
      if (u.latestClear) {
        return `Cleared ${levelBadge(u.unitId, u.latestClear.level)} ${agoLabel(u.latestClear.whenIso)}${u.latestClear.onAttempt > 1 ? ` (on attempt ${u.latestClear.onAttempt})` : ''}. Now working on ${u.nextLevelBadge}.`
      }
      return `Started practising. Working towards ${u.nextLevelBadge}.`
    }
  }
}

const STATUS_META = {
  complete:  { label: 'Complete',        tone: 'good' },
  'on-track':{ label: 'On track',        tone: 'good' },
  stuck:     { label: 'Needs attention', tone: 'warn' },
  stalled:   { label: 'Paused',          tone: 'warn' },
}
export function statusMeta(status) { return STATUS_META[status] || STATUS_META['on-track'] }

/**
 * The whole report model for one student.
 *
 * classAttempts is every attempt by that student's classmates and is used only
 * for the class-average benchmark — a neutral "where does this sit" line.
 * Deliberately an average and not a rank: a rank tells a parent their child is
 * 47th, which shames without informing; an average tells them whether the
 * child is above or below typical, which is what they can act on.
 */
/**
 * The WhatsApp message the report link travels in.
 *
 * Written to stand on its own: a parent who never opens the PDF should still
 * come away knowing the one thing that matters most this week. The headline is
 * chosen from the report itself rather than being generic, and the tone stays
 * factual without being alarming — a parent who feels accused stops reading.
 */
export function buildReportMessage(model, url) {
  const first = (model.student.name || '').trim().split(/\s+/)[0] || 'your child'
  const s = model.summary
  const date = model.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const lines = [`Namaste! ${first}'s NEET Chemistry progress report (${date}) is ready.`, '']

  if (s.totalAttempts === 0) {
    lines.push(`${first} hasn't attempted any practice test yet. The full report explains how the levels work and how to get started.`)
  } else {
    lines.push(`• ${s.totalLevelsCleared} of ${s.totalLevelsAvailable} levels cleared across ${s.unitsStarted} chapter${s.unitsStarted !== 1 ? 's' : ''}`)
    lines.push(`• ${s.questionsPractised} questions practised · ${s.accuracy.toFixed(0)}% accuracy`)
    lines.push(`• Last practised ${s.lastActiveLabel}`)
    const focus = model.needsWork[0]
    if (focus) {
      lines.push('', `Needs attention: ${focus.name} — ${unitHeadline(focus)}`)
    }
  }

  lines.push('', `Full report: ${url}`, '', 'Do go through it with them — happy to discuss anytime.')
  return lines.join('\n')
}

export function buildStudentReport({ student, attempts, classAttempts = [], generatedAt = new Date() }) {
  const units = buildUnitStories(attempts)
  const totalQ = attempts.reduce((s, a) => s + totalQuestions(a), 0)
  const accuracy = aggregateAccuracy(attempts)
  const classAccuracy = classAttempts.length ? aggregateAccuracy(classAttempts) : null
  const lastActive = mostRecent(attempts)?.submitted_at || null

  const totalLevelsCleared = units.reduce((s, u) => s + u.clearedCount, 0)
  const totalLevelsAvailable = units.reduce((s, u) => s + u.ladderTotal, 0)

  const strengths = [...units].filter(u => u.attempts >= 2).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3)
  const needsWork = [...units].filter(u => u.status === 'stuck' || u.status === 'stalled')
    .sort((a, b) => a.accuracy - b.accuracy)

  // Concrete next steps, in priority order, capped so the parent gets a short
  // to-do list rather than a wall of advice they'll skip.
  const actions = []
  for (const u of needsWork.slice(0, 2)) {
    if (u.status === 'stuck') {
      actions.push(`Revise ${u.name} — ${u.nextLevelBadge} has been attempted ${u.stuckOn.tries} times without clearing. Watch the lecture for that level before the next try.`)
    } else {
      actions.push(`Return to ${u.name} — no practice there for ${u.idleDays} days.`)
    }
  }
  const idle = daysSince(lastActive)
  if (idle != null && idle > 7) {
    actions.unshift(`Get back to daily practice — the last test was ${agoLabel(lastActive)}.`)
  }
  if (actions.length === 0) {
    actions.push('Keep the current routine going — progress is steady across every chapter started.')
  }

  return {
    student,
    generatedAt,
    summary: {
      totalAttempts: attempts.length,
      questionsPractised: totalQ,
      accuracy,
      classAccuracy,
      streak: computeStreak(attempts),
      lastActive,
      lastActiveLabel: lastActive ? agoLabel(lastActive) : 'never',
      totalLevelsCleared,
      totalLevelsAvailable,
      unitsStarted: units.length,
    },
    units,
    strengths,
    needsWork,
    actions,
    scheme: {
      perTest: QUESTIONS_PER_ATTEMPT,
      correct: MARKS_CORRECT,
      wrong: MARKS_WRONG,
      firstBar: thresholdPctFor(1),
      easedBar: thresholdPctFor(3),
    },
  }
}
