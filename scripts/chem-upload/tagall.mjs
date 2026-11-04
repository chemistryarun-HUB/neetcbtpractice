import { createClient } from '@supabase/supabase-js'
const DRY = true
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const all = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('qid, unit, question_tag, tag_locked').eq('subject', 'Chemistry').order('qid').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all.push(...data); if (data.length < 1000) break
}
const kinds = {}; for (const r of all) { const k = (r.question_tag || '(empty)').replace(/\d/g, '#'); kinds[k] = (kinds[k] || 0) + 1 }
console.log('rows', all.length, 'ALL TAG KINDS', JSON.stringify(kinds))
const yr = (t) => {
  let m = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/); if (m) return '20' + m[3]
  m = t.match(/\b\d{1,2}\/(\d{2})\b/); if (m) return '20' + m[1]
  const all = t.match(/(?:20|19)\d{2}/g); return all ? String(Math.max(...all.map(Number))) : null
}
const fams = (t) => {
  const f = []
  if (/AIIMS/i.test(t)) f.push('AIIMS')
  if (/AIPMT/i.test(t)) f.push('AIPMT')
  if (/NEET/i.test(t)) f.push('NEET')
  if (/AIEEE/i.test(t)) f.push('AIEEE')
  if (/IIT|JEE[\s\-_(]*ADV|ADVANCED/i.test(t)) f.push('IIT')
  else if (/JEE[\s\-_(]*MAIN/i.test(t)) f.push('JEEM')
  if (/EXEMPLAR/i.test(t)) f.push('EXEMPLAR')
  else if (/NCERT/i.test(t)) f.push('NCERT')
  return f
}
const fmt = { AIIMS: (y) => `AIIMS ${y}`, AIPMT: (y) => `AIPMT ${y}`, NEET: (y) => `NEET ${y}`, AIEEE: (y) => `AIEEE ${y}`, IIT: (y) => `IIT-${y}`, JEEM: (y) => `JEE(Main) ${y}` }
const norm = (t) => {
  const f = fams(t)
  if (f.length === 2 && f.includes('NEET') && f.includes('AIPMT')) f.splice(f.indexOf('AIPMT'), 1)
  if (!f.length && /^\s*MAIN\b/i.test(t)) f.push('JEEM')
  if (f.length !== 1) return { amb: true }
  if (f[0] === 'EXEMPLAR') return { to: 'NCERT Exemplar' }
  if (f[0] === 'NCERT') return /EXERCISE/i.test(t) ? { to: 'NCERT Exercise' } : { amb: true }
  const y = yr(t); return y ? { to: fmt[f[0]](y) } : { amb: true }
}
const changed = [], locked = [], amb = [], same = {}
for (const r of all) {
  const t = (r.question_tag || '').trim(); if (!t) continue
  const n = norm(t)
  if (n.amb) { amb.push(`${r.qid}:${t}`); continue }
  if (!n.to) continue
  if (n.to === t) { same[n.to.replace(/\d/g, '#')] = (same[n.to.replace(/\d/g, '#')] || 0) + 1; continue }
  if (r.tag_locked) { locked.push(`${r.qid}:${t}->${n.to}`); continue }
  if (!DRY) { const { error } = await sb.from('questions').update({ question_tag: n.to }).eq('qid', r.qid); if (error) { console.error(r.qid, error); process.exit(1) } }
  changed.push([r.qid, t, n.to])
}
const map = {}; for (const [, f, t] of changed) { const k = f.replace(/\d/g, '#') + ' -> ' + t.replace(/\d/g, '#'); map[k] = (map[k] || 0) + 1 }
console.log(DRY ? 'DRY would change' : 'changed', changed.length, JSON.stringify(map))
console.log('ALREADY OK', JSON.stringify(same))
console.log('LOCKED', locked.length, JSON.stringify(locked))
const ak = {}; for (const a of amb) { const [q, ...r] = a.split(':'); const k = r.join(':').replace(/\d/g, '#'); (ak[k] = ak[k] || []).push(q) }
console.log('LEFT UNCHANGED (no year / not in list)', amb.length, JSON.stringify(Object.fromEntries(Object.entries(ak).map(([k, v]) => [k, v.length + ' e.g. ' + v.slice(0, 3).join(',')]))))
if (!DRY) console.log('OLD', JSON.stringify(changed.map(([q, f]) => [q, f])))
