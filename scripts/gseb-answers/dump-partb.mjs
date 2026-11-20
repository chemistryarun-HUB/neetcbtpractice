// Read-only: prints every Part B question of one subject as JSON lines, so
// model answers can be written against the text that is live in the app.
import { createClient } from '@supabase/supabase-js'
const subject = process.argv[2] || 'chemistry'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: papers, error } = await sb.from('gseb_papers').select('id, year, session, medium, set_no').eq('subject', subject).order('year')
if (error) throw new Error(error.message)
for (const p of papers) {
  const { data: rows, error: e } = await sb.from('gseb_subjective').select('q_no, section, marks, chapter_no, question, question_image, answer').eq('paper_id', p.id).order('q_no')
  if (e) throw new Error(e.message)
  for (const r of rows) console.log('ROW ' + JSON.stringify({ year: p.year, session: p.session, medium: p.medium, set: p.set_no, q: r.q_no, marks: r.marks, ch: r.chapter_no, img: !!r.question_image, has: !!(r.answer && r.answer.trim()), text: r.question }))
}
console.log('PAPERS ' + papers.length)
