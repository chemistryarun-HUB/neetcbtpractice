// Re-grades practice_paper_attempts against the paper's CURRENT answer_key.
//
// Practice Papers has no live-join scoring and no regrade mechanism — a
// student's score/correct_count/wrong_count/subject_breakdown are computed
// ONCE at submission time (scorePaper in src/lib/practicePapers.js) and
// stored statically. If the admin fixes a wrong answer_key after students
// have submitted, their stored marks silently keep reflecting the old key
// forever, with nothing in the UI ever re-touching them. The raw per-question
// `responses` ARE stored per attempt, so a regrade just needs to re-run
// scorePaper(paper, responses) and overwrite the stored score fields.
//
// Usage:
//   node scripts/regrade-practice-paper.mjs <paper name>            (dry run)
//   node scripts/regrade-practice-paper.mjs <paper name> --apply
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { scorePaper } from '../src/lib/practicePapers.js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const paperName = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!paperName) {
  console.error('Usage: node scripts/regrade-practice-paper.mjs <paper name> [--apply]')
  process.exit(1)
}

const { data: paper, error: perr } = await sb.from('practice_papers').select('*').eq('name', paperName).single()
if (perr) throw new Error(perr.message)
console.log(`Paper: ${paper.name} (${paper.id}) — key has ${Object.keys(paper.answer_key || {}).length} questions`)

const { data: attempts, error: aerr } = await sb.from('practice_paper_attempts')
  .select('id, student_id, responses, score, correct_count, wrong_count, skipped_count, subject_breakdown, students(name, roll_number)')
  .eq('paper_id', paper.id)
if (aerr) throw new Error(aerr.message)
console.log(`${attempts.length} submission(s) found.\n`)

const changed = []
for (const a of attempts) {
  const recomputed = scorePaper(paper, a.responses || {})
  const same = recomputed.score === a.score &&
    recomputed.correct === a.correct_count &&
    recomputed.wrong === a.wrong_count &&
    recomputed.skipped === a.skipped_count
  const studentLabel = a.students ? `${a.students.name} (${a.students.roll_number})` : a.student_id
  if (!same) {
    changed.push({ id: a.id, recomputed })
    console.log(`CHANGED  ${studentLabel}`)
    console.log(`  stored:     score=${a.score} correct=${a.correct_count} wrong=${a.wrong_count} skipped=${a.skipped_count}`)
    console.log(`  recomputed: score=${recomputed.score} correct=${recomputed.correct} wrong=${recomputed.wrong} skipped=${recomputed.skipped}`)
  } else {
    console.log(`unchanged ${studentLabel} (score=${a.score})`)
  }
}

console.log(`\n${changed.length} of ${attempts.length} attempt(s) need re-grading.`)
if (!changed.length) process.exit(0)

if (!APPLY) { console.log('\nDry run. Re-run with --apply to write these changes.'); process.exit(0) }

console.log('\nApplying…')
for (const c of changed) {
  const { error } = await sb.from('practice_paper_attempts').update({
    score: c.recomputed.score,
    correct_count: c.recomputed.correct,
    wrong_count: c.recomputed.wrong,
    skipped_count: c.recomputed.skipped,
    subject_breakdown: c.recomputed.subject_breakdown,
  }).eq('id', c.id)
  if (error) throw new Error(error.message)
}
console.log(`${changed.length} attempt(s) re-graded.`)
