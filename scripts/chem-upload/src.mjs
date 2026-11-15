import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('qid,source,source_locked').like('qid', 'NCU04%').like('source', 'JEE Main PYQ Q.No.%')
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/source-backup.json', JSON.stringify(data, null, 1))
let n = 0; const skipped = []
for (const r of data) {
  if (r.source_locked) { skipped.push(r.qid); continue }
  const ns = r.source.replace('JEE Main PYQ Q.No.', 'JEE(Main) Q.No.')
  const { error: e } = await sb.from('questions').update({ source: ns }).eq('qid', r.qid)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++
}
const { data: chk } = await sb.from('questions').select('qid,source').like('qid', 'NCU04%').like('source', 'JEE(Main) Q.No.%')
console.log('RESULT', JSON.stringify({ found: data.length, updated: n, skipped, nowJEEMain: chk.length, sample: chk.slice(0, 3) }))
fs.writeFileSync('scripts/chem-upload/dump/source-result.json', JSON.stringify({ found: data.length, updated: n, skipped, nowJEEMain: chk.length }))
