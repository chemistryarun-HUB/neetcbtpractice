import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [q], error } = await sb.from('questions').select('*').eq('qid', 'NCU26003')
if (error || !q) { console.error(error); process.exit(1) }
if (q.correct_option !== 'option1' || !q.option1_image || !q.question_image) { console.error('GUARD', q.correct_option); process.exit(1) }
console.log('BACKUP', JSON.stringify(q))
const ts = Date.now()
const upd = {}
for (const i of [1, 2, 3, 4]) {
  const path = `ncu26/q03_o${i}_${ts}.png`
  const up = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/o${i}.png`), { contentType: 'image/png', upsert: false })
  if (up.error) { console.error(up.error); process.exit(1) }
  upd[`option${i}_image`] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const { error: e2 } = await sb.from('questions').update(upd).eq('qid', 'NCU26003')
if (e2) { console.error(e2); process.exit(1) }
const { data: [n] } = await sb.from('questions').select('qid,correct_option,content_locked,is_published,option1_image,option2_image,option3_image,option4_image').eq('qid', 'NCU26003')
console.log('DONE', JSON.stringify(n))
