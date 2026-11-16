import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { insert, payload, old, img } = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
const ts = Date.now()
async function upload(qid, field, file) {
  const path = `ncu17/${qid}_${field}_${ts}.png`
  const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${file}`), { contentType: 'image/png', upsert: false })
  if (up.error) throw new Error(`upload ${qid} ${field}: ${up.error.message}`)
  return sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const res = { inserted: [], updated: [], skipped: [], failed: [], bad: [] }
const r1 = await sb.from('questions').select('qid,unit').like('qid', 'NCU17%')
const r2 = await sb.from('questions').select('qid,unit').eq('unit', 'Unit 17 - Aldehydes, Ketones and Carboxylic Acids')
const preErr = r1.error || r2.error; const pre = [...(r1.data || []), ...(r2.data || [])]
if (preErr || (pre || []).length) { fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify({ abort: true, preErr, pre }, null, 1)); console.log('ABORT', preErr, pre); process.exit(0) }
// inserts
const { data: ex } = await sb.from('questions').select('qid').in('qid', insert.map(r => r.qid))
const exists = new Set((ex || []).map(r => r.qid))
for (const r0 of insert) {
  if (exists.has(r0.qid)) { res.skipped.push([r0.qid, 'exists']); continue }
  try {
    const r = { ...r0 }
    for (const [f, file] of Object.entries(img[r.qid] || {})) r[f] = await upload(r.qid, f, file)
    const { error } = await sb.from('questions').insert(r)
    if (error) { res.failed.push([r.qid, error.message]); continue }
    res.inserted.push(r.qid)
  } catch (e) { res.failed.push([r0.qid, e.message]) }
}
// updates
const ids = Object.keys(payload)
const { data: rows } = await sb.from('questions').select('*').in('qid', ids)
const by = Object.fromEntries(rows.map(r => [r.qid, r]))
fs.writeFileSync('scripts/chem-upload/dump/upd-backup.json', JSON.stringify(rows, null, 1))
for (const qid of ids) {
  const r = by[qid]
  if (!r) { res.skipped.push([qid, 'missing']); continue }
  if (r.content_locked) { res.skipped.push([qid, 'locked']); continue }
  const drift = Object.keys(old[qid]).filter(f => (r[f] ?? null) !== (old[qid][f] ?? null))
  if (drift.length) { res.skipped.push([qid, 'drift:' + drift.join(',')]); continue }
  try {
    const u = { ...payload[qid] }
    for (const [f, file] of Object.entries(img[qid] || {})) u[f] = await upload(qid, f, file)
    const { error } = await sb.from('questions').update(u).eq('qid', qid)
    if (error) { res.failed.push([qid, error.message]); continue }
    res.updated.push(qid)
    const { data: [n] } = await sb.from('questions').select('*').eq('qid', qid)
    for (const [f, v] of Object.entries(u)) if (n[f] !== v) res.bad.push([qid, f])
    if (n.is_published !== r.is_published || n.content_locked !== r.content_locked) res.bad.push([qid, 'lock/publish'])
  } catch (e) { res.failed.push([qid, e.message]) }
}
// verify inserts
const { data: chk } = await sb.from('questions').select('*').in('qid', insert.map(r => r.qid))
for (const r0 of insert) { const n = chk.find(x => x.qid === r0.qid); if (!n) { res.bad.push([r0.qid, 'missing']); continue }
  for (const [f, v] of Object.entries(r0)) if ((n[f] ?? null) !== (v ?? null)) res.bad.push([r0.qid, f])
  for (const f of Object.keys(img[r0.qid] || {})) if (!n[f]) res.bad.push([r0.qid, f + ' empty']) }
res.insertCheck = chk
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
console.log('RESULT', JSON.stringify({ ...res, insertCheck: chk.length }))
