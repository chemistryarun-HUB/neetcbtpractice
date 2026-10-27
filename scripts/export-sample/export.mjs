// One-off: print the English Chemistry Unit 33 questions as JSON lines, so a
// Gujarati sample can be drafted from them. Reads only.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('*')
  .eq('subject', 'Chemistry').eq('medium', 'en').like('unit', 'Unit 33 -%')
  .eq('is_active', true).order('level').order('qid').limit(400)
if (error) { console.error(error); process.exit(1) }
const byLevel = {}
for (const q of data) byLevel[q.level] = (byLevel[q.level] || 0) + 1
console.log('COUNT', data.length, JSON.stringify(byLevel))
for (const q of data) console.log('ROW ' + Buffer.from(JSON.stringify(q)).toString('base64'))
