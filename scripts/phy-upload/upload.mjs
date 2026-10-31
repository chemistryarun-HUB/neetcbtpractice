import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const recs = JSON.parse(fs.readFileSync('scripts/phy-upload/unit02.json', 'utf8'))
const { data: ex, error: e1 } = await sb.from('questions').select('qid').in('qid', recs.map(r => r.qid))
if (e1) { console.error(e1); process.exit(1) }
console.log('already in DB:', ex.length)
if (ex.length) { console.error('STOP: some qids exist', ex.map(x => x.qid)); process.exit(1) }
const { error } = await sb.from('questions').insert(recs)
if (error) { console.error(error); process.exit(1) }
const { data: after } = await sb.from('questions').select('qid, level, is_published').eq('subject', 'Physics').like('qid', 'NPU02%')
const c = {}; for (const q of after) { const k = `L${q.level} published=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('INSERTED', after.length, c)
