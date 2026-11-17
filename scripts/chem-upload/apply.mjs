import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const out = (o) => { fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(o, null, 1)); console.log('RESULT', JSON.stringify(o)) }
const qid = 'NCU22050', ts = Date.now()
const old = { option1: null, option2: null, option3: null, option4: null, correct_option: 'option2',
  option1_image: 'https://vxoxaiekhxewvkpujuxu.supabase.co/storage/v1/object/public/question-images/ncu22/NCU22050_option1_image_1794908856780.png' }
const { data: [r] } = await sb.from('questions').select('*').eq('qid', qid)
fs.writeFileSync('scripts/chem-upload/dump/before.json', JSON.stringify(r, null, 1))
const drift = Object.keys(old).filter(f => (r[f] || null) !== (old[f] || null))
if (drift.length) { out({ abort: 'drift', drift, cur: Object.fromEntries(drift.map(f => [f, r[f]])) }); process.exit(0) }
const u = { option1: 'identical', option2: 'positional isomers', option3: 'positional isomers', option4: 'homologues', correct_option: 'option2' }
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
out({ error: error?.message, updated: !bad.length, bad, u })
