// One-off: Physics Unit 32 Experimental Physics -> Unit 31 (Arun 2026-11-21, Communication System removed)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('id, qid, unit').eq('subject', 'Physics').eq('unit', 'Unit 32 - Experimental Physics')
if (error) { console.error(error); process.exit(1) }
let n = 0
for (const r of data) {
  const qid = r.qid.replace(/^NPU32/, 'NPU31')
  const { error: e } = await sb.from('questions').update({ unit: 'Unit 31 - Experimental Physics', qid }).eq('id', r.id)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++
}
const { count: left } = await sb.from('questions').select('*', { count: 'exact', head: true }).like('unit', 'Unit 32%').eq('subject', 'Physics')
const { data: now } = await sb.from('questions').select('qid').eq('unit', 'Unit 31 - Experimental Physics').order('qid')
console.log('DONE moved', n, 'left in 32', left, 'unit31', now.length, now[0]?.qid, now.at(-1)?.qid)
