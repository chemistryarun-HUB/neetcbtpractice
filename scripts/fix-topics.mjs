// One-off: recompute `topic` for every question from its (unit, level) using UNIT_LEVELS,
// fixing rows left stale by editing level without updating topic (pre-fix bug).
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { UNIT_LEVELS } from '../src/lib/constants.js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function deriveTopic(unitString, level) {
  const match = (unitString || '').match(/^Unit\s+(\d+)\s*-/i)
  if (!match) return null
  const unitId = Number(match[1])
  const levelDefs = UNIT_LEVELS[unitId] || []
  return levelDefs.find(l => l.id === Number(level))?.name || null
}

const { data: rows, error } = await supabase.from('questions').select('id, qid, unit, level, topic')
if (error) { console.error(error); process.exit(1) }

const updates = []
for (const row of rows) {
  const correct = deriveTopic(row.unit, row.level)
  if (correct && correct !== row.topic) updates.push({ id: row.id, qid: row.qid, from: row.topic, to: correct })
}

console.log(`${rows.length} questions scanned, ${updates.length} need a topic fix.`)
for (const u of updates) console.log(`  ${u.qid}: "${u.from}" -> "${u.to}"`)

if (updates.length === 0) { console.log('Nothing to do.'); process.exit(0) }

for (const u of updates) {
  const { error: upErr } = await supabase.from('questions').update({ topic: u.to }).eq('id', u.id)
  if (upErr) console.error(`Failed to update ${u.qid}:`, upErr.message)
}
console.log('Done.')
