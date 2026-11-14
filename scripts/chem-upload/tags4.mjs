import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
let rows = [], from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('qid,unit,question_tag,is_published,medium').eq('subject', 'Chemistry').like('unit', 'Unit 4 %').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows = rows.concat(data); if (data.length < 1000) break; from += 1000
}
const units = {}; rows.forEach(r => { units[r.unit] = (units[r.unit] || 0) + 1 })
const tags = {}; rows.forEach(r => { const t = r.question_tag || '(empty)'; tags[t] = (tags[t] || 0) + 1 })
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/tags4.json', JSON.stringify({ total: rows.length, units, tags, pub: rows.filter(r => r.is_published).length }, null, 1))
console.log('DONE', rows.length)
