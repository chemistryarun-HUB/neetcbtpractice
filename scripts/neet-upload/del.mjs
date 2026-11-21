// One-off: delete AIIMS Unit-30 transistor drafts (Arun 2026-11-21: transistor = * like NEET Unit 30)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const nos = [1, 6, 9, 14, 16, 20, 22, 27, 30, 35, 37, 38, 42, 47, 50]
const src = nos.map(n => `AIIMS Unit-30 Q.No. ${n}`)
const { data, error } = await sb.from('questions').delete().in('source', src).eq('is_published', false).select('qid, source')
if (error) { console.error(error); process.exit(1) }
for (const r of data) console.log('DEL', r.qid, r.source)
console.log('DONE deleted', data.length)
