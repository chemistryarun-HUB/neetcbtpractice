import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const U = JSON.parse(fs.readFileSync('scripts/chem-upload/update.json', 'utf8'))
const { data: rows, error: e0 } = await sb.from('questions').select('*').in('qid', U.map(u => u.qid))
if (e0 || rows.length !== U.length) { console.error('STOP', e0, rows?.length); process.exit(1) }
for (const u of U) {
  const r = rows.find(x => x.qid === u.qid), s = u.set
  if (r.content_locked || r.question_type !== 'Single Choice MCQ') { console.error('STOP locked/type', u.qid); process.exit(1) }
  const opts = [1, 2, 3, 4].map(i => s[`option${i}`] ?? r[`option${i}`]), corr = s.correct_option ?? r.correct_option
  if (!opts.includes(corr)) { console.error('STOP correct not in options', u.qid); process.exit(1) }
}
console.log('BACKUP', JSON.stringify(rows.map(r => ({ qid: r.qid, question: r.question, question_type: r.question_type, option1: r.option1, option2: r.option2, option3: r.option3, option4: r.option4, correct_option: r.correct_option, mtc_label_a: r.mtc_label_a, mtc_label_b: r.mtc_label_b }))))
for (const u of U) {
  const { data, error } = await sb.from('questions').update(u.set).eq('qid', u.qid).select('qid, question_type')
  if (error || !data.length) { console.error('update', u.qid, error); process.exit(1) }
  console.log('MTC', data[0].qid, data[0].question_type)
}
// tags: any Re-NEET spelling -> NEET
const { data: tg } = await sb.from('questions').select('qid, question_tag, tag_locked').eq('subject', 'Chemistry').ilike('question_tag', 're%neet%')
for (const r of tg) {
  if (r.tag_locked) { console.log('tag locked', r.qid); continue }
  const t = r.question_tag.replace(/^re[\s-]*neet/i, 'NEET')
  await sb.from('questions').update({ question_tag: t }).eq('qid', r.qid)
  console.log('TAG', r.qid, r.question_tag, '->', t)
}
// second look: list-like questions without the word match/list/column
const { data: u9 } = await sb.from('questions').select('qid, question, option1').eq('subject', 'Chemistry').like('unit', 'Unit 9 -%')
const done = new Set(U.map(u => u.qid))
for (const q of u9) {
  const t = q.question || ''
  if (done.has(q.qid)) continue
  if ((/\(a\)|\bA\./.test(t) && /\(i\)|\bI\./.test(t)) || /\(i\)|\(I\)|\bI\.\s/.test(q.option1 || '') && /-|→/.test(q.option1 || '')) console.log('MAYBE', JSON.stringify(q))
}
console.log('done')
