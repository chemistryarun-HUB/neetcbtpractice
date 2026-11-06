import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const recs = JSON.parse(fs.readFileSync('scripts/chem-upload/upload.json', 'utf8'))
const { data: ex, error: e1 } = await sb.from('questions').select('qid, level').like('qid', 'NCU10%')
if (e1) { console.error(e1); process.exit(1) }
console.log('existing NCU10 rows:', ex.length)
if (ex.length !== 165 || ex.some(x => x.qid >= 'NCU10166')) { console.error('STOP: unexpected existing Unit 10 rows', ex.length, ex.slice(-5).map(x => x.qid + '/L' + x.level)); process.exit(1) }
const { data: ex2 } = await sb.from('questions').select('qid').in('qid', recs.map(r => r.qid))
if (ex2.length) { console.error('STOP: qids exist', ex2.map(x => x.qid)); process.exit(1) }
const groups = {}
for (const r of recs) { const k = Object.keys(r).sort().join(','); (groups[k] ||= []).push(r) }
for (const g of Object.values(groups)) { const { error } = await sb.from('questions').insert(g); if (error) { console.error(error); process.exit(1) } }
const { data: after } = await sb.from('questions').select('qid, level, is_published, question_type').like('qid', 'NCU10%')
const c = {}; for (const q of after) { const k = `L${q.level} ${q.question_type} published=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('NCU10 rows now', after.length, c, 'first', after.map(a => a.qid).sort()[0], 'last', after.map(a => a.qid).sort().pop())
