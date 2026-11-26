import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const all = []
for (let from = 0; ; from += 500) {
  const { data, error } = await sb.from('questions').select('*').like('qid', 'NCU09%').order('qid').range(from, from + 499)
  if (error) { console.error(error); process.exit(1) }
  all.push(...data); if (data.length < 500) break
}
const { data: mtc } = await sb.from('questions').select('*').eq('question_type', 'Match the Column').like('qid', 'NCU%').limit(4)
const { data: lv } = await sb.from('levels').select('*').eq('subject', 'Chemistry').eq('unit', 9)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/u9all.json', JSON.stringify(all))
fs.writeFileSync('scripts/chem-upload/dump/mtc.json', JSON.stringify(mtc, null, 1))
fs.writeFileSync('scripts/chem-upload/dump/lv.json', JSON.stringify(lv ?? 'none', null, 1))
console.log('RESULT', all.length, mtc?.length)
