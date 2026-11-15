import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const pl = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
const ids = Object.keys(pl)
const { data, error } = await sb.from('questions').select('qid,source,source_locked,question_tag').in('qid', ids)
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/source-backup3.json', JSON.stringify(data, null, 1))
let n = 0; const skipped = [], drift = []
for (const r of data) {
  if (r.source_locked) { skipped.push(r.qid); continue }
  if (r.source !== pl[r.qid].old) { drift.push([r.qid, r.source]); continue }
  const { error: e } = await sb.from('questions').update({ source: pl[r.qid].new }).eq('qid', r.qid)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++
}
const { data: chk } = await sb.from('questions').select('qid,source').in('qid', ids)
const bad = chk.filter(r => r.source !== pl[r.qid].new && !skipped.includes(r.qid) && !drift.find(d => d[0] === r.qid)).map(r => r.qid)
const res = { wanted: ids.length, found: data.length, updated: n, skipped, drift, notAfter: bad }
console.log('RESULT', JSON.stringify(res))
fs.writeFileSync('scripts/chem-upload/dump/source-result3.json', JSON.stringify(res))
