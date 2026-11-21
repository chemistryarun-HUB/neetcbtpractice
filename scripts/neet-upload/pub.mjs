// One-off: publish all AIIMS Physics PYQ drafts (Arun 2026-11-21 "live all")
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { count: before } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').like('source', 'AIIMS Unit-%').eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').like('source', 'AIIMS Unit-%').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: pub } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').like('source', 'AIIMS Unit-%').eq('is_published', true)
const { count: left } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').like('source', 'AIIMS Unit-%').eq('is_published', false)
console.log('DONE published', data.length, 'total published AIIMS', pub, 'drafts left', left)
