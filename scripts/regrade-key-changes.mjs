// Re-grades submitted attempts against the CURRENT answer key, for questions whose
// correct_option was corrected after students had already answered them.
//
// Dry-run by default — prints every change it would make. Pass --apply to write.
//
// Deliberate policy: level unlocks are only ever ADDED, never revoked. A student
// who now falls below the bar keeps access they were already granted; taking a
// level away mid-course punishes them for someone else's key error.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { correctOptionKey, optionEntries } from '../src/lib/questionOptions.js'
import { MARKS_CORRECT, MARKS_WRONG, thresholdPctFor, nextLevelIdFor } from '../src/lib/constants.js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const APPLY = process.argv.includes('--apply')

async function pageAll(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const questions = await pageAll(() => sb.from('questions')
  .select('id, qid, option1, option2, option3, option4, correct_option'))
const qById = Object.fromEntries(questions.map(q => [q.id, q]))

const attempts = await pageAll(() => sb.from('test_attempts')
  .select('id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, question_ids, answers')
  .eq('submitted', true))

const students = await pageAll(() => sb.from('students').select('id, name, roll_number'))
const nameOf = Object.fromEntries(students.map(s => [s.id, `${s.name} (${s.roll_number})`]))

function liveStatus(q, selected) {
  if (!selected) return 'skipped'
  const key = correctOptionKey(q)
  const entry = optionEntries(q).find(e => e.key === key)
  return (selected === key || (entry?.text && selected === entry.text)) ? 'correct' : 'wrong'
}

// ── 1. Recompute every attempt, keep the ones that actually changed ──────────
const changed = []
for (const a of attempts) {
  const ans = a.answers || {}
  if (ans.responses === undefined) continue      // legacy format — always derived live, nothing frozen to fix
  const responses = ans.responses || {}
  const qids = a.question_ids || []
  if (!qids.length) continue

  const oldCorrect = new Set(ans.correct_ids || [])
  const oldWrong = new Set(ans.wrong_ids || [])
  if (!oldCorrect.size && !oldWrong.size) continue

  const correct = [], wrong = [], skipped = []
  let unknown = false
  for (const qid of qids) {
    const q = qById[qid]
    if (!q) {
      // Question no longer in the bank — preserve whatever it was graded as
      // rather than silently reclassifying it as skipped.
      unknown = true
      if (oldCorrect.has(qid)) correct.push(qid)
      else if (oldWrong.has(qid)) wrong.push(qid)
      else skipped.push(qid)
      continue
    }
    const st = liveStatus(q, responses[qid])
    if (st === 'correct') correct.push(qid)
    else if (st === 'wrong') wrong.push(qid)
    else skipped.push(qid)
  }

  const score = correct.length * MARKS_CORRECT + wrong.length * MARKS_WRONG
  if (score === a.score && correct.length === a.correct_count && wrong.length === a.wrong_count) continue

  changed.push({
    attempt: a, unknown,
    next: {
      answers: { ...ans, correct_ids: correct, wrong_ids: wrong, skipped_ids: skipped },
      score, correct_count: correct.length, wrong_count: wrong.length, skipped_count: skipped.length,
    },
  })
}

console.log(`${attempts.length} submitted attempts scanned — ${changed.length} need re-grading.\n`)
if (!changed.length) process.exit(0)

for (const c of changed) {
  const a = c.attempt
  const d = c.next.score - a.score
  console.log(`  ${nameOf[a.student_id] || a.student_id} · Unit ${a.unit_id} L${a.level} #${a.attempt_number}` +
    ` · ${a.score} → ${c.next.score} (${d >= 0 ? '+' : ''}${d})` +
    ` · ${a.correct_count}✓/${a.wrong_count}✗ → ${c.next.correct_count}✓/${c.next.wrong_count}✗` +
    (c.unknown ? '  [contains a question no longer in the bank — its grade preserved]' : ''))
}

// ── 2. Work out which unlocks the new scores earn ────────────────────────────
// A level counts as cleared if ANY of its attempts crosses that attempt-number's
// bar, using post-regrade scores. Mirrors the rule the app applies at submit time.
const byGroup = {}
for (const a of attempts) {
  if (a.unit_id == null) continue                 // legacy rows with no unit can't map to a level chain
  const patched = changed.find(c => c.attempt.id === a.id)?.next
  const key = `${a.student_id}|${a.unit_id}|${a.level}`
  ;(byGroup[key] ||= []).push({
    attempt_number: a.attempt_number,
    score: patched ? patched.score : a.score,
    total: patched
      ? patched.correct_count + patched.wrong_count + patched.skipped_count
      : (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0),
  })
}

const touchedStudents = [...new Set(changed.map(c => c.attempt.student_id))]
const progress = await pageAll(() => sb.from('student_progress')
  .select('student_id, unlocked_levels_by_unit').in('student_id', touchedStudents))
const progOf = Object.fromEntries(progress.map(p => [p.student_id, p]))

const unlockAdds = []
for (const [key, list] of Object.entries(byGroup)) {
  const [student_id, unitStr, levelStr] = key.split('|')
  if (!touchedStudents.includes(student_id)) continue
  const unit_id = Number(unitStr), level = Number(levelStr)
  const next = nextLevelIdFor(unit_id, level)
  if (next == null) continue
  const cleared = list.some(x => {
    const max = x.total * MARKS_CORRECT
    const pct = max > 0 ? (x.score / max) * 100 : 0
    const bar = thresholdPctFor(x.attempt_number)
    return bar != null && pct >= bar
  })
  if (!cleared) continue
  const byUnit = progOf[student_id]?.unlocked_levels_by_unit || {}
  if ((byUnit[unit_id] || [1]).includes(next)) continue
  unlockAdds.push({ student_id, unit_id, level, next })
}

console.log(`\n${unlockAdds.length} level unlock(s) newly earned:`)
for (const u of unlockAdds) {
  console.log(`  ${nameOf[u.student_id] || u.student_id} · Unit ${u.unit_id} L${u.level} cleared → unlock L${u.next}`)
}
if (!unlockAdds.length) console.log('  (none)')
console.log('\nNo unlock is ever revoked, even where a score dropped.')

if (!APPLY) { console.log('\nDry run. Re-run with --apply to write these changes.'); process.exit(0) }

// ── 3. Write ─────────────────────────────────────────────────────────────────
console.log('\nApplying…')
let ok = 0
for (const c of changed) {
  const { error } = await sb.from('test_attempts').update(c.next).eq('id', c.attempt.id)
  if (error) console.error(`  FAILED attempt ${c.attempt.id}: ${error.message}`)
  else ok++
}
console.log(`  ${ok}/${changed.length} attempts re-graded.`)

// used_questions holds only the most recent status per (student, question), and it
// drives test question selection (fresh → wrong → skipped → correct). Refresh it
// from each student's latest re-graded attempt so a now-correct answer stops being
// re-served as if the student had got it wrong.
const latestStatus = {}   // `${student}|${question}` -> { attempt_number, status }
for (const c of changed) {
  const a = c.attempt
  for (const [status, ids] of [['correct', c.next.answers.correct_ids], ['wrong', c.next.answers.wrong_ids], ['skipped', c.next.answers.skipped_ids]]) {
    for (const qid of ids) {
      const k = `${a.student_id}|${qid}`
      if (!latestStatus[k] || latestStatus[k].attempt_number < a.attempt_number) {
        latestStatus[k] = { attempt_number: a.attempt_number, status, student_id: a.student_id, question_id: qid }
      }
    }
  }
}
let uq = 0
for (const v of Object.values(latestStatus)) {
  const { error } = await sb.from('used_questions')
    .update({ status: v.status }).eq('student_id', v.student_id).eq('question_id', v.question_id)
  if (!error) uq++
}
console.log(`  ${uq} used_questions rows refreshed.`)

for (const u of unlockAdds) {
  const byUnit = progOf[u.student_id]?.unlocked_levels_by_unit || {}
  const cur = byUnit[u.unit_id] || [1]
  const updated = { ...byUnit, [u.unit_id]: [...new Set([...cur, u.next])].sort((a, b) => a - b) }
  const { error } = await sb.from('student_progress')
    .update({ unlocked_levels_by_unit: updated }).eq('student_id', u.student_id)
  if (error) console.error(`  FAILED unlock for ${nameOf[u.student_id]}: ${error.message}`)
  else { progOf[u.student_id].unlocked_levels_by_unit = updated; console.log(`  unlocked Unit ${u.unit_id} L${u.next} for ${nameOf[u.student_id]}`) }
}
console.log('Done.')
