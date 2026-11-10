import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const F = 'qid.like.NPU13%,qid.like.NPU14%,qid.like.NPU15%'
const { data: rows, error } = await sb.from('questions').select('qid, is_published').or(F).eq('subject', 'Physics')
if (error) { console.error(error); process.exit(1) }
console.log('found', rows.length, 'already published', rows.filter(r => r.is_published).length)
const { data, error: e2 } = await sb.from('questions').update({ is_published: true }).or(F).eq('subject', 'Physics').eq('is_published', false).select('qid')
if (e2) { console.error(e2); process.exit(1) }
console.log('published now', data.length)
const { data: after } = await sb.from('questions').select('qid, is_published').or(F).eq('subject', 'Physics')
console.log('DONE total', after.length, 'published', after.filter(r => r.is_published).length)
