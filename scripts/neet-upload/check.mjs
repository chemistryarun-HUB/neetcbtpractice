// One-off read-only check for Physics Unit 31/32 renumbering (Arun 2026-11-21)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
for (const u of ['Unit 31%', 'Unit 32%']) {
  const { data, error } = await sb.from('questions').select('qid, unit, level, medium, is_published').eq('subject', 'Physics').like('unit', u).order('qid')
  if (error) { console.log('ERR q', error.message); continue }
  const units = [...new Set(data.map(r => r.unit))]
  console.log(u, 'rows', data.length, 'units', JSON.stringify(units), 'levels', JSON.stringify([...new Set(data.map(r => r.level))]),
    'pub', data.filter(r => r.is_published).length, 'media', JSON.stringify([...new Set(data.map(r => r.medium))]),
    'qid', data[0]?.qid, data.at(-1)?.qid, 'nonNPU', data.filter(r => !/^NPU3[12]\d{3}G?$/.test(r.qid)).map(r => r.qid).join(','))
}
const { count: q31 } = await sb.from('questions').select('*', { count: 'exact', head: true }).like('qid', 'NPU31%')
console.log('qid NPU31% count', q31)
for (const t of ['test_attempts', 'used_questions', 'level_videos']) {
  for (const id of [131, 132]) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true }).eq('unit_id', id)
    console.log(t, id, error ? 'ERR ' + error.message : count)
  }
}
const { data: sp, error: e } = await sb.from('student_progress').select('student_id, unlocked_levels_by_unit')
if (e) console.log('ERR sp', e.message)
else console.log('progress rows', sp.length, 'with131', sp.filter(r => r.unlocked_levels_by_unit?.['131']).length, 'with132', sp.filter(r => r.unlocked_levels_by_unit?.['132']).length)
const { data: d, error: e2 } = await sb.from('doubts').select('id, unit_id').in('unit_id', [131, 132])
console.log('doubts', e2 ? 'ERR ' + e2.message : d.length)
