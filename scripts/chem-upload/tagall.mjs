import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const want = { NCU23311: 'IIT-1997', NCU24012: 'IIT-2006', NCU24028: 'JEE(Main) 2017', NCU26080: 'IIT-1983', NCU27086: 'JEE(Main) 2018' }
for (const [qid, tag] of Object.entries(want)) {
  const { data: before, error: e1 } = await sb.from('questions').select('qid, question_tag, tag_locked').eq('qid', qid).single()
  if (e1) { console.error(qid, e1); process.exit(1) }
  const { error } = await sb.from('questions').update({ question_tag: tag }).eq('qid', qid)
  if (error) { console.error(qid, error); process.exit(1) }
  const { data: after } = await sb.from('questions').select('question_tag, tag_locked').eq('qid', qid).single()
  console.log(qid, JSON.stringify(before.question_tag), '->', JSON.stringify(after.question_tag), 'locked', after.tag_locked)
}
