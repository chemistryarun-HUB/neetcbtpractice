import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: rows, error } = await sb.from('questions').select('qid, question_tag, tag_locked').eq('subject', 'Chemistry').ilike('question_tag', 'RE-NEET-%')
if (error) { console.error(error); process.exit(1) }
console.log('found', JSON.stringify(rows))
let n = 0
for (const r of rows) {
  if (r.tag_locked) { console.log('skip locked', r.qid); continue }
  const t = r.question_tag.replace(/^RE-NEET-/i, 'NEET-')
  const { data, error: e } = await sb.from('questions').update({ question_tag: t }).eq('qid', r.qid).select('qid, question_tag')
  if (e || !data.length) { console.error('update', r.qid, e); process.exit(1) }
  console.log(r.qid, r.question_tag, '->', t); n++
}
console.log('tags changed:', n)
