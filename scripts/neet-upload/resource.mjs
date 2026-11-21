// One-off: rename source of ExamGOAL NEET Physics drafts to "NEET Unit-NN Q.No. n" (= Arun's renamed PDF file + Q no).
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const M = {'Units & Measurement':'02','Motion in a Straight Line':'03','Vector Algebra':'04 (Vector Algebra)','Motion in a Plane':'04 (Motion in a Plane)',
'Laws of Motion':'05','Work, Energy and Power':'06','Center of Mass and Collision':'07','Rotational Motion':'08','Gravitation':'09',
'Properties of Matter':'10, 11, 14','Oscillations':'12','Waves':'13','Heat and Thermodynamics':'14, 15, 16','Electrostatics':'17','Capacitor':'18',
'Current Electricity':'19','Magnetism and Matter':'20','Moving Charges and Magnetism':'21','Electromagnetic Induction':'22','Alternating Current':'23',
'Geometrical Optics':'24','Wave Optics':'25','Dual Nature of Matter':'26','Atoms and Nuclei':'27, 28','Electromagnetic Waves':'29','Semiconductors':'30'}
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, source, is_published').like('source', 'ExamGOAL NEET Phy %').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows.push(...data); if (data.length < 1000) break
}
console.log('rows', rows.length, 'published', rows.filter(r => r.is_published).length)
const plan = rows.map(r => {
  const m = r.source.match(/^ExamGOAL NEET Phy (.+) Q(\d+)$/)
  if (!m || !M[m[1]]) { console.error('unmapped', r.qid, r.source); process.exit(1) }
  return { qid: r.qid, old: r.source, src: `NEET Unit-${M[m[1]]} Q.No. ${m[2]}` }
})
let n = 0
for (const p of plan) {
  const { data, error } = await sb.from('questions').update({ source: p.src }).eq('qid', p.qid).eq('source', p.old).select('qid')
  if (error || data.length !== 1) { console.error('fail', p.qid, error, data?.length); process.exit(1) }
  n++
}
const per = {}; for (const p of plan) { const k = p.src.replace(/ Q\.No\. \d+$/, ''); per[k] = (per[k] || 0) + 1 }
console.log('updated', n, JSON.stringify(per))
for (const q of ['NPU09212','NPU12157','NPU30282','NPU10085']) console.log(q, plan.find(p => p.qid === q)?.src)
