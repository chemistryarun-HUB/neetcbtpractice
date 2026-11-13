import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
// NCU27002 stem
const OLD2 = 'Write the structural formula of the major product:\nC₆H₆ + (CH₃)₂CHCH₂Cl —AlCl₃→ ?'
const { data: [r2], error: e2 } = await sb.from('questions').select('qid,question,content_locked').eq('qid', 'NCU27002')
if (e2 || !r2 || r2.question !== OLD2) { console.error('STOP 27002', e2, JSON.stringify(r2)); process.exit(1) }
console.log('BACKUP', JSON.stringify(r2))
const u2 = await sb.from('questions').update({ question: 'Write the structural formula of the major product:\n$\\ce{C6H6 + (CH3)2CHCH2Cl ->[AlCl3] ?}$' }).eq('qid', 'NCU27002').select('qid,question')
if (u2.error) { console.error(u2.error); process.exit(1) }
console.log('DONE 27002', JSON.stringify(u2.data))
// NCU27014 images
const { data: [r], error } = await sb.from('questions').select('qid,question,question_image,option1_image,option2_image,option3_image,option4_image,correct_option,content_locked').eq('qid', 'NCU27014')
if (error || !r || !r.question_image || r.correct_option !== 'option4') { console.error('STOP 27014', error, JSON.stringify(r)); process.exit(1) }
console.log('BACKUP', JSON.stringify(r))
const t = Date.now(), upd = {}
for (const [col, f] of [['question_image', 'q'], ['option1_image', 'o1'], ['option2_image', 'o2'], ['option3_image', 'o3'], ['option4_image', 'o4']]) {
  const path = `ncu27/q14_${f}_${t}.png`
  const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${f}.png`), { contentType: 'image/png', upsert: false })
  if (up.error) { console.error(up.error); process.exit(1) }
  upd[col] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const { data, error: e } = await sb.from('questions').update(upd).eq('qid', 'NCU27014').select('qid,correct_option,content_locked,is_published')
if (e) { console.error(e); process.exit(1) }
console.log('DONE 27014', JSON.stringify(data))
for (const k of Object.keys(upd)) { const c = await fetch(upd[k]); console.log('FETCH', k, c.status, c.headers.get('content-type')) }
