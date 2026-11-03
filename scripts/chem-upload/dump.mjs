import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
let all = [], from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('*').eq('subject', 'Chemistry').like('unit', 'Unit 9 -%').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all = all.concat(data); if (data.length < 1000) break; from += 1000
}
const c = {}; for (const q of all) { const k = `${q.medium} ${q.question_type} pub=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('TOTAL', all.length, JSON.stringify(c))
const re = /match|list[\s-]*(i|1|ii)\b|column|સ્તંભ|યાદી|જોડ/i
const keep = ['qid','medium','question_type','level','is_published','content_locked','question_tag','question','option1','option2','option3','option4','correct_option','question_image','option1_image','col_a1','mtc_label_a','mtc_label_b']
let n = 0
for (const q of all) {
  if (q.question_type === 'Match the Column') { console.log('ISMTC', q.qid); continue }
  if (re.test(q.question || '') || re.test(q.option1 || '')) { n++; console.log('CAND ' + JSON.stringify(Object.fromEntries(keep.map(k => [k, q[k]])))) }
}
console.log('candidates', n)
const imgOnly = all.filter(q => q.question_image && !re.test(q.question || '')).map(q => q.qid)
console.log('QIMG_OTHERS', imgOnly.length, imgOnly.join(','))
