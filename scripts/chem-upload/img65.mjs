import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('qid,question,question_image,content_locked').eq('qid', 'NCU26065')
if (error || !r || !r.question_image || !r.question.startsWith('The major product')) { console.error('STOP', error, r); process.exit(1) }
console.log('BACKUP', JSON.stringify({ qid: r.qid, question_image: r.question_image, content_locked: r.content_locked }))
const path = `ncu26/q65_${Date.now()}.png`
const up = await sb.storage.from('question-images').upload(path, fs.readFileSync('scripts/chem-upload/img/q65.png'), { contentType: 'image/png', upsert: false })
if (up.error) { console.error(up.error); process.exit(1) }
const url = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
const { data, error: e } = await sb.from('questions').update({ question_image: url }).eq('qid', 'NCU26065').select('qid, question_image, content_locked, is_published')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
const chk = await fetch(url); console.log('FETCH', chk.status, chk.headers.get('content-type'))
