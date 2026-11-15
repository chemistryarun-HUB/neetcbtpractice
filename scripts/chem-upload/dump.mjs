import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('qid,question,option1,option2,option3,option4,correct_option,question_tag,source,source_locked,tag_locked,content_locked,is_published,question_type,level,question_image').like('qid', 'NCU04%').lt('qid', 'NCU04098').order('qid')
if (error) { console.error(error); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/neet4.json', JSON.stringify(data, null, 1))
console.log('RESULT', data.length)
