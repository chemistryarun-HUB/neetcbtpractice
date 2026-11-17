import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { old } = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const out = (o) => { fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(o, null, 1)); console.log('RESULT', JSON.stringify(o)) }
const qid = 'NCU22050', ts = Date.now()
const { data: [r] } = await sb.from('questions').select('*').eq('qid', qid)
const drift = Object.keys(old).filter(f => r[f] !== old[f])
if (drift.length) { out({ abort: 'drift', drift }); process.exit(0) }
const u = {}
for (let i = 1; i <= 4; i++) {
  const path = `ncu22/${qid}_option${i}_image_${ts}.png`
  const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/o${i}.png`), { contentType: 'image/png', upsert: false })
  if (up.error) { out({ abort: 'upload', err: up.error.message }); process.exit(0) }
  u[`option${i}_image`] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const { error } = await sb.from('questions').update(u).eq('qid', qid)
const { data: [n] } = await sb.from('questions').select('*').eq('qid', qid)
const bad = Object.keys(u).filter(f => n[f] !== u[f])
if (n.is_published !== r.is_published || n.content_locked !== r.content_locked) bad.push('lock/publish')
out({ error: error?.message, updated: !bad.length, bad, u, is_published: n.is_published, content_locked: n.content_locked })
