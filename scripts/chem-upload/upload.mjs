import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const recs = JSON.parse(fs.readFileSync('scripts/chem-upload/upload.json', 'utf8'))
const { data: ex, error: e1 } = await sb.from('questions').select('qid').in('qid', recs.map(r => r.qid))
if (e1) { console.error(e1); process.exit(1) }
console.log('already in DB:', ex.length)
if (ex.length) { console.error('STOP: some qids exist', ex.map(x => x.qid)); process.exit(1) }
const { count } = await sb.from('questions').select('qid', { count: 'exact', head: true }).eq('subject', 'Chemistry').like('unit', 'Unit 19 -%')
console.log('existing Unit 19 rows:', count)
const urls = {}
async function up(name) {
  if (urls[name]) return urls[name]
  const buf = fs.readFileSync(`scripts/chem-upload/img/${name}.png`)
  const path = `ncu19/${name}_${Date.now()}.png`
  const { error } = await sb.storage.from('question-images').upload(path, buf, { contentType: 'image/png', upsert: false })
  if (error) { console.error('img', name, error); process.exit(1) }
  return (urls[name] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl)
}
for (const r of recs) {
  if (r._qimg) r.question_image = await up(r._qimg)
  if (r._oimg) for (let i = 0; i < 4; i++) r[`option${i + 1}_image`] = await up(r._oimg[i])
  if (r._bimg) for (let i = 0; i < r._bimg.length; i++) r[`col_b${i + 1}_image`] = await up(r._bimg[i])
  delete r._qimg; delete r._oimg; delete r._bimg
}
console.log('images uploaded:', Object.keys(urls).length)
const groups = {}
for (const r of recs) { const k = Object.keys(r).sort().join(','); (groups[k] ||= []).push(r) }
for (const g of Object.values(groups)) { const { error } = await sb.from('questions').insert(g); if (error) { console.error(error); process.exit(1) } }
const { data: after } = await sb.from('questions').select('qid, level, is_published, question_type, option1_image, question_image').like('qid', 'NCU19%')
const c = {}; for (const q of after) { const k = `L${q.level} ${q.question_type} published=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('NCU19 rows now', after.length, c, 'with opt images', after.filter(q => q.option1_image).length, 'with q image', after.filter(q => q.question_image).length)
