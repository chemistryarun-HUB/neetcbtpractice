// Re-grades submitted attempts against the CURRENT answer key.
//
// The admin UI (/admin/key-changes) is the normal way to do this — it shows impact
// per key change and applies one at a time. This CLI is the bulk/offline escape
// hatch, and shares src/lib/regrade.js with the UI so the two can't grade differently.
//
// Dry-run by default. Pass --apply to write.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { buildRegradePlan, applyRegradePlan, planNetMarks } from '../src/lib/regrade.js'

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
const attempts = await pageAll(() => sb.from('test_attempts')
  .select('id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, question_ids, answers')
  .eq('submitted', true))
const progress = await pageAll(() => sb.from('student_progress').select('student_id, unlocked_levels_by_unit'))
const students = await pageAll(() => sb.from('students').select('id, name, roll_number'))

const questionsById = Object.fromEntries(questions.map(q => [q.id, q]))
const progressByStudent = Object.fromEntries(progress.map(p => [p.student_id, p]))
const nameOf = Object.fromEntries(students.map(s => [s.id, `${s.name} (${s.roll_number})`]))

const plan = buildRegradePlan({ attempts, questionsById, progressByStudent })

console.log(`${attempts.length} submitted attempts scanned — ${plan.attemptPatches.length} need re-grading.\n`)
if (!plan.attemptPatches.length) process.exit(0)

for (const p of plan.attemptPatches) {
  const a = attempts.find(x => x.id === p.id)
  const d = p.patch.score - p.before.score
  console.log(`  ${nameOf[a.student_id] || a.student_id} · Unit ${a.unit_id} L${a.level} #${a.attempt_number}` +
    ` · ${p.before.score} → ${p.patch.score} (${d >= 0 ? '+' : ''}${d})` +
    (p.hadMissingQuestion ? '  [has a question no longer in the bank — its grade preserved]' : ''))
}
console.log(`\nNet marks across all attempts: ${planNetMarks(plan) >= 0 ? '+' : ''}${planNetMarks(plan)}`)

console.log(`\n${plan.unlocksGained.length} level unlock(s) newly earned:`)
for (const u of plan.unlocksGained) {
  console.log(`  ${nameOf[u.student_id] || u.student_id} · Unit ${u.unit_id} L${u.level} cleared → unlock L${u.next}`)
}
if (!plan.unlocksGained.length) console.log('  (none)')

if (plan.unlocksLost.length) {
  console.log(`\n${plan.unlocksLost.length} student(s) now fall below the bar for a level they already hold.`)
  console.log('These are KEPT — the key was wrong through no fault of theirs.')
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply to write these changes.'); process.exit(0) }

console.log('\nApplying…')
const res = await applyRegradePlan(sb, plan, { attempts, note: 'Bulk re-grade against current answer keys' })
console.log(`  ${res.attemptsWritten}/${plan.attemptPatches.length} attempts re-graded.`)
console.log(`  ${res.usedWritten} used_questions rows refreshed.`)
console.log(`  ${res.unlocksWritten} unlock(s) granted.`)
console.log('Done.')
