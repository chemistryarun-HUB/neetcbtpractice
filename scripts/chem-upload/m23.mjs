import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('qid,question,question_type,content_locked').eq('qid', 'NCU03523')
if (error || !r || r.content_locked || r.question !== 'Match the species in List I with the bond order in List II.') { console.error('STOP', error, r); process.exit(1) }
const { data, error: e } = await sb.from('questions').update({ question: 'Match the species in List-I with the bond order in List-II.' }).eq('qid', 'NCU03523').select('qid, question, question_type')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
