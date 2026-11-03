import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const T = { NCU19289: ['AIIMS-2003', 'AIIMS-2016'], NCU19295: ['AIIMS-2006', 'AIIMS-2015'], NCU19296: ['AIIMS-2006', 'AIIMS-2015'], NCU19308: ['AIIMS-1998', 'AIIMS-2016'] }
for (const [q, [from, to]] of Object.entries(T)) {
  const { data, error } = await sb.from('questions').update({ question_tag: to }).eq('qid', q).eq('question_tag', from).select('qid, question_tag')
  if (error || !data.length) { console.error('STOP', q, error); process.exit(1) }
  console.log(q, from, '->', data[0].question_tag)
}
