import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const ids = ["NPU02010", "NPU02011", "NPU02015", "NPU02022", "NPU02024", "NPU02025", "NPU02030", "NPU02034", "NPU02049", "NPU02060", "NPU02061", "NPU02083", "NPU02086", "NPU02090", "NPU02093", "NPU02097", "NPU02101", "NPU02102", "NPU02103", "NPU02104", "NPU02106", "NPU02109", "NPU02116", "NPU02117", "NPU02118", "NPU02121", "NPU02124", "NPU02126", "NPU02127", "NPU02128", "NPU02132", "NPU02133", "NPU02135", "NPU02139", "NPU02141", "NPU02145", "NPU02146", "NPU02147"]
const { data: ex, error: e0 } = await sb.from('questions').select('qid, is_published').in('qid', ids)
if (e0 || ex.length !== ids.length) { console.error('lookup', e0, ex?.length); process.exit(1) }
if (ex.some(q => q.is_published)) { console.error('STOP published'); process.exit(1) }
const { data, error } = await sb.from('questions').update({ difficulty_level: 'Hard' }).in('qid', ids).eq('is_published', false).select('qid')
if (error || data.length !== ids.length) { console.error('update', error, data?.length); process.exit(1) }
console.log('SET HARD', data.length)
