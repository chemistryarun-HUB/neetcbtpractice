import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const qid = 'NPU07052'
const path = `physics/u07/${qid}_${Date.now()}.png`
const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/phy-upload/img/${qid}.png`), { contentType: 'image/png' })
if (error) { console.error(error); process.exit(1) }
const url = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
const { data, error: e2 } = await sb.from('questions').update({ question_image: url }).eq('qid', qid).eq('subject', 'Physics').select('qid, is_published')
if (e2 || data.length !== 1) { console.error(e2, data); process.exit(1) }
console.log('DONE', JSON.stringify(data), url)
