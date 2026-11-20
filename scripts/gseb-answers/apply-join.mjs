// One-off, 2026-11-20, at Arun's request ("equations should be in one row",
// with the PDF going back to one column): put back on one line the equations
// that were split for the two-column PDF, in all 11 Chemistry papers' Part B
// answers. A row changes only while it still holds exactly the text written
// today, so anything edited in admin since is left alone. Dry run by default.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { joinEquations } from './join.mjs'
import { AFTER, BEFORE } from './chem-2024-wrap.mjs'

const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const dir = new URL('./chem/', import.meta.url)

const HYDROBORATION = String.raw`$\ce{CH3-CH=CH2 + (H-BH2)2 -> CH3-CH2-CH2-BH2}$
$\ce{->[CH3CH=CH2] (CH3CH2CH2)2BH ->[CH3CH=CH2] (CH3CH2CH2)3B}$
$\ce{(CH3CH2CH2)3B ->[3H2O2,~OH^-] 3CH3CH2CH2OH + B(OH)3}$`

const CHANGES = {} // key -> [old, new]
for (let c = 1; c <= 10; c++) {
  const m = await import(new URL(`ch${String(c).padStart(2, '0')}.mjs`, dir))
  for (const [k, old] of Object.entries(m.ANSWERS)) {
    let neu = joinEquations(old)
    if (k === '2023M-27' || k === '2022S-19') neu = neu.replace(/\$\\ce\{CH3-CH=CH2 \+ \(H-BH2\)2 ->.*\}\$/, HYDROBORATION)
    if (neu !== old) CHANGES[k] = [old, neu]
  }
}
for (const q of Object.keys(AFTER)) if (AFTER[q] !== BEFORE[q]) CHANGES[`2024M-${q}`] = [AFTER[q], BEFORE[q]]

const { data: papers, error } = await sb.from('gseb_papers').select('id, year, session, set_no').eq('subject', 'chemistry').eq('medium', 'en')
if (error) throw new Error(error.message)
const paperOf = {}
for (const p of papers) if ((p.set_no || '') === '') paperOf[`${p.year}${p.session === 'march' ? 'M' : 'S'}`] = p.id

let written = 0
const kept = []
const byPaper = {}
for (const k of Object.keys(CHANGES)) (byPaper[k.split('-')[0]] ||= []).push(k)
for (const [tag, list] of Object.entries(byPaper)) {
  const { data: rows, error: e2 } = await sb.from('gseb_subjective').select('id, q_no, answer').eq('paper_id', paperOf[tag])
  if (e2) throw new Error(e2.message)
  for (const k of list) {
    const row = rows.filter(r => r.q_no === Number(k.split('-')[1]))
    if (row.length !== 1) { kept.push(`${k} (${row.length} rows)`); continue }
    if (row[0].answer !== CHANGES[k][0]) { kept.push(`${k} (edited since)`); continue }
    if (APPLY) {
      const { error: e3 } = await sb.from('gseb_subjective').update({ answer: CHANGES[k][1] }).eq('id', row[0].id)
      if (e3) throw new Error(`${k}: ${e3.message}`)
    }
    written++
  }
}
console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: ${written} of ${Object.keys(CHANGES).length} answers rejoined; left alone: ${kept.join(', ') || 'none'}`)
if (kept.length) process.exitCode = 1
