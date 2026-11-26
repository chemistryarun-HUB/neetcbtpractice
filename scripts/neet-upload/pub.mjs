// One-off: publish NCERT Exemplar Physics drafts for approved units (Arun approves each unit) (run: Ch-3 -> Units 3,4,5)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const UNITS = ['Unit 3 - Motion In One Dimension','Unit 4 - Motion In Two Dimensions','Unit 5 - Laws of Motion']
const base = () => sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'NCERT Exemplar %')
const { count: before } = await base().eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'NCERT Exemplar %').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: pub } = await base().eq('is_published', true)
const { count: left } = await base().eq('is_published', false)
console.log('DONE published', data.length, 'total published', pub, 'drafts left', left, data.map(d => d.qid).sort().join(','))
