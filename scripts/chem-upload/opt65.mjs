import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('qid,question,option1,option2,option3,option4,option1_image,option2_image,option3_image,option4_image,correct_option,content_locked').eq('qid', 'NCU26065')
if (error || !r || !r.option1_image || !r.option4_image || !r.question.startsWith('The major product')) { console.error('STOP', error, r); process.exit(1) }
console.log('BACKUP', JSON.stringify(r))
const t = Date.now(), upd = {}
for (const i of [1, 2, 3, 4]) {
  const path = `ncu26/q65_opt${i}_${t}.png`
  const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/o${i}.png`), { contentType: 'image/png', upsert: false })
  if (up.error) { console.error(up.error); process.exit(1) }
  upd[`option${i}_image`] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const { data, error: e } = await sb.from('questions').update(upd).eq('qid', 'NCU26065').select('qid,option1_image,option2_image,option3_image,option4_image,correct_option,content_locked,is_published')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
for (const k of Object.keys(upd)) { const c = await fetch(upd[k]); console.log('FETCH', k, c.status, c.headers.get('content-type')) }
