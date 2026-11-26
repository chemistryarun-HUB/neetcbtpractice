// One-off: Physics NCERT Exemplar Qs -> question_tag 'Exemplar' (Arun 2026-11-26)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').update({ question_tag: 'Exemplar' }).eq('subject', 'Physics').like('source', 'NCERT Exemplar %').neq('question_tag', 'Exemplar').select('qid')
if (error) { console.error(error); process.exit(1) }
const { count } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').like('source', 'NCERT Exemplar %').eq('question_tag', 'Exemplar')
console.log('DONE retagged', data.length, 'total with Exemplar tag', count)
