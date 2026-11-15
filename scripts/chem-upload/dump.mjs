import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const cols = 'qid,unit,chapter_name,level,question,option1,option2,option3,option4,correct_option,question_tag,source,source_locked,tag_locked,content_locked,is_published,question_type,question_image,medium'
const { data, error } = await sb.from('questions').select(cols).like('qid', 'NCU04%').gt('qid', 'NCU04310').order('qid')
if (error) { console.error(error); process.exit(1) }
const { data: d2, error: e2 } = await sb.from('questions').select('qid,question_tag,source,unit,chapter_name').eq('subject', 'Chemistry').eq('unit', 4).not('qid', 'like', 'NCU04%')
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/neet4b.json', JSON.stringify(data, null, 1))
fs.writeFileSync('scripts/chem-upload/dump/neet4c.json', JSON.stringify(d2 || e2, null, 1))
console.log('RESULT', data.length, (d2 || []).length)
