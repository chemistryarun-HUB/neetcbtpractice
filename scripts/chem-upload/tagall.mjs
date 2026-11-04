import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const all = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, question_tag, tag_locked').eq('subject', 'Chemistry').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all.push(...data); if (data.length < 1000) break
}
const norm = (t) => {
  if (/^NCERT[\s\-_]*Example/i.test(t)) return 'NCERT Example'
  if (/^NCERT[\s\-_]*Intext/i.test(t)) return 'NCERT Intext'
  if (/^NTA[\s\-_]*Abh[ya]+s$/i.test(t) || /^NTAAb[\s\-_]*Q\d+$/i.test(t)) return 'NTA Abhyas'
  return null
}
const changed = [], locked = []
for (const r of all) {
  const t = (r.question_tag || '').trim(), to = norm(t)
  if (!to || to === t) continue
  if (r.tag_locked) { locked.push(`${r.qid}:${t}`); continue }
  const { error } = await sb.from('questions').update({ question_tag: to }).eq('qid', r.qid)
  if (error) { console.error(r.qid, error); process.exit(1) }
  changed.push([r.qid, t, to])
}
const map = {}; for (const [, f, t] of changed) { const k = f.replace(/\d/g, '#') + ' -> ' + t; map[k] = (map[k] || 0) + 1 }
console.log('changed', changed.length, JSON.stringify(map))
console.log('LOCKED', JSON.stringify(locked))
