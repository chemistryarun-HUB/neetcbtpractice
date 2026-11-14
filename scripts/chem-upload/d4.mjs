import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
let rows = [], from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('*').eq('subject', 'Chemistry').like('unit', 'Unit 4 %').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows = rows.concat(data); if (data.length < 1000) break; from += 1000
}
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/u4.json', JSON.stringify(rows))
console.log('DONE', rows.length)
