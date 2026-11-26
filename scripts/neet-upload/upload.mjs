// One-off: insert NCERT Exemplar Physics drafts (XI Ch-7,8,9), unit-wise; qids continue each unit's sequence.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const items = JSON.parse(fs.readFileSync('scripts/neet-upload/data.json', 'utf8'))
const units = [...new Set(items.map(i => i.unitno))]
const next = {}
for (const u of units) {
  const p = `NPU${String(u).padStart(2, '0')}`
  let all = [], from = 0
  for (;;) {
    const { data, error } = await sb.from('questions').select('qid').like('qid', `${p}%`).range(from, from + 999)
    if (error) { console.error(error); process.exit(1) }
    all = all.concat(data); if (data.length < 1000) break; from += 1000
  }
  const nums = all.map(r => r.qid).filter(q => /^NPU\d{5}$/.test(q)).map(q => +q.slice(5))
  next[u] = (nums.length ? Math.max(...nums) : 0) + 1
  console.log(p, 'existing', nums.length, 'max', next[u] - 1)
}
// skip items already inserted (same source text) so a re-run is safe
async function allRows(cols) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('questions').select(cols).like('source', 'NCERT Exemplar %').order('qid').range(from, from + 999)
    if (error) { console.error(error); process.exit(1) }
    out.push(...data); if (data.length < 1000) return out
  }
}
const done = await allRows('qid, source')
const seen = new Set(done.map(d => d.source))
const todo = items.filter(i => !seen.has(i.rec.source))
console.log('items', items.length, 'already in DB', items.length - todo.length)
for (const it of todo) {
  const u = it.unitno, n = next[u]++
  if (n > 999) { console.error('qid overflow unit', u); process.exit(1) }
  it.rec.qid = `NPU${String(u).padStart(2, '0')}${String(n).padStart(3, '0')}`
}
for (let i = 0; i < todo.length; i += 200) {
  const { error } = await sb.from('questions').insert(todo.slice(i, i + 200).map(t => t.rec))
  if (error) { console.error(error); process.exit(1) }
}
console.log('inserted', todo.length)
const stamp = Date.now(); let n = 0
for (const it of todo) {
  if (!it.imgs.length) continue
  const qid = it.rec.qid, set = {}
  for (const suf of it.imgs) {
    const field = suf === '' ? 'question_image' : suf[0] === 'O' ? `option${suf[1]}_image` : null
    if (!field) { console.error('bad suffix', it.key, suf); process.exit(1) }
    const path = `physics/u${qid.slice(3, 5)}/${qid}${suf}_${stamp}.png`
    const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/neet-upload/img/${it.key}${suf}.png`), { contentType: 'image/png' })
    if (error) { console.error('img', it.key, suf, error); process.exit(1) }
    set[field] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl; n++
  }
  const { data, error } = await sb.from('questions').update(set).eq('qid', qid).eq('is_published', false).select('qid')
  if (error || data.length !== 1) { console.error('update', qid, error, data?.length); process.exit(1) }
}
console.log('images set', n)
const map = todo.map(t => `${t.rec.qid}\t${t.rec.source}`)
console.log('MAP\n' + map.join('\n'))
const srcs = new Set(items.map(i => i.rec.source))
const all2 = await allRows('qid, unit, level, is_published, source')
const after = all2.filter(q => srcs.has(q.source))
const c = {}; for (const q of after) { const k = `${q.unit.split(' - ')[0]} L${q.level} pub=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('DONE', after.length, JSON.stringify(c))
