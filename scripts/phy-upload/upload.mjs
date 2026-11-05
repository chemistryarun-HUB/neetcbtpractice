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
const stamp = Date.now(); let n = 0
for (const it of items) {
  if (!it.imgs.length) continue
  const qid = it.rec.qid, set = {}
  for (const im of it.imgs) {
    const suf = im.slice(qid.length)
    const field = suf === '' ? 'question_image' : suf[0] === 'O' ? `option${suf[1]}_image` : suf[0] === 'A' ? `col_a${suf[1]}_image` : `col_b${suf[1]}_image`
    const path = `physics/u${qid.slice(3, 5)}/${im}_${stamp}.png`
    const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/phy-upload/img/${im}.png`), { contentType: 'image/png' })
    if (error) { console.error('img', im, error); process.exit(1) }
    set[field] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl; n++
  }
  const { data, error } = await sb.from('questions').update(set).eq('qid', qid).eq('is_published', false).select('qid')
  if (error || data.length !== 1) { console.error('update', qid, error, data?.length); process.exit(1) }
}
console.log('images set', n)
const { data: after } = await sb.from('questions').select('qid, unit, level, question_type, is_published').eq('subject', 'Physics').in('qid', recs.map(r => r.qid))
const c = {}; for (const q of after) { const k = `${q.unit.slice(0, 6)} L${q.level} ${q.question_type} pub=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('DONE', after.length, JSON.stringify(c, null, 1))
