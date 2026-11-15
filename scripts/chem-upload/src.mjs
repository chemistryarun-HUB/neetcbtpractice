import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('qid,source,source_locked,question_tag').gte('qid', 'NCU04268').lte('qid', 'NCU04310').in('question_tag', ['JEE(Main) 2025', 'JEE(Main) 2026'])
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/source-backup2.json', JSON.stringify(data, null, 1))
let n = 0; const skipped = []
for (const r of data) {
  if (r.source_locked) { skipped.push(r.qid); continue }
  const { error: e } = await sb.from('questions').update({ source: r.question_tag }).eq('qid', r.qid)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++
}
const { data: chk } = await sb.from('questions').select('qid,source,question_tag').gte('qid', 'NCU04268').lte('qid', 'NCU04310')
const bad = chk.filter(r => r.source !== r.question_tag && !skipped.includes(r.qid)).map(r => r.qid)
const { data: bk } = await sb.from('questions').select('qid,source').gte('qid', 'NCU04098').lte('qid', 'NCU04267')
const badBook = bk.filter(r => r.source !== 'JEE(Main) Q.No. ' + (parseInt(r.qid.slice(3)) - 4097)).map(r => r.qid)
const res = { found: data.length, updated: n, skipped, notEqualAfter: bad, bookRows: bk.length, bookMismatch: badBook }
console.log('RESULT', JSON.stringify(res))
fs.writeFileSync('scripts/chem-upload/dump/source-result2.json', JSON.stringify(res))
