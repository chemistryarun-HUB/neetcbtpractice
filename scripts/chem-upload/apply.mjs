import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const out = {}
for (const pfx of ['NCU06', 'NCU05']) {
  const { data, error } = await sb.from('questions').select('qid,unit,level,topic,is_published,is_active,question_tag,source,medium').like('qid', pfx + '%')
  out[pfx] = error ? { error } : data
}
const { data: u6, error: e6 } = await sb.from('questions').select('qid,unit,level,is_published').eq('subject', 'Chemistry').ilike('unit', 'Unit 6 %')
out.unit6 = e6 ? { error: e6 } : u6
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(out, null, 1))
console.log('done')
