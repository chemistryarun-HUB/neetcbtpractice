// One-off: insert Biology Unit 19 (NBU19001-106) as UNPUBLISHED drafts, with diagram images.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const dir = new URL('./u19/', import.meta.url)
const recs = JSON.parse(readFileSync(new URL('records.json', dir)))
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const qids = recs.map(r => r.row.qid)
const { data, error } = await sb.from('questions').select('qid').in('qid', qids)
if (error) throw error
if (data.length) { console.log('ABORT: already exist:', data.map(r => r.qid).join(',')); process.exit(1) }
let up = 0
for (const { row, images } of recs) {
  for (const [col, file] of Object.entries(images)) {
    const path = `bio_${file.replace('.png', '')}_${Math.random().toString(36).slice(2, 8)}.png`
    const { error: e } = await sb.storage.from('question-images').upload(path, readFileSync(new URL(`images/${file}`, dir)), { contentType: 'image/png', upsert: false })
    if (e) throw new Error(`${file}: ${e.message}`)
    row[col] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
    up++
  }
}
console.log('images uploaded', up)
const { error: e2 } = await sb.from('questions').insert(recs.map(r => r.row))
if (e2) throw e2
const { count } = await sb.from('questions').select('qid', { count: 'exact', head: true }).eq('subject', 'Biology').in('qid', qids)
console.log('INSERTED', count)
