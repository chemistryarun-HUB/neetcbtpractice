// One-off: move live Physics rows from NCERT chapters to the 32-unit list
// (same logic as 7_physics_32_units.sql). APPLY=1 writes, otherwise dry run.
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const APPLY = process.env.APPLY === '1'
const SIMPLE = { 17: 19, 18: 21, 19: 20, 20: 22, 21: 23, 22: 29, 23: 24, 24: 25, 26: 27, 27: 28 }
const NAMES = { 17: 'Electrostatics', 18: 'Capacitance', 19: 'Current Electricity', 20: 'Magnetic Properties of Matter', 21: 'Magnetic Effects of Current', 22: 'Electromagnetic Induction', 23: 'Alternating Current', 24: 'Ray Optics', 25: 'Wave Optics', 27: 'Atomic Physics', 28: 'Nuclear Physics', 29: 'Electromagnetic Waves' }
function map(u, l) {
  if (SIMPLE[u]) return [SIMPLE[u], l]
  if (u === 15) return [17, l <= 3 ? l : l + 1]
  if (u === 16) return l === 1 ? [17, 4] : [18, l - 1]
  return null
}
const die = (what, error) => { if (error) { console.error(what, error); process.exit(1) } }
async function all(table, cols, filt) {
  let out = [], from = 0
  for (;;) {
    let q = sb.from(table).select(cols).range(from, from + 999); q = filt(q)
    const { data, error } = await q; die(table, error); out = out.concat(data); if (data.length < 1000) return out; from += 1000
  }
}
// 1) questions
const qs = await all('questions', 'id, qid, unit, level, medium, is_published', q => q.eq('subject', 'Physics'))
console.log('Physics questions:', qs.length)
const plan = []
const re = /^NPH(\d{2})(\d{3})(.*)$/
const maxOld15 = {}
for (const q of qs) { const u = +(q.unit.match(/^Unit\s+(\d+)/)?.[1]); const m = q.qid.match(re); if (u === 15 && m) maxOld15[m[3]] = Math.max(maxOld15[m[3]] || 0, +m[2]) }
const counter = {}
for (const q of [...qs].sort((a, b) => a.qid.localeCompare(b.qid))) {
  const u = +(q.unit.match(/^Unit\s+(\d+)/)?.[1]); const r = map(u, q.level)
  if (!r) { console.log('unchanged', q.qid, q.unit, q.level); continue }
  const m = q.qid.match(re); let qid = q.qid
  if (m) {
    let num = m[2]
    if (u === 16 && q.level === 1) { counter[m[3]] = (counter[m[3]] ?? (maxOld15[m[3]] || 0)) + 1; num = String(counter[m[3]]).padStart(3, '0') }
    qid = `NPH${String(r[0]).padStart(2, '0')}${num}${m[3]}`
  }
  plan.push({ id: q.id, old: `${q.qid} | ${q.unit} | L${q.level}`, qid, unit: `Unit ${r[0]} - ${NAMES[r[0]]}`, level: r[1] })
}
const summary = {}
for (const p of plan) { const k = `${p.old.split(' | ')[1]} L${p.old.split(' | L')[1]} -> ${p.unit} L${p.level}`; summary[k] = (summary[k] || 0) + 1 }
console.log(summary); console.log(plan.slice(0, 5)); console.log('dupe new qids:', plan.length - new Set(plan.map(p => p.qid)).size)
// 2) history tables keyed by practice unit id 100+n
const hist = {}
for (const t of ['test_attempts', 'used_questions', 'level_videos']) {
  const rows = await all(t, 'id, unit_id, level', q => q.gte('unit_id', 101).lte('unit_id', 128)); hist[t] = rows
  console.log(t, 'Physics rows:', rows.length)
}
const sp = await all('student_progress', 'id, unlocked_levels_by_unit', q => q.not('unlocked_levels_by_unit', 'is', null))
const spPlan = []
for (const s of sp) {
  const o = s.unlocked_levels_by_unit || {}; let changed = false; const n = {}
  for (const [k, v] of Object.entries(o)) {
    const id = +k
    if (id > 100 && id < 200) {
      const u = id - 100
      if (u === 16) { changed = true; continue }
      if (SIMPLE[u] || u === 15) { changed = true; n[100 + map(u, 1)[0]] = u === 15 ? v.map(l => (l <= 3 ? l : l + 1)) : v; continue }
    }
    n[k] = v
  }
  if (changed) spPlan.push({ id: s.id, from: o, to: n })
}
console.log('student_progress to change:', spPlan.length, JSON.stringify(spPlan.slice(0, 3)))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
for (const p of plan) { const { error } = await sb.from('questions').update({ qid: 'TMP_' + p.qid }).eq('id', p.id); die('tmp ' + p.qid, error) }
for (const p of plan) { const { error } = await sb.from('questions').update({ qid: p.qid, unit: p.unit, level: p.level }).eq('id', p.id); die('final ' + p.qid, error) }
for (const [t, rows] of Object.entries(hist)) for (const r of rows) {
  const m = map(r.unit_id - 100, r.level); if (!m) continue
  const { error } = await sb.from(t).update({ unit_id: 100 + m[0], level: m[1] }).eq('id', r.id); die(t, error)
}
for (const s of spPlan) { const { error } = await sb.from('student_progress').update({ unlocked_levels_by_unit: s.to }).eq('id', s.id); die('sp', error) }
const after = await all('questions', 'qid, unit, level', q => q.eq('subject', 'Physics'))
const c = {}; for (const q of after) { const k = `${q.unit} L${q.level}`; c[k] = (c[k] || 0) + 1 }
console.log('AFTER', c, 'TMP left:', after.filter(q => q.qid.startsWith('TMP_')).length)
