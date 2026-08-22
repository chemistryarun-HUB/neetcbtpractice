// Builds the parent-facing progress report for ONE student in ONE chapter.
//
// This file produces FACTS ONLY — numbers, states, day-counts. Every sentence
// a parent reads is assembled in reportI18n.js. That split is what makes the
// English, Hindi and Gujarati versions genuinely the same report rather than
// three drifting copies, and it means a wording fix lands in all three at once.
import {
  attemptsInOrder, attemptClearedOwnBar, totalQuestions,
  aggregateAccuracy, mostRecent, daysSince, unitName, scorePct,
} from './performanceMetrics'
import { UNIT_LEVELS, levelBadge, thresholdPctFor, MARKS_CORRECT, MARKS_WRONG, QUESTIONS_PER_ATTEMPT } from './constants'

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
  // The Complete Chapter Test is open from day one and draws from the whole
  // chapter, so it isn't a rung on the ladder — reported separately, and
  // deliberately without any "cleared" verdict, because there is no gate to
  // clear on a test that was never locked.
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
        days: daysSince(hit.attempt.submitted_at),
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

  const unitClassAttempts = classAttempts.filter(a => a.unit_id === unitId)

  return {
    student,
    generatedAt,
    unit: {
      id: unitId,
      name: unitName(unitId),
      label: `Unit ${unitId} — ${unitName(unitId)}`,
      levelCount: ladderDefs.length,
    },
    status,
    // Everything the sentences are built from, kept as data so each language
    // can phrase it in its own grammar rather than translating word by word.
    facts: { latestClear, nextLevel, idleDays },
    summary: {
      levelsCleared: clearedLevels.length,
      ladderTotal: ladderDefs.length,
      attempts: unitAttempts.length,
      questionsPractised: unitAttempts.reduce((s, a) => s + totalQuestions(a), 0),
      accuracy: aggregateAccuracy(unitAttempts),
      classAccuracy: unitClassAttempts.length ? aggregateAccuracy(unitClassAttempts) : null,
      lastActiveDays: idleDays,
    },
    levels,
    cct,
    scheme: {
      perTest: QUESTIONS_PER_ATTEMPT,
      correct: MARKS_CORRECT,
      wrong: MARKS_WRONG,
      firstBar: thresholdPctFor(1),
      easedBar: thresholdPctFor(3),
      clearWithinDays: 2,
    },
  }
}
