// Re-grading submitted attempts against the current answer key.
//
// Shared by the admin Key Changes page and scripts/regrade-key-changes.mjs so the
// two can't drift — a CLI that grades differently from the UI is worse than no CLI.
//
// Background: test_attempts.answers freezes {correct_ids, wrong_ids, skipped_ids}
// at submit time. That's deliberate — the score and any level unlock it triggered
// were based on it. But correcting a question's correct_option afterwards leaves
// the frozen grade disagreeing with the live key, and someone has to decide what
// the record should say. This module computes that decision; it never guesses.

// Explicit .js extensions (unlike the rest of src/lib) because scripts/ imports
// this module directly under plain Node, which won't resolve extensionless paths.
// Don't "tidy" these away — it breaks the CLI while leaving the app fine.
import { MARKS_CORRECT, MARKS_WRONG, thresholdPctFor, nextLevelIdFor } from './constants.js'
import { correctOptionKey, optionEntries } from './questionOptions.js'

/** How `selected` scores against `question`'s CURRENT key. */
export function liveStatusOf(question, selected) {
  if (!selected) return 'skipped'
  const key = correctOptionKey(question)
  const entry = optionEntries(question).find(e => e.key === key)
  return (selected === key || (entry?.text && selected === entry.text)) ? 'correct' : 'wrong'
}

export function scorePct(score, totalQuestions) {
  const max = totalQuestions * MARKS_CORRECT
  return max > 0 ? (score / max) * 100 : 0
}

/**
 * Recomputes one attempt. Returns null when nothing changes, so callers can
 * treat a null as "leave this row alone" rather than writing an identical patch.
 *
 * A question that's since been deleted from the bank keeps whatever it was
 * graded as — reclassifying it as skipped would quietly rewrite a score for a
 * reason that has nothing to do with the answer key.
 */
export function recomputeAttempt(attempt, questionsById) {
  const stored = attempt.answers || {}
  if (stored.responses === undefined) return null      // legacy format: always derived live, nothing frozen
  const responses = stored.responses || {}
  const qids = attempt.question_ids || []
  if (!qids.length) return null

  const oldCorrect = new Set(stored.correct_ids || [])
  const oldWrong = new Set(stored.wrong_ids || [])
  if (!oldCorrect.size && !oldWrong.size) return null

  const correct = [], wrong = [], skipped = []
  let hadMissingQuestion = false
  for (const qid of qids) {
    const q = questionsById[qid]
    if (!q) {
      hadMissingQuestion = true
      if (oldCorrect.has(qid)) correct.push(qid)
      else if (oldWrong.has(qid)) wrong.push(qid)
      else skipped.push(qid)
      continue
    }
    const status = liveStatusOf(q, responses[qid])
    if (status === 'correct') correct.push(qid)
    else if (status === 'wrong') wrong.push(qid)
    else skipped.push(qid)
  }

  const score = correct.length * MARKS_CORRECT + wrong.length * MARKS_WRONG
  if (score === attempt.score && correct.length === attempt.correct_count && wrong.length === attempt.wrong_count) {
    return null
  }

  return {
    id: attempt.id,
    before: { score: attempt.score, correct_count: attempt.correct_count, wrong_count: attempt.wrong_count },
    hadMissingQuestion,
    patch: {
      answers: { ...stored, correct_ids: correct, wrong_ids: wrong, skipped_ids: skipped },
      score,
      correct_count: correct.length,
      wrong_count: wrong.length,
      skipped_count: skipped.length,
    },
  }
}

/**
 * Builds the full plan: which attempts change, and which level unlocks the new
 * scores earn.
 *
 * Unlocks are only ever ADDED. A student whose score drops keeps the level they
 * already had — the key was wrong through no fault of theirs, and pulling access
 * back mid-course is a worse outcome than a slightly generous one. Callers get
 * `unlocksLost` purely so the UI can be honest that this is a choice, not an
 * oversight; nothing acts on it.
 */
