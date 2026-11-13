import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('*').in('qid', ['NCU27001', 'NCU27002', 'NCU27014'])
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump/img', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/r.json', JSON.stringify(data, null, 1))
for (const q of data) for (const k of ['question_image', 'option1_image', 'option2_image', 'option3_image', 'option4_image']) {
  const u = q[k]; if (!u) continue
  const r = await fetch(u); const buf = Buffer.from(await r.arrayBuffer())
  const ext = (u.split('.').pop() || 'png').split('?')[0].slice(0, 5)
  fs.writeFileSync(`scripts/chem-upload/dump/img/${q.qid}_${k.replace('_image', '')}.${ext}`, buf)
  console.log(q.qid, k, r.status, buf.length)
}
