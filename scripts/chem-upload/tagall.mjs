import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const all = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, unit, question_tag, tag_locked, source, is_published, question').eq('subject', 'Chemistry').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all.push(...data); if (data.length < 1000) break
}
const ok = /^(JEE\(Main\) \d{4}|AIEEE \d{4}|IIT-\d{4}|NEET \d{4}|AIPMT \d{4}|AIIMS \d{4}|NCERT Exercise|NCERT Exemplar|NCERT Example|NCERT Intext|NTA Abhyas)$/
const out = []
for (const r of all) {
  const t = (r.question_tag || '').trim()
  if (ok.test(t)) continue
  const reason = !t ? 'Tag empty' : r.tag_locked ? 'Tag locked' : 'No year / other'
  out.push([r.qid, r.unit, t, reason, r.source || '', r.is_published ? 'Yes' : 'No', (r.question || '').replace(/\s+/g, ' ').slice(0, 90)])
}
console.log('ROWS', out.length)
console.log('JSONSTART' + JSON.stringify(out) + 'JSONEND')
