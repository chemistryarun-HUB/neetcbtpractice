// One-off: publish JEE Main/AIEEE 2002-2018 Physics drafts (Disha) for one unit (Arun approves each unit)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const UNITS = ['Unit 7 - Center of Mass Momentum and Collision','Unit 8 - Rotational Motion']
const base = () => sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Disha JEE Main %')
const { count: before } = await base().eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Disha JEE Main %').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: pub } = await base().eq('is_published', true)
const { count: left } = await base().eq('is_published', false)
console.log('DONE published', data.length, 'total published', pub, 'drafts left', left, data.map(d => d.qid).sort().join(','))
