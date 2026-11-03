import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { qid, set, imgs } = JSON.parse(fs.readFileSync('scripts/chem-upload/update.json', 'utf8'))
const { data: before, error: e0 } = await sb.from('questions').select('*').eq('qid', qid)
if (e0 || before.length !== 1) { console.error('STOP', e0, before); process.exit(1) }
console.log('BEFORE', JSON.stringify(before[0]))
const stamp = Date.now()
for (const [field, f] of Object.entries(imgs || {})) {
  const path = `ncu19/redraw/${f.replace('.png', '')}_${stamp}.png`
  const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${f}`), { contentType: 'image/png' })
  if (error) { console.error('img', f, error); process.exit(1) }
  set[field] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const { data, error } = await sb.from('questions').update(set).eq('qid', qid).select('qid, question_type, mtc_label_a, mtc_label_b, col_a1_image, col_b1, correct_option, question_image, is_published')
if (error || !data.length) { console.error('update failed', error, data); process.exit(1) }
console.log('after', data[0])
