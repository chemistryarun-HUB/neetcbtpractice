// One-off: print the English Biology Unit 1 questions as JSON lines, so their
// Gujarati versions can be drafted from the live text. Reads only.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const cols = 'qid, subject, unit, level, topic, chapter_name, question_type, question, option1, option2, option3, option4, correct_option, difficulty_level, question_tag, source, is_active, is_published, question_image, option1_image, option2_image, option3_image, option4_image'
const { data, error } = await sb.from('questions').select(cols)
  .eq('subject', 'Biology').eq('medium', 'en').like('unit', 'Unit 1 -%').order('qid')
if (error) { console.error(error); process.exit(1) }
console.log('COUNT', data.length)
for (const q of data) console.log('ROW ' + Buffer.from(JSON.stringify(q)).toString('base64'))
