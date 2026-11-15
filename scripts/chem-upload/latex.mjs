import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { payload, old } = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
const ids = Object.keys(payload)
const { data: rows, error } = await sb.from('questions').select('*').in('qid', ids)
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/latex-backup.json', JSON.stringify(rows, null, 1))
const by = Object.fromEntries(rows.map(r => [r.qid, r]))
const res = { done: [], skipped: [], failed: [], bad: [] }
for (const qid of ids) {
  const r = by[qid]
  if (!r) { res.skipped.push([qid, 'missing']); continue }
  if (r.content_locked) { res.skipped.push([qid, 'locked']); continue }
  const drift = Object.keys(old[qid]).filter(f => (r[f] ?? null) !== (old[qid][f] ?? null))
  if (drift.length) { res.skipped.push([qid, 'drift:' + drift.join(',')]); continue }
  const { error: e } = await sb.from('questions').update(payload[qid]).eq('qid', qid)
  if (e) { res.failed.push([qid, e.message]); continue }
  res.done.push(qid)
}
const { data: chk } = await sb.from('questions').select('*').in('qid', res.done)
for (const n of chk) {
  for (const [f, v] of Object.entries(payload[n.qid])) if (n[f] !== v) res.bad.push([n.qid, f])
  if (n.is_published !== by[n.qid].is_published || n.content_locked !== by[n.qid].content_locked) res.bad.push([n.qid, 'lock/publish'])
}
fs.writeFileSync('scripts/chem-upload/dump/latex-result.json', JSON.stringify(res, null, 1))
console.log('RESULT', JSON.stringify({ done: res.done.length, skipped: res.skipped, failed: res.failed, bad: res.bad }))
