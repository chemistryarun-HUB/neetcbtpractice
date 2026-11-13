import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const OLD = 'Write the structural formula of the major product:\nC₆H₆ + (CH₃)₂CHCH₂OH —H₂SO₄→ ?'
const { data: [r], error } = await sb.from('questions').select('qid,question,content_locked,correct_option').eq('qid', 'NCU27001')
if (error || !r || r.question !== OLD) { console.error('STOP', error, JSON.stringify(r)); process.exit(1) }
console.log('BACKUP', JSON.stringify(r))
const question = 'Write the structural formula of the major product:\n$\\ce{C6H6 + (CH3)2CHCH2OH ->[H2SO4] ?}$'
const { data, error: e } = await sb.from('questions').update({ question }).eq('qid', 'NCU27001').select('qid,question,content_locked,is_published,correct_option')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
