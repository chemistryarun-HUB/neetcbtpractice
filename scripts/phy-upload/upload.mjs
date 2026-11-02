import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const recs = JSON.parse(fs.readFileSync('scripts/phy-upload/unit02.json', 'utf8'))
const { data: ex, error: e1 } = await sb.from('questions').select('qid').in('qid', recs.map(r => r.qid))
if (e1) { console.error(e1); process.exit(1) }
console.log('already in DB:', ex.length)
if (ex.length) { console.error('STOP: some qids exist', ex.map(x => x.qid)); process.exit(1) }
const groups = {}; for (const r of recs) (groups[r.question_type] ||= []).push(r)
for (const g of Object.values(groups)) { const { error } = await sb.from('questions').insert(g); if (error) { console.error(error); process.exit(1) } }
const { data: after } = await sb.from('questions').select('qid, level, is_published, question_type').eq('subject', 'Physics').like('qid', 'NPU02%').gte('qid', 'NPU02111')
const c = {}; for (const q of after) { const k = `L${q.level} ${q.question_type} published=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('INSERTED', after.length, c)
