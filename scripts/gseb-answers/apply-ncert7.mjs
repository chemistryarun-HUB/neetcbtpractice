// One-off, 2026-11-20, at Arun's request: replace the 7 Chemistry 2024 Main
// Part B answers written from memory (Q3, 4, 10, 13, 16, 23, 25) with the
// NCERT-worded ones in chem-2024-ncert7.mjs. A row is changed only while it
// still holds the text written earlier today, so an edit made in admin since
// then is kept. Dry run by default; --apply writes.
import { createClient } from '@supabase/supabase-js'
import { ANSWERS as OLD } from './chem-2024-main.mjs'
import { NCERT_ANSWERS } from './chem-2024-ncert7.mjs'

const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const { data: papers, error } = await sb.from('gseb_papers').select('id')
  .match({ subject: 'chemistry', year: 2024, session: 'march', medium: 'en' })
if (error) throw new Error(error.message)
if (papers.length !== 1) { console.log(`Expected one Chemistry 2024 Main paper, found ${papers.length}; stopping.`); process.exit(1) }

const { data: rows, error: e2 } = await sb.from('gseb_subjective').select('id, q_no, answer').eq('paper_id', papers[0].id)
if (e2) throw new Error(e2.message)

let written = 0
const kept = []
for (const [qNo, answer] of Object.entries(NCERT_ANSWERS)) {
  const row = rows.find(x => x.q_no === Number(qNo))
  if (!row) { kept.push(`Q${qNo} (missing)`); continue }
  if ((row.answer || '') !== OLD[qNo]) { kept.push(`Q${qNo} (edited since, left alone)`); continue }
  console.log(`Q${qNo}: ${APPLY ? 'writing' : 'would write'} ${answer.length} chars (was ${row.answer.length})`)
  if (APPLY) {
    const { error: e3 } = await sb.from('gseb_subjective').update({ answer }).eq('id', row.id)
    if (e3) throw new Error(`Q${qNo}: ${e3.message}`)
    written++
  }
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}: written ${written}; not changed: ${kept.join(', ') || 'none'}`)
if (kept.length) process.exitCode = 1
