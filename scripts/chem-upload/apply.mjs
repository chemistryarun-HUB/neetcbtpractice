import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const res = {}
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const { data: [r] } = await sb.from('questions').select('*').eq('qid', 'NCU09310')
res.before = r
if (r.option3 === 'I' && r.correct_option === 'V') {
  const { error } = await sb.from('questions').update({ option3: 'IV', correct_option: 'IV' }).eq('qid', 'NCU09310')
  res.err310 = error
}
const { data: d } = await sb.from('questions').select('qid,is_published').like('qid', 'NCU09%').gte('qid', 'NCU09363').lte('qid', 'NCU09455').eq('is_published', false)
const ids = (d || []).map(x => x.qid)
const { error: pe } = await sb.from('questions').update({ is_published: true }).in('qid', ids)
res.pubErr = pe; res.pubCount = ids.length
const { data: [a] } = await sb.from('questions').select('*').eq('qid', 'NCU09310'); res.after = a
const { data: c } = await sb.from('questions').select('qid').gte('qid', 'NCU09363').lte('qid', 'NCU09455').eq('is_published', false); res.stillUnpub = c
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
