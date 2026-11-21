// One-off: publish the 2068 ExamGOAL NEET Physics PYQ drafts (source 'NEET Unit-NN Q.No. n', qid NPU*). Keys untouched.
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, source, is_published, correct_option').like('qid', 'NPU%').like('source', 'NEET Unit-% Q.No. %').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows.push(...data); if (data.length < 1000) break
}
const todo = rows.filter(r => !r.is_published && /^NEET Unit-\d\d[^Q]* Q\.No\. \d+$/.test(r.source))
console.log('rows', rows.length, 'to publish', todo.length)
if (todo.length !== 2068) { console.error('expected 2068, abort'); process.exit(1) }
for (const q of ['NPU09212','NPU12154','NPU12157','NPU17289','NPU23175']) console.log(q, todo.find(r => r.qid === q)?.correct_option)
let n = 0
for (let i = 0; i < todo.length; i += 200) {
  const ids = todo.slice(i, i + 200).map(r => r.qid)
  const { data, error } = await sb.from('questions').update({ is_published: true }).in('qid', ids).eq('is_published', false).select('qid')
  if (error) { console.error(error); process.exit(1) }
  n += data.length
}
console.log('published', n)
const per = {}; for (const r of todo) per[r.qid.slice(0, 5)] = (per[r.qid.slice(0, 5)] || 0) + 1
console.log(JSON.stringify(per))
