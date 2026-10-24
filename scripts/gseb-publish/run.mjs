// One-off: publish every GSEB draft paper that passes the admin page's own
// publish check (all MCQs present, keyed, non-empty). Arun asked.
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

function publishProblems(paper, questions) {
  const problems = []
  const nums = new Set(questions.map(q => q.q_no))
  const missing = []
  for (let n = 1; n <= paper.mcq_count; n++) if (!nums.has(n)) missing.push(n)
  if (missing.length) problems.push(`Missing questions: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`)
  const noKey = questions.filter(q => !q.correct_option).map(q => q.q_no)
  if (noKey.length) problems.push(`No answer key: Q${noKey.join(', Q')}`)
  const empty = questions.filter(q => !q.question && !q.question_image).map(q => q.q_no)
  if (empty.length) problems.push(`Empty question text: Q${empty.join(', Q')}`)
  return problems
}

const { data: papers, error } = await sb.from('gseb_papers').select('*').order('subject').order('year').order('session')
if (error) throw error
for (const p of papers) {
  const name = `${p.subject} ${p.year} ${p.session} ${p.medium}${p.set_no ? ' set ' + p.set_no : ''}`
  if (p.is_published) { console.log('ALREADY  ', name); continue }
  const { data: qs, error: e } = await sb.from('gseb_questions').select('q_no, correct_option, question, question_image').eq('paper_id', p.id)
  if (e) throw e
  const probs = publishProblems(p, qs)
  if (probs.length) { console.log('SKIPPED  ', name, '|', probs.join('. ')); continue }
  const { error: ue } = await sb.from('gseb_papers').update({ is_published: true }).eq('id', p.id)
  if (ue) throw ue
  console.log('PUBLISHED', name)
}
const { data: after } = await sb.from('gseb_papers').select('is_published')
console.log('AFTER published', after.filter(r => r.is_published).length, 'of', after.length)
