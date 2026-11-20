// One-off, 2026-11-20, at Arun's request: write the Part B model answers of
// GSEB Chemistry 2024 Main Paper (chem-2024-main.mjs) into gseb_subjective.answer.
// Only fills empty answers; an answer already written in admin is left alone
// and listed. Dry run by default; --apply writes.
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the environment.
import { createClient } from '@supabase/supabase-js'
import { ANSWERS, SOURCE } from './chem-2024-main.mjs'

const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const { data: papers, error } = await sb.from('gseb_papers').select('id, subject, year, session, medium, set_no, is_published')
  .match({ subject: 'chemistry', year: 2024, session: 'march', medium: 'en' })
if (error) throw new Error(error.message)
console.log('matching papers:', papers)
if (papers.length !== 1) { console.log('Expected exactly one Chemistry 2024 Main (English) paper, stopping.'); process.exit(1) }
const paper = papers[0]

const { data: rows, error: e2 } = await sb.from('gseb_subjective').select('id, q_no, marks, question, answer').eq('paper_id', paper.id).order('q_no')
if (e2) throw new Error(e2.message)
console.log(`Part B rows in the paper: ${rows.length}`)

let written = 0
const kept = [], missing = []
for (const [qNo, answer] of Object.entries(ANSWERS)) {
  const row = rows.find(r => r.q_no === Number(qNo))
  if (!row) { missing.push(qNo); continue }
  const head = row.question.replace(/\s+/g, ' ').slice(0, 70)
  if (row.answer && row.answer.trim()) {
    kept.push(qNo)
    console.log(`Q${qNo} [${SOURCE[qNo]}] ALREADY HAS AN ANSWER, left alone: ${head}`)
    continue
  }
  console.log(`Q${qNo} [${SOURCE[qNo]}] ${APPLY ? 'writing' : 'would write'} ${answer.length} chars: ${head}`)
  if (APPLY) {
    const { error: e3 } = await sb.from('gseb_subjective').update({ answer }).eq('id', row.id)
    if (e3) throw new Error(`Q${qNo}: ${e3.message}`)
    written++
  }
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}: written ${written}, already had answer ${kept.length} (${kept.join(', ')}), no such question ${missing.length} (${missing.join(', ')})`)

const { data: after } = await sb.from('gseb_subjective').select('q_no, answer').eq('paper_id', paper.id)
console.log(`DATABASE NOW: ${after.filter(r => r.answer && r.answer.trim()).length} of ${after.length} Part B questions have a model answer`)
if (missing.length) process.exitCode = 1
