import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('*').eq('qid', 'NCU03524')
if (error || !r || r.content_locked || r.question_type !== 'Single Choice MCQ' || !r.question.startsWith('Match each item')) { console.error('STOP', error, r?.question_type, r?.content_locked); process.exit(1) }
console.log('BACKUP', JSON.stringify(r))
const o4 = '(i) → (d), (ii) → (e), (iii) → (b), (iv) → (a)'
const set = {
  question_type: 'Match the Column',
  question: 'Match the items given in Column I with examples given in Column II.',
  mtc_label_a: 'roman_lower', mtc_label_b: 'lower',
  col_a1: 'Hydrogen bond', col_a2: 'Resonance', col_a3: 'Ionic solid', col_a4: 'Covalent solid',
  col_b1: 'C', col_b2: 'LiF', col_b3: 'H₂', col_b4: 'HF', col_b5: 'O₃',
  option1: '(i) → (e), (ii) → (d), (iii) → (a), (iv) → (b)',
  option2: '(i) → (b), (ii) → (a), (iii) → (d), (iv) → (e)',
  option3: '(i) → (a), (ii) → (b), (iii) → (e), (iv) → (d)',
  option4: o4, correct_option: o4,
}
const { data, error: e } = await sb.from('questions').update(set).eq('qid', 'NCU03524').select('qid, question_type, correct_option, is_published, content_locked')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
