import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const qid = 'NPU07074'
const path = `physics/u07/${qid}_${Date.now()}.png`
const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/phy-upload/img/${qid}.png`), { contentType: 'image/png' })
if (error) { console.error(error); process.exit(1) }
const url = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
const o = ['$6.5\\ \\text{m s}^{-1}$ and $6.3\\ \\text{m s}^{-1}$', '$3.2\\ \\text{m s}^{-1}$ and $6.3\\ \\text{m s}^{-1}$', '$3.2\\ \\text{m s}^{-1}$ and $12.6\\ \\text{m s}^{-1}$', '$6.5\\ \\text{m s}^{-1}$ and $3.2\\ \\text{m s}^{-1}$']
const upd = {
  question: 'Two particles of masses $M$ and $2M$, moving as shown, with speeds of $10\\ \\text{m/s}$ and $5\\ \\text{m/s}$, collide elastically at the origin. After the collision, they move along the indicated directions with speeds $v_1$ and $v_2$ respectively. The values of $v_1$ and $v_2$ are nearly',
  option1: o[0], option2: o[1], option3: o[2], option4: o[3], correct_option: o[0], question_image: url,
}
const { data, error: e2 } = await sb.from('questions').update(upd).eq('qid', qid).eq('subject', 'Physics').select('qid, is_published, correct_option')
if (e2 || data.length !== 1) { console.error(e2, data); process.exit(1) }
console.log('DONE', JSON.stringify(data), url)
