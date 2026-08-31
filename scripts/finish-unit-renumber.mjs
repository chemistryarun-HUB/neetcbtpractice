// Finishes the unit-renumbering migration using the exact per-row plan already
// recorded in backup-unit-renumber-2026-08-31.json (id -> intended newQid/newUnit),
// rather than re-deriving a fresh plan from current unit-text — the first run
// partially succeeded, so several rows now sit at their FINAL correct unit
// already, and a naive "shift 24-35 by one again" would double-shift them.
//
// For every row in the backup, checks its CURRENT state by id (the one thing
// that never changes): if it already matches the intended newQid/newUnit,
// skip it (already done); if it still matches the ORIGINAL oldQid/oldUnit,
// apply the write now (it was one of the ones that failed on qid collision,
// now resolved by fix-goc-qid-mismatches.mjs); anything else is unexpected
// and gets flagged rather than silently overwritten.
//
// Dry-run by default. Pass --apply to write.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const APPLY = process.argv.includes('--apply')

const backup = JSON.parse(readFileSync(new URL('../backup-unit-renumber-2026-08-31.json', import.meta.url), 'utf8')).rows

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

const ids = backup.map(r => r.id)
const current = await pageAll(() => sb.from('questions').select('id, qid, unit').in('id', ids))
const currentById = Object.fromEntries(current.map(r => [r.id, r]))

let alreadyDone = 0, toApply = [], unexpected = []
for (const planned of backup) {
  const now = currentById[planned.id]
  if (!now) { unexpected.push({ ...planned, reason: 'row no longer exists' }); continue }
  if (now.qid === planned.newQid && now.unit === planned.newUnit) { alreadyDone++; continue }
  if (now.qid === planned.oldQid && now.unit === planned.oldUnit) { toApply.push(planned); continue }
  unexpected.push({ ...planned, reason: `current state is neither old nor new: qid=${now.qid} unit=${now.unit}` })
}

console.log(`${backup.length} rows in the original plan.`)
console.log(`  ${alreadyDone} already at their final state — skipping.`)
console.log(`  ${toApply.length} still at their original state — need the write.`)
console.log(`  ${unexpected.length} in an unexpected state — will NOT be touched.`)

if (unexpected.length) {
  console.log('\nUnexpected rows (review before proceeding):')
  for (const u of unexpected) console.log(`   ${u.id}  ${u.oldQid} -> ${u.newQid}  (${u.reason})`)
}

if (!toApply.length) { console.log('\nNothing to apply.'); process.exit(0) }

console.log('\nRows to apply:')
for (const p of toApply) console.log(`   ${p.oldQid} -> ${p.newQid}   "${p.oldUnit}" -> "${p.newUnit}"`)

if (!APPLY) {
  console.log('\nDry run — nothing written. Re-run with --apply to write these changes.')
  process.exit(0)
}

console.log('\nApplying…')
let ok = 0
for (const p of toApply) {
  const { error } = await sb.from('questions').update({ unit: p.newUnit, qid: p.newQid }).eq('id', p.id)
  if (error) { console.error(`   FAILED ${p.oldQid} -> ${p.newQid}: ${error.message}`); continue }
  ok++
}
console.log(`${ok}/${toApply.length} written.`)
