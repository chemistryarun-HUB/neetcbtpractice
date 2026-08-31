// One-off: renumbers units 24-35 (Organic Reaction Mechanisms) to 25-36, freeing
// up unit 24 for the new GOC unit "Physical Properties". Only two columns on
// `questions` actually need to change per affected row:
//   - unit  ("Unit 24 - Free Radical Reactions" -> "Unit 25 - Free Radical Reactions")
//   - qid   ("NCU24015" -> "NCU25015")
// level/topic/question/options/images/correct_option/is_active/content_locked
// are untouched — the level definitions moved wholesale with their unit, so
// nothing about the content itself changed, only which unit number owns it.
//
// Processed HIGH unit number to LOW (36 before 25) so that by the time a given
// unit's rows are renamed into their new slot, nothing already occupies it —
// e.g. unit 35's rows move to 36 (empty) before unit 34's rows move into the
// now-vacated 35. qid is UNIQUE NOT NULL, so getting this order wrong would
// fail immediately with a conflict rather than silently corrupting anything.
//
// Dry-run by default — prints the full plan, writes nothing. Pass --apply to write.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const APPLY = process.argv.includes('--apply')

// old unit number -> new unit number (descending old-number processing order)
const SHIFTS = [35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24].map(old => [old, old + 1])

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

// ── Phase 1: build the full plan for every unit, write nothing yet ──────────
const unitPlans = []
for (const [oldN, newN] of SHIFTS) {
  const rows = await pageAll(() => sb.from('questions')
    .select('id, qid, unit, level, is_active')
    .ilike('unit', `Unit ${oldN} -%`))
  if (!rows.length) continue

  // A row's qid can predate a later re-levelling — its `unit` says it belongs
  // here now, but its qid still carries whichever unit it was originally filed
  // under (found live: NCU24034 sitting under "Unit 35 - Miscellaneous
  // Reactions", qid never updated when it got reclassified). The normal
  // prefix-replace can't do anything sensible with that, so such rows get a
  // FRESH serial in the target unit's own numbering instead — one past
  // whatever's already the highest serial among this unit's correctly-prefixed
  // rows, so it can never collide with a real qid.
  const correctlyPrefixed = rows.filter(r => new RegExp(`^NCU${oldN}\\d`).test(r.qid))
  const serialWidth = correctlyPrefixed[0]?.qid.length - `NCU${oldN}`.length || 3
  const maxSerial = correctlyPrefixed.reduce((max, r) => {
    const n = Number(r.qid.slice(`NCU${oldN}`.length))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  let nextFreeSerial = maxSerial + 1

  const plan = rows.map(r => {
    const newUnit = r.unit.replace(new RegExp(`^Unit ${oldN} -`), `Unit ${newN} -`)
    const prefixMatches = new RegExp(`^NCU${oldN}\\d`).test(r.qid)
    const newQid = prefixMatches
      ? r.qid.replace(new RegExp(`^NCU${oldN}(\\d)`), `NCU${newN}$1`)
      : `NCU${newN}${String(nextFreeSerial++).padStart(serialWidth, '0')}`
    return { id: r.id, oldQid: r.qid, newQid, oldUnit: r.unit, newUnit, level: r.level, is_active: r.is_active, healedQid: !prefixMatches }
  })

  const healed = plan.filter(p => p.healedQid)
  if (healed.length) {
    console.log(`Unit ${oldN}: ${healed.length} row(s) had a qid mismatched to their actual unit — reassigning fresh serials:`)
    for (const h of healed) console.log(`   ${h.oldQid} -> ${h.newQid}  (was filed under this unit already, qid just never caught up)`)
  }

  unitPlans.push({ oldN, newN, plan })
}

const totalPlanned = unitPlans.reduce((s, u) => s + u.plan.length, 0)
console.log(`${totalPlanned} question(s) across ${unitPlans.length} unit(s):\n`)
for (const { oldN, newN, plan } of unitPlans) {
  console.log(`Unit ${oldN} -> ${newN}: ${plan.length} question(s)`)
  console.log(`   e.g. ${plan[0].oldQid} -> ${plan[0].newQid}   "${plan[0].oldUnit}" -> "${plan[0].newUnit}"`)
}

if (!APPLY) {
  console.log('\nDry run — nothing written. Re-run with --apply to write these changes.')
  process.exit(0)
}

// ── Phase 2: backup BEFORE any write, so a mid-run failure still leaves a
// complete "before" snapshot rather than only covering whatever succeeded ──
const allRows = unitPlans.flatMap(u => u.plan)
const backupPath = new URL(`../backup-unit-renumber-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url)
writeFileSync(backupPath, JSON.stringify({ takenAt: new Date().toISOString(), rows: allRows }, null, 2))
console.log(`\nBackup of ${allRows.length} rows' old (id, qid, unit) written to ${backupPath.pathname}`)

console.log('\nApplying…')
for (const { oldN, newN, plan } of unitPlans) {
  let ok = 0
  for (const p of plan) {
    const { error } = await sb.from('questions').update({ unit: p.newUnit, qid: p.newQid }).eq('id', p.id)
    if (error) { console.error(`   FAILED ${p.oldQid} -> ${p.newQid}: ${error.message}`); continue }
    ok++
  }
  console.log(`Unit ${oldN} -> ${newN}: ${ok}/${plan.length} written.`)
}
console.log('Done.')
