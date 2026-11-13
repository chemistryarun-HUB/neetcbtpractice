import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
let rows = [], from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('qid,unit,subject,is_published,is_active,medium').eq('subject', 'Chemistry').like('unit', 'Unit 10 %').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows = rows.concat(data); if (data.length < 1000) break; from += 1000
}
const units = {}; rows.forEach(r => { units[r.unit] = (units[r.unit] || 0) + 1 })
console.log('UNITS', JSON.stringify(units))
const bad = rows.filter(r => !/^NCU10\d{3}G?$/.test(r.qid)); console.log('ODD_QIDS', bad.map(r => r.qid).join(','))
const todo = rows.filter(r => !r.is_published && r.is_active !== false && /^NCU10\d{3}$/.test(r.qid))
const inactive = rows.filter(r => !r.is_published && r.is_active === false)
console.log('TOTAL', rows.length, 'PUBLISHED_ALREADY', rows.filter(r => r.is_published).length, 'TO_PUBLISH', todo.length, 'INACTIVE_SKIPPED', inactive.map(r => r.qid).join(','))
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/pub10-ids.json', JSON.stringify(todo.map(r => r.qid)))
for (let i = 0; i < todo.length; i += 100) {
  const ids = todo.slice(i, i + 100).map(r => r.qid)
  const { error: e } = await sb.from('questions').update({ is_published: true }).in('qid', ids)
  if (e) { console.error(e); process.exit(1) }
}
const { count } = await sb.from('questions').select('qid', { count: 'exact', head: true }).eq('subject', 'Chemistry').like('unit', 'Unit 10 %').eq('is_published', false)
console.log('DONE unpublished_left', count)
