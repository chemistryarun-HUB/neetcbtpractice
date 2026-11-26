// One-off: publish NCERT Exemplar Physics drafts for approved units (Arun approves each unit) (run: Units 26-30 + all leftover Exemplar drafts)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const base = () => sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', 'Physics').like('source', 'NCERT Exemplar %')
const { count: before } = await base().eq('is_published', false)
console.log('drafts before', before)
const { data, error } = await sb.from('questions').update({ is_published: true }).eq('subject', 'Physics').like('source', 'NCERT Exemplar %').eq('is_published', false).select('qid')
if (error) { console.error(error); process.exit(1) }
const { count: pub } = await base().eq('is_published', true)
const { count: left } = await base().eq('is_published', false)
console.log('DONE published', data.length, 'total published', pub, 'drafts left', left, data.map(d => d.qid).sort().join(','))
// report (no change): other unpublished Physics questions, grouped by unit and source prefix
const { data: other } = await sb.from('questions').select('qid,unit,source').eq('subject', 'Physics').eq('is_published', false).limit(5000)
const g = {}
for (const q of other || []) { const k = (q.unit || '?') + ' | ' + String(q.source || '').split(' Q.No')[0].replace(/Unit-\d+/, 'Unit-NN'); g[k] = (g[k] || 0) + 1 }
console.log('OTHER PHYSICS DRAFTS', (other || []).length)
for (const [k, v] of Object.entries(g).sort()) console.log(v, k)
for (const q of (other || []).slice(0, 60)) console.log('D', q.qid, q.source)
