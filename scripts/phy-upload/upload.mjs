import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const stamp = Date.now()
for (const qid of ['NPU06108', 'NPU06114']) {
  const path = `physics/u06/${qid}_redraw_${stamp}.png`
  const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/phy-upload/img/${qid}.png`), { contentType: 'image/png' })
  if (error) { console.error(error); process.exit(1) }
  const url = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
  const { data, error: e2 } = await sb.from('questions').update({ question_image: url }).eq('qid', qid).eq('is_published', false).select('qid')
  if (e2 || data.length !== 1) { console.error(qid, e2, data?.length); process.exit(1) }
  console.log('replaced', qid)
}
