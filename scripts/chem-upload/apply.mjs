import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const res = {}
const { data: [a] } = await sb.from('questions').select('*').eq('qid', 'NCU03368'); res.before368 = a
if (a.option4 === 'A is false but R is true.' && a.correct_option === 'A is true but R is false.')
  res.e368 = (await sb.from('questions').update({ option4: 'Both A and R are false.', correct_option: 'Both A and R are false.' }).eq('qid', 'NCU03368')).error
const { data: [b] } = await sb.from('questions').select('*').eq('qid', 'NCU03660'); res.before660 = { o: [b.option1, b.option2, b.option3, b.option4], k: b.correct_option, src: b.source }
if (b.source === 'JIPMER EG Unit-03 Q.37' && b.option2 === '16') res.e660 = (await sb.from('questions').update({ correct_option: '16' }).eq('qid', 'NCU03660')).error
const ids = Array.from({ length: 79 }, (_, i) => 'NCU0' + (3595 + i))
res.pubErr = (await sb.from('questions').update({ is_published: true }).in('qid', ids).eq('is_published', false)).error
const { data: c } = await sb.from('questions').select('qid').in('qid', ids).eq('is_published', true); res.pubCount = c.length
const { data: [a2] } = await sb.from('questions').select('option4,correct_option,content_locked').eq('qid', 'NCU03368'); res.after368 = a2
const { data: [b2] } = await sb.from('questions').select('correct_option').eq('qid', 'NCU03660'); res.after660 = b2
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