export function buildRegradePlan({ attempts, questionsById, progressByStudent, onlyQuestionIds = null }) {
  const scope = onlyQuestionIds ? new Set(onlyQuestionIds) : null

  const attemptPatches = []
  for (const a of attempts) {
    if (scope && !(a.question_ids || []).some(id => scope.has(id))) continue
    const result = recomputeAttempt(a, questionsById)
    if (result) attemptPatches.push(result)
  }

  const patchById = Object.fromEntries(attemptPatches.map(p => [p.id, p.patch]))
  const touched = new Set(attemptPatches.map(p => attempts.find(a => a.id === p.id)?.student_id).filter(Boolean))

  // Cleared-ness is judged per (student, unit, level) across ALL that group's
  // attempts under post-regrade scores — the same rule the app applies live.
  const groups = {}
  for (const a of attempts) {
    if (a.unit_id == null) continue                    // legacy rows with no unit have no level chain
    if (!touched.has(a.student_id)) continue
    const patch = patchById[a.id]
    const key = `${a.student_id}|${a.unit_id}|${a.level}`
    ;(groups[key] ||= []).push({
      attempt_number: a.attempt_number,
      score: patch ? patch.score : a.score,
      total: patch
        ? patch.correct_count + patch.wrong_count + patch.skipped_count
        : (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0),
    })
  }

  const unlocksGained = [], unlocksLost = []
  for (const [key, list] of Object.entries(groups)) {
    const [student_id, unitStr, levelStr] = key.split('|')
    const unit_id = Number(unitStr), level = Number(levelStr)
    const next = nextLevelIdFor(unit_id, level)
    if (next == null) continue
    const cleared = list.some(x => {
      const bar = thresholdPctFor(x.attempt_number)
      return bar != null && scorePct(x.score, x.total) >= bar
    })
    const holds = (progressByStudent[student_id]?.unlocked_levels_by_unit?.[unit_id] || [1]).includes(next)
    if (cleared && !holds) unlocksGained.push({ student_id, unit_id, level, next })
    if (!cleared && holds) unlocksLost.push({ student_id, unit_id, level, next })
  }

  return { attemptPatches, unlocksGained, unlocksLost }
}

/** Net marks across the plan — the headline number for an impact preview. */
export function planNetMarks(plan) {
  return plan.attemptPatches.reduce((sum, p) => sum + (p.patch.score - p.before.score), 0)
}

/**
 * Writes a plan. Also refreshes used_questions, which holds only the most recent
 * status per (student, question) and drives test question selection
 * (fresh → wrong → skipped → correct) — without this an answer that is now
 * correct keeps being re-served from the "wrong" tier.
 */
export async function applyRegradePlan(supabase, plan, { attempts, note = null }) {
  const attemptById = Object.fromEntries(attempts.map(a => [a.id, a]))
  const stamp = new Date().toISOString()
  let attemptsWritten = 0

  for (const p of plan.attemptPatches) {
    const { error } = await supabase.from('test_attempts')
      .update({ ...p.patch, regraded_at: stamp, regrade_note: note })
      .eq('id', p.id)
    if (!error) attemptsWritten++
  }

  // Latest attempt wins, mirroring how used_questions is written at submit time.
  const latest = {}
  for (const p of plan.attemptPatches) {
    const a = attemptById[p.id]
    if (!a) continue
    for (const [status, ids] of [
      ['correct', p.patch.answers.correct_ids],
      ['wrong', p.patch.answers.wrong_ids],
      ['skipped', p.patch.answers.skipped_ids],
    ]) {
      for (const qid of ids) {
        const k = `${a.student_id}|${qid}`
        if (!latest[k] || latest[k].attempt_number < a.attempt_number) {
          latest[k] = { attempt_number: a.attempt_number, status, student_id: a.student_id, question_id: qid }
        }
      }
    }
  }
  let usedWritten = 0
  for (const v of Object.values(latest)) {
    const { error } = await supabase.from('used_questions')
      .update({ status: v.status }).eq('student_id', v.student_id).eq('question_id', v.question_id)
    if (!error) usedWritten++
  }

  let unlocksWritten = 0
  for (const u of plan.unlocksGained) {
    const { data: prog } = await supabase.from('student_progress')
      .select('unlocked_levels_by_unit').eq('student_id', u.student_id).single()
    const byUnit = prog?.unlocked_levels_by_unit || {}
    const current = byUnit[u.unit_id] || [1]
    if (current.includes(u.next)) continue
    const updated = { ...byUnit, [u.unit_id]: [...new Set([...current, u.next])].sort((a, b) => a - b) }
    const { error } = await supabase.from('student_progress')
      .update({ unlocked_levels_by_unit: updated }).eq('student_id', u.student_id)
    if (!error) unlocksWritten++
  }

  return { attemptsWritten, usedWritten, unlocksWritten }
}
