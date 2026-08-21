// Builds the parent-facing progress report for ONE student in ONE chapter.
//
// Deliberately separate from the PDF drawing code: this file decides WHAT the
// report says, reportPdf.js decides how it looks. That split is what lets the
// wording be checked against real data without rendering anything.
//
// Chapter-scoped rather than whole-syllabus on purpose: it's sent from the
// unit roster while looking at one chapter, and a parent reading about the one
// chapter their child is actually stuck in acts on it — a six-chapter dump
// gets skimmed and closed.
import {
  attemptsInOrder, attemptClearedOwnBar, totalQuestions,
  aggregateAccuracy, mostRecent, daysSince, unitName, scorePct,
} from './performanceMetrics'
import { UNIT_LEVELS, levelBadge, thresholdPctFor, MARKS_CORRECT, MARKS_WRONG, QUESTIONS_PER_ATTEMPT } from './constants'

// Small counts are spelled out, and every sentence below keeps a comma or dash
// between a level badge and any following number. Without that, "Level 3" plus
// "2 times" renders as "Level 3 2 times", which a parent reads as "32" — a
// real misreading reported from the first draft, not a hypothetical one.
const WORDS = ['zero', 'once', 'twice', 'three times', 'four times', 'five times',
  'six times', 'seven times', 'eight times', 'nine times', 'ten times']
export function timesWord(n) {
  return WORDS[n] || `${n} times`
}

