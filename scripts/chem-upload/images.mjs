import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const files = fs.readdirSync('scripts/chem-upload/img').filter(f => f.endsWith('.png')).sort()
const upd = {}
for (const f of files) {
  const m = f.match(/^(NCU19\d{3})(?:O(\d))?\.png$/); if (!m) { console.error('bad', f); process.exit(1) }
  const field = m[2] ? `option${m[2]}_image` : 'question_image'
  ;(upd[m[1]] ||= {})[field] = f
}
const qids = Object.keys(upd)
const { data: rows, error: e0 } = await sb.from('questions').select('qid, question_image, option1_image, option2_image, option3_image, option4_image, is_published').in('qid', qids)
if (e0 || rows.length !== qids.length) { console.error('STOP', e0, rows?.length); process.exit(1) }
for (const r of rows) for (const f of Object.keys(upd[r.qid])) if (!r[f]) { console.error('STOP: field empty before', r.qid, f); process.exit(1) }
fs.writeFileSync('/tmp/backup.json', JSON.stringify(rows)); console.log('backup', JSON.stringify(rows).length)
const stamp = Date.now(); let n = 0
for (const q of qids) {
  const set = {}
  for (const [field, f] of Object.entries(upd[q])) {
    const path = `ncu19/redraw/${f.replace('.png', '')}_${stamp}.png`
    const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${f}`), { contentType: 'image/png' })
    if (error) { console.error('img', f, error); process.exit(1) }
    set[field] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl; n++
  }
  const { data, error } = await sb.from('questions').update(set).eq('qid', q).select('qid')
  if (error || !data.length) { console.error('update', q, error); process.exit(1) }
  console.log(q, Object.keys(set).join(','))
}
console.log('images set:', n, 'questions:', qids.length)
console.log('OLD_URLS', JSON.stringify(rows))
