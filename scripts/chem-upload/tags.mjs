import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('qid, question_tag, tag_locked').like('qid', 'NCU19%')
if (error) { console.error(error); process.exit(1) }
const todo = data.filter(r => /^(JEE-ADV|IIT-JEE)-\d{4}$/.test(r.question_tag || ''))
console.log('NCU19 rows', data.length, 'to change', todo.length, 'locked', todo.filter(r => r.tag_locked).length)
for (const r of todo) {
  const t = 'IIT-' + r.question_tag.slice(-4)
  const { data: u, error: e } = await sb.from('questions').update({ question_tag: t }).eq('qid', r.qid).select('qid, question_tag')
  if (e || !u.length) { console.error('fail', r.qid, e); process.exit(1) }
  console.log(r.qid, r.question_tag, '->', u[0].question_tag)
}
