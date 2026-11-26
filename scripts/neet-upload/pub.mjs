// One-off: publish leftover Mathongo Physics drafts in Units 3-5 (Arun approved 2026-11-26) (run: Mathongo U3-5)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const UNITS = ['Unit 3 - Motion In One Dimension','Unit 4 - Motion In Two Dimensions','Unit 5 - Laws of Motion']
const base = () => sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Mathongo Phy %')
const { count: before } = await base().eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').in('unit', UNITS).like('source', 'Mathongo Phy %').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: left } = await base().eq('is_published', false)
const { count: other } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').eq('is_published', false)
console.log('DONE published', data.length, 'drafts left', left, 'all physics drafts left', other)
