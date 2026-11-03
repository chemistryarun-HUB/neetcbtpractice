import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: rows, error } = await sb.from('questions').select('qid, source').eq('subject', 'Chemistry').like('unit', 'Unit 19 -%').not('qid', 'like', 'NCU19%')
if (error) { console.error(error); process.exit(1) }
console.log('non-NCU19 rows', JSON.stringify(rows))
if (rows.length !== 1 || !/^MTG Bio Q\.\d+$/.test(rows[0].source)) { console.error('STOP unexpected'); process.exit(1) }
const to = rows[0].source.replace('MTG Bio', 'MTG AKC')
const { data, error: e } = await sb.from('questions').update({ source: to }).eq('qid', rows[0].qid).select('qid, source')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
