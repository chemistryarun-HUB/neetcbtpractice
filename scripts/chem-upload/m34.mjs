import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('*').eq('qid', 'NCU09034')
if (error || !r || r.content_locked || r.question_type !== 'Single Choice MCQ') { console.error('STOP', error, r?.question_type, r?.content_locked); process.exit(1) }
console.log('BACKUP', JSON.stringify({ question: r.question, question_type: r.question_type, mtc_label_a: r.mtc_label_a, mtc_label_b: r.mtc_label_b }))
const set = { question_type: 'Match the Column', question: 'Match the name (Column I) with its IUPAC official name (Column II) and identify the incorrect match.', mtc_label_a: 'lower', mtc_label_b: 'roman_lower',
  col_a1: 'Unnilunium', col_a2: 'Unniltrium', col_a3: 'Unnilhexium', col_a4: 'Ununnunium', col_b1: 'Mendelevium', col_b2: 'Lawrencium', col_b3: 'Seaborgium', col_b4: 'Darmstadtium' }
const { data, error: e } = await sb.from('questions').update(set).eq('qid', 'NCU09034').select('qid, question_type, correct_option')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
