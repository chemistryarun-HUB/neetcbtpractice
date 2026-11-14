import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { payload, old, img } = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
const ids = Object.keys(payload)
const rows = {}
for (let i = 0; i < ids.length; i += 80) {
  const { data, error } = await sb.from('questions').select('*').in('qid', ids.slice(i, i + 80))
  if (error) { console.error(error); process.exit(1) }
  for (const r of data) rows[r.qid] = r
}
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const backup = [], skipped = [], done = [], failed = []
const ts = Date.now()
for (const qid of ids) {
  const r = rows[qid]
  if (!r) { skipped.push([qid, 'missing']); continue }
  if (r.content_locked) { skipped.push([qid, 'locked']); continue }
  const drift = Object.keys(old[qid]).filter(f => (r[f] ?? null) !== (old[qid][f] ?? null))
  if (drift.length) { skipped.push([qid, 'changed-since-dump:' + drift.join(',')]); continue }
  const upd = { ...payload[qid] }
  if (img[qid]) {
    const path = `ncu04/${qid}_${ts}.png`
    const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${img[qid]}`), { contentType: 'image/png', upsert: false })
    if (up.error) { failed.push([qid, 'upload', up.error.message]); continue }
    upd.question_image = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
  }
  backup.push(r)
  const { error } = await sb.from('questions').update(upd).eq('qid', qid)
  if (error) { failed.push([qid, 'update', error.message]); continue }
  done.push(qid)
}
fs.writeFileSync('scripts/chem-upload/dump/u4-backup.json', JSON.stringify(backup, null, 1))
// verify
const bad = []
for (const qid of done) {
  const { data: [n] } = await sb.from('questions').select('*').eq('qid', qid)
  for (const [f, v] of Object.entries(payload[qid])) if (n[f] !== v) bad.push([qid, f])
  if (n.content_locked !== rows[qid].content_locked || n.is_published !== rows[qid].is_published) bad.push([qid, 'lock/publish changed'])
}
const result = { done: done.length, skipped, failed, bad }
fs.writeFileSync('scripts/chem-upload/dump/u4-result.json', JSON.stringify(result, null, 1))
console.log('RESULT', JSON.stringify(result))
