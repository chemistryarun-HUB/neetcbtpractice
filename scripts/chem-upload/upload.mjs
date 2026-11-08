import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
let all = [], from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('*').eq('subject', 'Chemistry').like('unit', 'Unit 3 -%').order('qid').range(from, from + 499)
  if (error) { console.error(error); process.exit(1) }
  all = all.concat(data); if (data.length < 500) break; from += 500
}
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/unit3.json', JSON.stringify(all))
const c = {}; for (const q of all) { const k = `L${q.level} pub=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('rows', all.length, c, 'cols', Object.keys(all[0] || {}).join(','))
