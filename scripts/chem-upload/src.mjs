import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: rows, error } = await sb.from('questions').select('qid, source, source_locked').eq('subject', 'Chemistry').like('unit', 'Unit 19 -%').order('qid')
if (error) { console.error(error); process.exit(1) }
console.log('rows', rows.length)
const rules = [
  [/^MTG\b.*?Q\.?\s*(\d+)\s*$/i, 'MTG'], [/^NEET\b.*?Q\.?\s*(\d+)\s*$/i, 'NEET'], [/^AIIMS\b.*?Q\.?\s*(\d+)\s*$/i, 'AIIMS'],
  [/^NCERT\b.*?(?:Q\.?|#|No\.?)\s*(\d+)\s*$/i, 'NCERT'], [/^EXEMPLAR\b.*?(?:Q\.?|#|No\.?)\s*(\d+)\s*$/i, 'EXEMPLAR'],
]
const kinds = {}; for (const r of rows) { const k = (r.source || '(empty)').replace(/\d+/g, '#'); kinds[k] = (kinds[k] || 0) + 1 }
console.log('PATTERNS', JSON.stringify(kinds))
let n = 0, skip = []
for (const r of rows) {
  const s = (r.source || '').trim(); let to = null
  for (const [re, p] of rules) { const m = s.match(re); if (m) { to = `${p} Bio Q.${m[1]}`; break } }
  if (!to) { skip.push(`${r.qid}:${s}`); continue }
  if (to === s) continue
  const { error: e } = await sb.from('questions').update({ source: to }).eq('qid', r.qid)
  if (e) { console.error(r.qid, e); process.exit(1) }
  n++; if (n <= 5 || r.source_locked) console.log(r.qid, s, '->', to, r.source_locked ? '(was locked)' : '')
}
console.log('changed', n, 'NOT changed', skip.length, JSON.stringify(skip))
