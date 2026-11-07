// One-off: insert Biology Units 11-18 as UNPUBLISHED drafts (with diagram images), then apply
// guarded updates to Units 1-10 (Match the Column structure + sub/superscript text fixes).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const dir = new URL('./u11/', import.meta.url)
const recs = JSON.parse(readFileSync(new URL('records.json', dir)))
const upds = JSON.parse(readFileSync(new URL('updates.json', dir)))
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const qids = recs.map(r => r.row.qid)
for (let i = 0; i < qids.length; i += 200) {
  const { data, error } = await sb.from('questions').select('qid').in('qid', qids.slice(i, i + 200))
  if (error) throw error
  if (data.length) { console.log('ABORT: already exist:', data.map(r => r.qid).join(',')); process.exit(1) }
}
let up = 0
for (const { row, images } of recs) {
  for (const [col, file] of Object.entries(images)) {
    const path = `bio_${file.replace('.png', '')}_${Math.random().toString(36).slice(2, 8)}.png`
    const { error } = await sb.storage.from('question-images').upload(path, readFileSync(new URL(`images/${file}`, dir)), { contentType: 'image/png', upsert: false })
    if (error) throw new Error(`${file}: ${error.message}`)
    row[col] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
    up++
  }
}
console.log('images uploaded', up)
const rows = recs.map(r => ({ mtc_label_a: 'num', mtc_label_b: 'lower_pu', ...r.row }))
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await sb.from('questions').insert(rows.slice(i, i + 200))
  if (error) throw error
}
const { count } = await sb.from('questions').select('qid', { count: 'exact', head: true }).eq('subject', 'Biology').in('qid', qids)
console.log('INSERTED', count)

// guarded updates
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const norm = s => (s ?? '').replace(/\s+/g, ' ').trim()
let done = 0; const skipped = []
for (const u of upds) {
  const { data, error } = await sb.from('questions').select('qid,question,option1,option2,option3,option4,content_locked,medium,question_type').eq('qid', u.qid)
  if (error) throw error
  const cur = data[0]
  if (!cur) { skipped.push(u.qid + ':missing'); continue }
  if (cur.content_locked) { skipped.push(u.qid + ':locked'); continue }
  const copts = [cur.option1, cur.option2, cur.option3, cur.option4].map(norm)
  if (norm(cur.question) !== norm(u.guard.question) || !eq(copts, u.guard.options.map(norm))) { skipped.push(u.qid + ':changed'); continue }
  const { error: e2 } = await sb.from('questions').update(u.patch).eq('qid', u.qid)
  if (e2) throw new Error(u.qid + ' ' + e2.message)
  done++
}
console.log('UPDATED', done, 'of', upds.length)
console.log('SKIPPED', skipped.length, skipped.join(' '))