// "5 days ago" / "today" / "yesterday" — not just what happened but how long
// ago, which is what turns a number into a nudge.
export function agoLabel(iso) {
  const d = daysSince(iso)
  if (d == null) return ''
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d} days ago`
  const m = Math.floor(d / 30)
  return m === 1 ? 'about a month ago' : `about ${m} months ago`
}

const STATUS_META = {
  complete:    { label: 'Chapter complete', tone: 'good' },
  'on-track':  { label: 'On track',         tone: 'good' },
  stuck:       { label: 'Needs attention',  tone: 'warn' },
  paused:      { label: 'Paused',           tone: 'warn' },
  'not-started': { label: 'Not started',    tone: 'warn' },
}
export function statusMeta(status) { return STATUS_META[status] || STATUS_META['on-track'] }

/**
 * @param activeIdsByLevel { [level]: Set<questionId> } of questions still live
 *        at each level. Supplied by the caller (the roster already loads it),
 *        so coverage is measured against today's pool rather than a stale one.
 */
export function buildUnitReport({
  student, unitId, attempts, classAttempts = [], activeIdsByLevel = null, generatedAt = new Date(),
}) {
  const defs = UNIT_LEVELS[unitId] || []
  const lastLevelId = defs.length > 0 ? defs[defs.length - 1].id : null
  // The CCT is open from day one and draws from the whole chapter, so it isn't
  // a rung on the ladder a student climbs — it gets reported separately.
  const ladderDefs = defs.filter(l => l.id !== lastLevelId)

  const unitAttempts = attempts.filter(a => a.unit_id === unitId)
  const byLevel = {}
  for (const a of unitAttempts) (byLevel[a.level] ||= []).push(a)

  const poolFor = (lvl) => {
    if (!activeIdsByLevel) return null
    if (lvl === lastLevelId) {
      const all = new Set()
      for (const [l, ids] of Object.entries(activeIdsByLevel)) {
        if (Number(l) !== lastLevelId) for (const id of ids) all.add(id)
      }
      return all
    }
    return activeIdsByLevel[lvl] ?? new Set()
  }

  // Coverage counts distinct questions actually served, intersected with the
  // questions still active there — students get served questions that are
  // later deactivated, and a raw count runs past the live total.
  const coverageFor = (lvl) => {
    const pool = poolFor(lvl)
    if (!pool) return { seen: null, total: null }
    const served = new Set((byLevel[lvl] || []).flatMap(a => a.question_ids || []))
    return { seen: [...served].filter(id => pool.has(id)).length, total: pool.size }
  }

  function describe(levelDef) {
    const arr = byLevel[levelDef.id] || []
    const cov = coverageFor(levelDef.id)
    const base = {
      id: levelDef.id,
      badge: levelBadge(unitId, levelDef.id),
      name: levelDef.name,
      tries: arr.length,
      seen: cov.seen,
      total: cov.total,
    }
    if (arr.length === 0) return { ...base, state: 'not-reached' }
    const ordered = attemptsInOrder(arr)
    const hit = ordered.find(({ attempt }) => attemptClearedOwnBar(attempt))
    if (hit) {
      return {
        ...base,
        state: 'cleared',
        onAttempt: hit.position,
        whenIso: hit.attempt.submitted_at,
        ago: agoLabel(hit.attempt.submitted_at),
      }
    }
    return { ...base, state: 'attempted', bestPct: Math.max(...arr.map(scorePct)) }
  }

  const levels = ladderDefs.map(describe)
  const cct = lastLevelId != null ? describe(defs[defs.length - 1]) : null

  const clearedLevels = levels.filter(l => l.state === 'cleared')
  const latestClear = clearedLevels.length
    ? clearedLevels.reduce((best, c) => (c.whenIso > (best?.whenIso || '') ? c : best), null)
    : null
  const nextLevel = levels.find(l => l.state !== 'cleared') || null
  const lastActivity = mostRecent(unitAttempts)?.submitted_at || null
  const idleDays = daysSince(lastActivity)

  let status
  if (unitAttempts.length === 0) status = 'not-started'
  else if (ladderDefs.length > 0 && clearedLevels.length >= ladderDefs.length) status = 'complete'
  else if (nextLevel && nextLevel.state === 'attempted' && nextLevel.tries >= 2) status = 'stuck'
  else if (idleDays != null && idleDays > 14) status = 'paused'
  else status = 'on-track'

  // The single sentence a parent must read even if they read nothing else.
  // Kept short and in plain words — many parents reading this are not fluent
  // in English, and a sentence they have to re-read is a sentence they skip.
  let headline
  switch (status) {
    case 'not-started':
      headline = 'Has not started this unit yet. No test attempted so far.'
      break
    case 'complete':
      headline = `All ${ladderDefs.length} levels cleared. This unit is complete.`
      break
    case 'stuck':
      headline = `${latestClear ? `Cleared ${latestClear.badge}, ${latestClear.ago}. ` : ''}`
        + `${nextLevel.badge} has been attempted ${timesWord(nextLevel.tries)}, but not cleared yet. Best score so far: ${nextLevel.bestPct.toFixed(0)}%.`
      break
    case 'paused':
      headline = `${latestClear ? `Last cleared ${latestClear.badge}, ${latestClear.ago}. ` : 'Started this unit, but no level cleared yet. '}`
        + `There has been no practice in this unit for ${idleDays} days.`
      break
    default:
      headline = latestClear
        ? `Cleared ${latestClear.badge}, ${latestClear.ago}${latestClear.onAttempt > 1 ? ` (on attempt ${latestClear.onAttempt})` : ''}. Now working on ${nextLevel ? nextLevel.badge : 'the next level'}.`
        : `Practice has started. Working towards ${nextLevel ? nextLevel.badge : 'the first level'}.`
  }

  // A short to-do list in plain words. Capped at three — a parent given ten
  // things to do does none of them.
  const actions = []
  if (status === 'not-started') {
    actions.push('Please ask them to open this unit and try Level 1. It is already unlocked and ready.')
    actions.push('Every level has a video lecture by the chemistry faculty in the app. Watching it first makes the test much easier.')
  } else if (status === 'stuck') {
    actions.push(`${nextLevel.badge} (${nextLevel.name}) needs revision. The video lecture for this level is in the app — please ask them to watch it before the next try.`)
    actions.push(`Answer carefully rather than guessing. A wrong answer loses ${Math.abs(MARKS_WRONG)} mark. Leaving a question blank loses nothing.`)
  } else if (status === 'paused') {
    actions.push(`Practice in this unit stopped ${idleDays} days ago. Please encourage them to start again.`)
    if (nextLevel) actions.push(`The next level is ${nextLevel.badge} — ${nextLevel.name}. Its video lecture is in the app.`)
  } else if (status === 'complete') {
    // Lead with the thing to DO. "Well done" alone is a nice sentence but the
    // WhatsApp message quotes only the first action, so praise on its own line
    // would waste the one slot a parent actually reads.
    actions.push('Well done! Please ask them to revise with the Complete Chapter Test — it mixes questions from all the levels of this unit.')
    actions.push('Keeping this unit revised while moving to the next one is what holds the marks at exam time.')
  } else if (nextLevel) {
    actions.push(`The next level is ${nextLevel.badge} — ${nextLevel.name}. Its video lecture is in the app.`)
    actions.push('Daily practice is working well. Please keep it going.')
  }
  if (idleDays != null && idleDays > 7 && status !== 'paused' && status !== 'not-started') {
    actions.unshift(`The last test in this unit was ${agoLabel(lastActivity)}. Please encourage daily practice.`)
  }

  const unitClassAttempts = classAttempts.filter(a => a.unit_id === unitId)

  return {
    student,
    generatedAt,
    // label carries the unit NUMBER as well as the name — a parent tracking
    // progress across the syllabus needs to know which chapter this is, not
    // just what it's called.
    unit: {
      id: unitId,
      name: unitName(unitId),
      label: `Unit ${unitId} — ${unitName(unitId)}`,
      levelCount: ladderDefs.length,
    },
    status,
    headline,
    summary: {
      levelsCleared: clearedLevels.length,
      ladderTotal: ladderDefs.length,
      attempts: unitAttempts.length,
      questionsPractised: unitAttempts.reduce((s, a) => s + totalQuestions(a), 0),
      accuracy: aggregateAccuracy(unitAttempts),
      classAccuracy: unitClassAttempts.length ? aggregateAccuracy(unitClassAttempts) : null,
      lastActive: lastActivity,
      lastActiveLabel: lastActivity ? agoLabel(lastActivity) : 'not yet',
    },
    levels,
    cct,
    actions: actions.slice(0, 3),
    scheme: {
      perTest: QUESTIONS_PER_ATTEMPT,
      correct: MARKS_CORRECT,
      wrong: MARKS_WRONG,
      firstBar: thresholdPctFor(1),
      easedBar: thresholdPctFor(3),
    },
  }
}

/**
 * The WhatsApp message the report link travels in.
 *
 * Written to stand on its own: a parent who never opens the PDF should still
 * come away knowing the one thing that matters this week. Tone stays factual
 * without being alarming — a parent who feels accused stops reading.
 */
export function buildUnitReportMessage(model, url) {
  const first = (model.student.name || '').trim().split(/\s+/)[0] || 'your child'
  const s = model.summary
  const date = model.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const lines = [
    `Namaste! This is ${first}'s progress report for *${model.unit.label}* (NEET Chemistry), as on ${date}.`,
    '',
    model.headline,
    '',
  ]

  if (s.attempts > 0) {
    lines.push(`• Levels cleared: ${s.levelsCleared} of ${s.ladderTotal}`)
    lines.push(`• Practice done: ${s.attempts} test${s.attempts !== 1 ? 's' : ''}, ${s.questionsPractised} questions`)
    lines.push(`• Accuracy: ${s.accuracy.toFixed(0)}%`)
    lines.push(`• Last practised: ${s.lastActiveLabel}`)
    lines.push('')
  }
  lines.push(`This unit has ${model.unit.levelCount} levels. Each level has its own video lecture by our chemistry faculty in the app.`, '')
  if (model.actions.length) {
    lines.push(`What will help now: ${model.actions[0]}`, '')
  }

  lines.push(`Full report: ${url}`, '', 'Please go through it with them. Happy to discuss anytime.')
  return lines.join('\n')
}
