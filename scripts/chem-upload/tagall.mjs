import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const all = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, unit, question_tag, tag_locked').eq('subject', 'Chemistry').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all.push(...data); if (data.length < 1000) break
}
const kinds = {}; for (const r of all) { const k = (r.question_tag || '(empty)').replace(/\d/g, '#'); kinds[k] = (kinds[k] || 0) + 1 }
console.log('rows', all.length, 'TAG KINDS', JSON.stringify(kinds))
const yr = (t) => { let m = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/); if (m) return '20' + m[3]; m = t.match(/(20\d{2}|19\d{2})/); return m ? m[1] : null }
const norm = (t) => {
  if (/^\s*(NEET|RE-?NEET|AIPMT|AIIMS|NCERT)/i.test(t)) return null
  if (/AIEEE/i.test(t) && !/IIT|ADV/i.test(t)) { const y = yr(t); return y ? `AIEEE ${y}` : null }
  if (/IIT|JEE[\s\-_(]*ADV|ADVANCED/i.test(t)) { const y = yr(t); return y ? `IIT-${y}` : null }
  if (/JEE[\s\-_(]*MAIN/i.test(t)) { const y = yr(t); return y ? `JEE(Main) ${y}` : null }
  return null
}
const changed = [], skipped = []
for (const r of all) {
  const t = (r.question_tag || '').trim(), to = norm(t)
  if (!to) { if (/jee|iit|aieee/i.test(t) && !/^(JEE\(Main\) |AIEEE |IIT-)\d{4}$/.test(t)) skipped.push(`${r.qid}:${t}`); continue }
  if (to === t) continue
  if (r.tag_locked) { skipped.push(`${r.qid}:locked:${t}`); continue }
  const { error } = await sb.from('questions').update({ question_tag: to }).eq('qid', r.qid)
  if (error) { console.error(r.qid, error); process.exit(1) }
  changed.push([r.qid, t, to])
}
const map = {}; for (const [, f, t] of changed) { const k = f.replace(/\d/g, '#') + ' -> ' + t.replace(/\d/g, '#'); map[k] = (map[k] || 0) + 1 }
console.log('changed', changed.length, JSON.stringify(map))
const sk = {}; for (const s of skipped) { const k = s.split(':').slice(1).join(':').replace(/\d/g, '#'); sk[k] = (sk[k] || 0) + 1 }
console.log('NOT changed', skipped.length, JSON.stringify(sk))
console.log('LOCKED', JSON.stringify(skipped.filter(s => s.includes(':locked:'))))
console.log('AIEEE_LIST', JSON.stringify(skipped.filter(s => /AIEEE/i.test(s)).map(s => s.split(':')[0])))
const left = {}; for (const r of all) { const t = r.question_tag || ''; if (norm(t) === null && !/^(JEE\(Main\) |AIEEE |IIT-)\d{4}$/.test(t)) { const k = t.replace(/\d/g, '#'); left[k] = (left[k] || 0) + 1 } }
console.log('OTHER TAG KINDS LEFT', JSON.stringify(left))
console.log('OLD_COUNT', changed.length)
