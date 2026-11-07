// One-off: insert Biology Units 2-10 (NBU02001...) as UNPUBLISHED questions, uploading diagram images first.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const dir = new URL('./u2to10/', import.meta.url)
const recs = JSON.parse(readFileSync(new URL('records.json', dir)))
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
const rows = recs.map(r => r.row)
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await sb.from('questions').insert(rows.slice(i, i + 200))
  if (error) throw error
}
const { count } = await sb.from('questions').select('qid', { count: 'exact', head: true }).eq('subject', 'Biology').in('qid', qids)
const { count: pub } = await sb.from('questions').select('qid', { count: 'exact', head: true }).in('qid', qids).eq('is_published', true)
console.log('INSERTED', count, 'published', pub)
