// One-off, 2026-11-16: units 13-18 of Chemistry were renamed, which moved the name
// "Some Basic Principles of Organic Chemistry" from Unit 14 to Unit 13. Its 76
// questions follow it: unit text "Unit 14 - …" -> "Unit 13 - …" and Q ID NCU14nnn ->
// NCU13nnn (a Q ID carries its unit number).
//
// Dry run by default; --apply writes. A backup of every row's old unit and Q ID is
// written first, before any change.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const OLD_UNIT = 'Unit 14 - Some Basic Principles of Organic Chemistry'
const NEW_UNIT = 'Unit 13 - Some Basic Principles of Organic Chemistry'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { data: rows, error } = await db.from('questions').select('id, qid, unit, subject, medium').eq('subject', 'Chemistry').eq('unit', OLD_UNIT).order('qid')
if (error) throw new Error(error.message)
const bad = rows.filter(r => !/^NCU14\d+$/.test(r.qid))
if (bad.length) { console.log('Unexpected Q IDs, stopping:', bad.map(b => b.qid)); process.exit(1) }
const plan = rows.map(r => ({ id: r.id, from: r.qid, to: r.qid.replace(/^NCU14/, 'NCU13'), oldUnit: r.unit, newUnit: NEW_UNIT }))
console.log(`${plan.length} questions: ${plan[0]?.from} -> ${plan[0]?.to} … ${plan.at(-1)?.from} -> ${plan.at(-1)?.to}`)

const { data: clash } = await db.from('questions').select('qid').in('qid', plan.map(p => p.to))
if (clash.length) { console.log('Q ID clash, stopping:', clash.map(c => c.qid)); process.exit(1) }
if (!APPLY) { console.log('Dry run: nothing written. Add --apply to write.'); process.exit(0) }

const backup = `backup-unit-13-move-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(backup, JSON.stringify(plan, null, 1))
console.log('backup written:', backup)

let done = 0
for (const p of plan) {
  const { error: e } = await db.from('questions').update({ qid: p.to, unit: p.newUnit }).eq('id', p.id).eq('qid', p.from)
  if (e) { console.log('FAILED at', p.from, e.message, '| rerun is safe: moved rows are skipped'); process.exit(1) }
  done++
}
console.log('moved:', done)
