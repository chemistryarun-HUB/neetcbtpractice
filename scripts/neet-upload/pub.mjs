// One-off: publish JEE Main/AIEEE 2002-2018 Physics drafts (Disha) for one unit (Arun approves each unit)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const UNITS = ['Unit 21 - Magnetic Effects of Current','Unit 22 - Electromagnetic Induction','Unit 23 - Alternating Current','Unit 24 - Ray Optics','Unit 25 - Wave Optics','Unit 26 - Dual Nature of Matter','Unit 27 - Atomic Physics','Unit 28 - Nuclear Physics','Unit 29 - Electromagnetic Waves','Unit 30 - Semiconductors','Unit 31 - Experimental Physics']
const base = () => sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Disha JEE Main %')
const { count: before } = await base().eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Disha JEE Main %').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: pub } = await base().eq('is_published', true)
const { count: left } = await base().eq('is_published', false)
console.log('DONE published', data.length, 'total published', pub, 'drafts left', left, data.map(d => d.qid).sort().join(','))
