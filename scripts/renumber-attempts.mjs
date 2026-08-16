/**
 * One-time data fix: make `test_attempts.attempt_number` consecutive from 1,
 * per (student_id, unit_id, level), ordered by submission time.
 *
 * Why it's needed: attempt_number is assigned at test-START time from a count
 * of prior attempts, which corrupts it two ways — an older build counted
 * abandoned sessions (so a student who bailed out of four tests had their
 * first real attempt stored as "#5"), and because the number is chosen before
 * the row exists, two sessions started against the same count both claim it
 * (two "#2"s in one level). See attemptsInOrder() in lib/performanceMetrics.js.
 *
 * Only SUBMITTED attempts are renumbered: they're the only ones any screen
 * displays, and the only ones TestPage counts when assigning the next number.
 * Abandoned rows keep whatever they had — invisible either way.
 *
 * Usage:
 *   node scripts/renumber-attempts.mjs            # dry run, writes nothing
 *   node scripts/renumber-attempts.mjs --apply    # back up, then write
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const APPLY = process.argv.includes('--apply')

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').trim().split('\n').filter(Boolean).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const COLS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, submitted, started_at, submitted_at'

// Mirrors thresholdPctFor() in lib/constants.js — the bar gets easier through
// attempt 3, then holds there.
const UNLOCK = [{ attempt: 1, pct: 60 }, { attempt: 2, pct: 50 }, { attempt: 3, pct: 40 }]
function thresholdPctFor(n) {
  const exact = UNLOCK.find(t => t.attempt === n)
  if (exact) return exact.pct
  const last = UNLOCK[UNLOCK.length - 1]
  return n > last.attempt ? last.pct : null
}
function scorePct(a) {
  const total = (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
  const max = total * 4
  return max > 0 ? (a.score / max) * 100 : 0
}
function clearedUnder(a, num) {
  const req = thresholdPctFor(num)
  return req != null && scorePct(a) >= req
}

async function fetchAll(query) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const all = await fetchAll(() => sb.from('test_attempts').select(COLS))
const submitted = all.filter(a => a.submitted && a.unit_id != null)
console.log(`total rows: ${all.length} · submitted with a unit: ${submitted.length}`)

// Group by (student, unit, level), order by submission time
const groups = {}
for (const a of submitted) {
  ;(groups[`${a.student_id}|${a.unit_id}|${a.level}`] ||= []).push(a)
}

const changes = []
const clearedFlips = []
const levelFlips = []

for (const [key, rows] of Object.entries(groups)) {
  const ordered = [...rows].sort((a, b) =>
    String(a.submitted_at || '').localeCompare(String(b.submitted_at || '')) ||
    (a.attempt_number ?? 0) - (b.attempt_number ?? 0))

  // Whole-level "did they ever clear it" verdict, before vs after.
  const clearedBefore = ordered.some(a => clearedUnder(a, a.attempt_number))
  const clearedAfter = ordered.some((a, i) => clearedUnder(a, i + 1))
  if (clearedBefore !== clearedAfter) levelFlips.push({ key, clearedBefore, clearedAfter })

  ordered.forEach((a, i) => {
    const next = i + 1
    if (a.attempt_number === next) return
    changes.push({ id: a.id, key, from: a.attempt_number, to: next, submitted_at: a.submitted_at })
    const wasCleared = clearedUnder(a, a.attempt_number)
    const nowCleared = clearedUnder(a, next)
    if (wasCleared !== nowCleared) {
      clearedFlips.push({ key, from: a.attempt_number, to: next, scorePct: scorePct(a).toFixed(1), wasCleared, nowCleared })
    }
  })
}

console.log(`\nrows whose attempt_number changes: ${changes.length}`)
console.table(changes.map(c => ({ ...c, key: c.key.slice(0, 8) + '…' + c.key.slice(c.key.indexOf('|')) })))

console.log(`\nper-attempt "Level cleared" badge flips caused by the renumber: ${clearedFlips.length}`)
if (clearedFlips.length) console.table(clearedFlips)

console.log(`whole-level cleared verdict flips (would contradict a real unlock): ${levelFlips.length}`)
if (levelFlips.length) console.table(levelFlips)

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to back up and write.')
  process.exit(0)
}

if (changes.length === 0) {
  console.log('\nNothing to do.')
  process.exit(0)
}

const stamp = new Date().toISOString().slice(0, 10)
const backupPath = `backup-pre-attempt-renumber-${stamp}.json`
fs.writeFileSync(backupPath, JSON.stringify({ takenAt: new Date().toISOString(), test_attempts: all }, null, 0))
console.log(`\nBacked up all ${all.length} test_attempts rows to ${backupPath}`)

let ok = 0
for (const c of changes) {
  const { error } = await sb.from('test_attempts').update({ attempt_number: c.to }).eq('id', c.id)
  if (error) { console.error(`FAILED ${c.id}: ${error.message}`); process.exit(1) }
  ok++
}
console.log(`updated ${ok} rows`)

// Re-read and confirm every group is now 1..n with no gaps or duplicates
const after = await fetchAll(() => sb.from('test_attempts').select(COLS))
const re = {}
for (const a of after.filter(x => x.submitted && x.unit_id != null)) {
  ;(re[`${a.student_id}|${a.unit_id}|${a.level}`] ||= []).push(a.attempt_number)
}
const bad = Object.entries(re).filter(([, nums]) => {
  const s = [...nums].sort((x, y) => x - y)
  return s.some((n, i) => n !== i + 1)
})
console.log(bad.length === 0
  ? `VERIFIED: all ${Object.keys(re).length} (student, unit, level) groups now number 1..n cleanly.`
  : `STILL BROKEN in ${bad.length} groups: ${JSON.stringify(bad.slice(0, 5))}`)
