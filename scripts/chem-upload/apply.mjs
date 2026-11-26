import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const res = {}
const { data: b } = await sb.from('questions').select('qid,option4,correct_option,content_locked').eq('qid', 'NCU09204')
res.before = b
if (b?.[0]?.option4 === 'decreasing electronegativity') {
  const { error } = await sb.from('questions').update({ option4: 'decreasing electronegativity.', correct_option: 'decreasing electronegativity.' }).eq('qid', 'NCU09204')
  res.updErr = error
}
const { data: a } = await sb.from('questions').select('qid,option4,correct_option').eq('qid', 'NCU09204'); res.after = a
const { data: ch, error: ce } = await sb.from('answer_key_changes').select('*').eq('status', 'pending')
res.pending = ch; res.chErr = ce
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
