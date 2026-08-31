// One-off: fixes questions whose qid's embedded unit number doesn't match their
// actual `unit` column — found while renumbering the Organic Reaction Mechanisms
// section, unrelated to that task. The largest cluster (70 rows) is GOC content
// (units 21/22/23) uploaded 2026-08-26/27 with qids like "NCU35001" that were
// never meant to reference "unit 35" at all; a smaller pair has qid "NCU22xxx"
// under unit 23 (a later reclassification whose qid never caught up — same
// pattern as the two rows found and healed during the unit renumbering).
//
// Each mismatched row gets a fresh serial in ITS OWN real unit's numbering,
// one past whatever's already the highest serial among that unit's correctly-
// prefixed rows — so it can never collide with a real qid. Only `qid` changes;
// `unit`, level, topic, question content are already correct and untouched.
//
// Dry-run by default. Pass --apply to write.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

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

const all = await pageAll(() => sb.from('questions').select('id, qid, unit, level, topic'))

function qidUnitNum(qid) { return Number((qid || '').match(/^NCU(\d{2})/)?.[1]) || null }
function textUnitNum(unit) { return Number((unit || '').match(/^Unit\s+(\d+)/)?.[1]) || null }

const mismatched = all.filter(r => {
  const q = qidUnitNum(r.qid), u = textUnitNum(r.unit)
  return q && u && q !== u
})

console.log(`${mismatched.length} mismatched row(s) found across the whole bank.\n`)
if (!mismatched.length) process.exit(0)

// Group by the row's REAL (unit-text) unit number — that's whose numbering
// space each one needs a fresh serial in.
const byRealUnit = {}
for (const r of mismatched) (byRealUnit[textUnitNum(r.unit)] ||= []).push(r)

const plan = []
for (const [unitStr, rows] of Object.entries(byRealUnit)) {
  const unitNum = Number(unitStr)
  const prefix = `NCU${String(unitNum).padStart(2, '0')}`
  // Seed the "already used" set from every qid in the bank that already
  // carries this prefix (correct or not) — a fresh serial must avoid all of
  // them, not just the ones belonging to this unit.
  const used = new Set(all.filter(r => r.qid.startsWith(prefix)).map(r => r.qid))
  const widths = all.filter(r => r.qid.startsWith(prefix)).map(r => r.qid.length - prefix.length)
  const serialWidth = widths.length ? Math.max(...widths) : 3
  let serial = 1
  function nextFree() {
    let candidate
    do { candidate = `${prefix}${String(serial++).padStart(serialWidth, '0')}` } while (used.has(candidate))
    used.add(candidate)
    return candidate
  }

  for (const r of rows) {
    const newQid = nextFree()
    plan.push({ id: r.id, oldQid: r.qid, newQid, unit: r.unit, level: r.level, topic: r.topic })
  }
}

console.log('Plan:')
for (const p of plan) console.log(`   ${p.oldQid} -> ${p.newQid}   (${p.unit}, level ${p.level}, "${p.topic}")`)

if (!APPLY) {
  console.log('\nDry run — nothing written. Re-run with --apply to write these changes.')
  process.exit(0)
}

const backupPath = new URL(`../backup-goc-qid-fix-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url)
writeFileSync(backupPath, JSON.stringify({ takenAt: new Date().toISOString(), rows: plan }, null, 2))
console.log(`\nBackup written to ${backupPath.pathname}`)

console.log('\nApplying…')
let ok = 0
for (const p of plan) {
  const { error } = await sb.from('questions').update({ qid: p.newQid }).eq('id', p.id)
  if (error) { console.error(`   FAILED ${p.oldQid} -> ${p.newQid}: ${error.message}`); continue }
  ok++
}
console.log(`${ok}/${plan.length} written.`)
