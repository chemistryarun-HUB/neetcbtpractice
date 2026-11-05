import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const items = JSON.parse(fs.readFileSync('scripts/phy-upload/data.json', 'utf8'))
const recs = items.map(i => i.rec)
const { data: ex, error: e1 } = await sb.from('questions').select('qid').in('qid', recs.map(r => r.qid))
if (e1) { console.error(e1); process.exit(1) }
console.log('already in DB:', ex.length)
if (ex.length) { console.error('STOP: some qids exist', ex.map(x => x.qid)); process.exit(1) }
const groups = {}; for (const r of recs) (groups[r.question_type] ||= []).push(r)
for (const g of Object.values(groups)) { const { error } = await sb.from('questions').insert(g); if (error) { console.error(error); process.exit(1) } }
console.log('inserted', recs.length)
const { data: after } = await sb.from('questions').select('qid, unit, level, is_published, difficulty_level').in('qid', recs.map(r => r.qid))
console.log('DONE', after.length, JSON.stringify(after.map(a => [a.qid, a.level, a.is_published, a.difficulty_level])))
