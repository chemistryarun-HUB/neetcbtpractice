import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [r], error } = await sb.from('questions').select('*').eq('qid', 'NCU04305')
if (error || !r || r.content_locked || r.question_type !== 'Single Choice MCQ' || !r.question.startsWith('Match the LIST-I')) { console.error('STOP', error, r?.question_type, r?.content_locked); process.exit(1) }
console.log('BACKUP', JSON.stringify({ question: r.question, question_type: r.question_type, options: [r.option1, r.option2, r.option3, r.option4], correct_option: r.correct_option, mtc_label_a: r.mtc_label_a, mtc_label_b: r.mtc_label_b }))
const set = {
  question_type: 'Match the Column', mtc_label_a: 'upper', mtc_label_b: 'roman_upper',
  question: 'Match the List-I (Thermodynamic Process) with List-II (Magnitude in kJ). Choose the correct answer from the options given below:',
  col_a1: 'Work done in reversible, isothermal expansion of 2 mol ideal gas from 2 dm³ to 20 dm³ at 300 K',
  col_a2: 'Work done in irreversible isothermal expansion of 1 mol ideal gas from 1 m³ to 3 m³ at 300 K against constant pressure 3 kPa',
  col_a3: 'Change in internal energy for adiabatic expansion of 1 mol ideal gas, $\\Delta T = -320$ K, $C_{v,m} = \\frac{3}{2}R$',
  col_a4: 'Change in enthalpy at constant pressure of 1 mol ideal gas, $\\Delta T = 337$ K, $C_{p,m} = \\frac{5}{2}R$',
  col_b1: '4', col_b2: '11.5', col_b3: '6', col_b4: '7',
}
const { data, error: e } = await sb.from('questions').update(set).eq('qid', 'NCU04305').select('qid, question_type, correct_option, is_published, content_locked')
if (e) { console.error(e); process.exit(1) }
console.log('DONE', JSON.stringify(data))
