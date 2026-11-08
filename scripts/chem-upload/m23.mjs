import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const base = { question_type: 'Match the Column', mtc_label_a: 'roman_lower', mtc_label_b: 'lower' }
const jobs = {
  NCU03523: { guard: 'Match the species', set: { ...base,
    question: 'Match the species in List I with the bond order in List II.',
    col_a1: 'NO', col_a2: 'CO', col_a3: 'O₂⁻', col_a4: 'O₂',
    col_b1: '1.5', col_b2: '2.0', col_b3: '2.5', col_b4: '3.0',
    option1: '(i) → (d), (ii) → (c), (iii) → (b), (iv) → (a)',
    option2: '(i) → (a), (ii) → (b), (iii) → (c), (iv) → (d)',
    option3: '(i) → (c), (ii) → (d), (iii) → (a), (iv) → (b)',
    option4: '(i) → (b), (ii) → (a), (iii) → (d), (iv) → (c)',
    correct_option: '(i) → (c), (ii) → (d), (iii) → (a), (iv) → (b)' } },
  NCU03524: { guard: 'Match the items', set: { question: 'Match the items given in List I with examples given in List II.' } },
}
for (const [qid, j] of Object.entries(jobs)) {
  const { data: [r], error } = await sb.from('questions').select('*').eq('qid', qid)
  if (error || !r || r.content_locked || !r.question.startsWith(j.guard)) { console.error('STOP', qid, error, r?.question, r?.content_locked); process.exit(1) }
  console.log('BACKUP', qid, JSON.stringify({ question: r.question, question_type: r.question_type, options: [r.option1, r.option2, r.option3, r.option4], correct_option: r.correct_option, mtc_label_a: r.mtc_label_a, mtc_label_b: r.mtc_label_b }))
  const { data, error: e } = await sb.from('questions').update(j.set).eq('qid', qid).select('qid, question_type, question, correct_option, is_published, content_locked')
  if (e) { console.error(e); process.exit(1) }
  console.log('DONE', JSON.stringify(data))
}
