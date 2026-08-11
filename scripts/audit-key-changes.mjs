// Reports attempts whose stored grade disagrees with the current answer key —
// i.e. questions whose correct_option was corrected after students had answered.
// Read-only; it never writes.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { correctOptionKey, optionEntries } from '../src/lib/questionOptions.js'
import { MARKS_CORRECT, MARKS_WRONG } from '../src/lib/constants.js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

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
  .select('id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, answers')
  .eq('submitted', true))

function liveStatus(q, selected) {
  if (!selected) return 'skipped'
  const key = correctOptionKey(q)
  const entry = optionEntries(q).find(e => e.key === key)
  return (selected === key || (entry?.text && selected === entry.text)) ? 'correct' : 'wrong'
}

const perQuestion = {}   // qid -> { wrongToCorrect, correctToWrong }
const affected = []      // one entry per attempt with >=1 mismatch

for (const a of attempts) {
  const ans = a.answers || {}
  if (ans.responses === undefined) continue          // legacy format, derived live anyway
  const correctIds = new Set(ans.correct_ids || [])
  const wrongIds = new Set(ans.wrong_ids || [])
  if (!correctIds.size && !wrongIds.size) continue

  let gained = 0, lost = 0, n = 0
  for (const [qidKey, selected] of Object.entries(ans.responses || {})) {
    const q = qById[qidKey]
    if (!q) continue
    const graded = correctIds.has(qidKey) ? 'correct' : wrongIds.has(qidKey) ? 'wrong' : 'skipped'
    if (graded === 'skipped') continue
    const now = liveStatus(q, selected)
    if (now === 'skipped' || now === graded) continue
    n++
    const rec = (perQuestion[q.qid] ||= { wrongToCorrect: 0, correctToWrong: 0 })
    if (graded === 'wrong' && now === 'correct') { rec.wrongToCorrect++; gained += MARKS_CORRECT - MARKS_WRONG }
    else { rec.correctToWrong++; lost += MARKS_CORRECT - MARKS_WRONG }
  }
  if (n) affected.push({ ...a, mismatches: n, gained, lost })
}

console.log(`Scanned ${attempts.length} submitted attempts against ${questions.length} questions.\n`)

if (!affected.length) { console.log('No attempt disagrees with the current answer key.'); process.exit(0) }

console.log('Questions whose key changed after students answered:')
for (const [qid, r] of Object.entries(perQuestion).sort((a, b) =>
  (b[1].wrongToCorrect + b[1].correctToWrong) - (a[1].wrongToCorrect + a[1].correctToWrong))) {
  console.log(`  ${qid}: ${r.wrongToCorrect} graded wrong are now correct, ${r.correctToWrong} graded correct are now wrong`)
}

const ids = [...new Set(affected.map(a => a.student_id))]
const students = await pageAll(() => sb.from('students').select('id, name, roll_number').in('id', ids))
const nameOf = Object.fromEntries(students.map(s => [s.id, `${s.name} (${s.roll_number})`]))

console.log(`\n${affected.length} attempt(s) across ${ids.length} student(s) affected:`)
for (const a of affected.sort((x, y) => y.mismatches - x.mismatches)) {
  const delta = a.gained - a.lost
  console.log(`  ${nameOf[a.student_id] || a.student_id} · Unit ${a.unit_id} L${a.level} #${a.attempt_number}` +
    ` · score ${a.score} → would be ${a.score + delta} (${delta >= 0 ? '+' : ''}${delta})`)
}
