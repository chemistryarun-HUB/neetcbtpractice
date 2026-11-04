import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: rows, error } = await sb.from('questions').select('qid, question_tag, tag_locked').eq('subject', 'Chemistry').like('unit', 'Unit 19 -%').order('qid')
if (error) { console.error(error); process.exit(1) }
const kinds = {}; for (const r of rows) { const k = (r.question_tag || '(empty)').replace(/\d{4}/g, 'YYYY'); kinds[k] = (kinds[k] || 0) + 1 }
console.log('rows', rows.length, 'TAG KINDS', JSON.stringify(kinds))
let n = 0, skipped = []
for (const r of rows) {
  const t = (r.question_tag || '').trim()
  const m = t.match(/^JEE[\s-]*\(?\s*MAIN\s*\)?[\s-]*(\d{4})$/i)
  if (!m) { if (/jee/i.test(t) && !/^IIT-/i.test(t)) skipped.push(`${r.qid}:${t}`); continue }
  const to = `JEE(Main) ${m[1]}`
  if (to === t) continue
  if (r.tag_locked) { skipped.push(`${r.qid}:locked:${t}`); continue }
  const { error: e } = await sb.from('questions').update({ question_tag: to }).eq('qid', r.qid)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++; if (n <= 4) console.log(r.qid, t, '->', to)
}
console.log('changed', n, 'NOT changed', JSON.stringify(skipped))
