import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const ids = ['3211','3307','3291','3361','3156','3070','3072','3411','3389','3409'].map(n => 'NCU0' + n)
const { data: old, error } = await sb.from('questions').select('*').in('qid', ids)
if (error) { console.error(error); process.exit(1) }
if (old.length !== 10) { console.error('expected 10 rows', old.length); process.exit(1) }
fs.mkdirSync('scripts/chem-upload/out', { recursive: true })
fs.writeFileSync('scripts/chem-upload/out/backup-before.json', JSON.stringify(old, null, 1))
const R = Object.fromEntries(old.map(r => [r.qid, r]))
const up = {}
const set = (q, o) => { up[q] = { ...(up[q] || {}), ...o } }
const key = (q, i, text) => { const o = {}; if (text !== undefined) o[`option${i}`] = text; o.correct_option = text !== undefined ? text : R[q][`option${i}`]; set(q, o) }
key('NCU03211', 3)
key('NCU03307', 2)
set('NCU03291', { question: R.NCU03291.question.replace('(D) O₂²⁻ ion is diamagnetic.', '(D) O₂⁺ ion is diamagnetic.') }); key('NCU03291', 4, 'O₂⁺ ion is diamagnetic.')
key('NCU03361', 1)
key('NCU03156', 2, 'B₂'); set('NCU03156', { correct_option: 'N₂' }) // key unchanged
key('NCU03070', 3, 'see-saw')
const o1 = '$\\ce{XeF4 + SbF5 ->}$  (Xe)'
set('NCU03072', { question: 'The reaction in which the hybridisation of the atom given in brackets is affected is:', option1: o1, option2: '$\\ce{H2SO4 + 2NaCl ->[420 K]}$  (S)', option3: '$\\ce{NH3 ->[H+]}$  (N)', option4: '$\\ce{H3PO2}$ (disproportionation)  (P)', correct_option: o1 })
set('NCU03411', { question: 'Assuming 2s–2p mixing is NOT operative, the paramagnetic species among the following is', correct_option: R.NCU03411.option3 })
const upImg = async (name, path) => {
  const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/chem-upload/img/${name}.png`), { contentType: 'image/png', upsert: false })
  if (error) { console.error('img', name, error); process.exit(1) }
  return sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}
const t = Date.now()
set('NCU03389', { question: R.NCU03389.question.replace(' [Image] ', ' '), question_image: await upImg('borazine', `ncu03/borazine_${t}.png`) })
set('NCU03409', { question_image: await upImg('overlaps', `ncu03/overlaps_${t}.png`) })
for (const [q, o] of Object.entries(up)) {
  const { error } = await sb.from('questions').update(o).eq('qid', q)
  if (error) { console.error(q, error); process.exit(1) }
}
const { data: now } = await sb.from('questions').select('qid,question,option1,option2,option3,option4,correct_option,question_image,content_locked,is_published').in('qid', ids).order('qid')
fs.writeFileSync('scripts/chem-upload/out/after.json', JSON.stringify(now, null, 1))
for (const r of now) console.log(r.qid, '| key:', r.correct_option, '| locked', r.content_locked, '| pub', r.is_published, '| img', !!r.question_image)
