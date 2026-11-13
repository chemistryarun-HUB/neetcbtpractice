import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: [q], error } = await sb.from('questions').select('*').eq('qid', 'NCU25029')
if (error || !q) { console.error(error); process.exit(1) }
if (q.question !== 'The intermediate during the addition of HCl to propene in the presence of peroxide is:' || q.correct_option !== 'CH₃-ĊH-CH₃ (2° radical)') { console.error('GUARD', q.question, q.correct_option); process.exit(1) }
console.log('BACKUP', JSON.stringify(q))
const R = (m) => `$\\ce{${m}}$`
const o1 = R('CH3-\\mathrm{\\dot{C}}H-CH2Cl')
const upd = {
  question: 'The intermediate during the addition of $\\ce{HCl}$ to propene in the presence of peroxide is:',
  option1: o1,
  option2: R('CH3-\\mathrm{\\dot{C}}H-CH3'),
  option3: R('CH3CH2CH3'),
  option4: R('CH3-CH2-\\mathrm{\\dot{C}}H2'),
  correct_option: o1,
}
const { error: e2 } = await sb.from('questions').update(upd).eq('qid', 'NCU25029')
if (e2) { console.error(e2); process.exit(1) }
const { data: [n] } = await sb.from('questions').select('qid,question,option1,option2,option3,option4,correct_option,content_locked,is_published').eq('qid', 'NCU25029')
console.log('DONE', JSON.stringify(n))
