import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const rows = JSON.parse(fs.readFileSync('scripts/phy-mtc/mtc.json', 'utf8'))
let ok = 0
for (const r of rows) {
  const patch = { question_type: 'Match the Column', question: r.question, mtc_label_a: r.la, mtc_label_b: r.lb }
  for (let i = 0; i < 10; i++) { patch[`col_a${i + 1}`] = r.a[i] || null; patch[`col_b${i + 1}`] = r.b[i] || null }
  const { data, error } = await sb.from('questions').update(patch).eq('qid', r.qid).eq('is_published', false).select('qid')
  if (error) { console.error(r.qid, error); process.exit(1) }
  if (data.length !== 1) { console.error('not updated', r.qid, data.length); process.exit(1) }
  ok++
}
const { data } = await sb.from('questions').select('question_type').like('qid', 'NPU02%')
const c = {}; for (const q of data) c[q.question_type] = (c[q.question_type] || 0) + 1
console.log('UPDATED', ok, c)
