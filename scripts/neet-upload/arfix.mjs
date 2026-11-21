// One-off (Arun 2026-11-21): AIIMS A/R drafts -> 4 standard AIIMS A/R options; remove drafts whose answer ("A false, R true") is not among them.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { fix, delete: del } = JSON.parse(fs.readFileSync('scripts/neet-upload/arfix.json', 'utf8'))
let u = 0
for (const f of fix) {
  const { data, error } = await sb.from('questions').update(f.set).eq('source', f.source).eq('is_published', false).select('qid')
  if (error || data.length !== 1) { console.error('fix', f.source, error, data?.length); process.exit(1) }
  console.log('FIX', data[0].qid, f.source); u++
}
let d = 0
for (const s of del) {
  const { data, error } = await sb.from('questions').delete().eq('source', s).eq('is_published', false).select('qid')
  if (error || data.length !== 1) { console.error('del', s, error, data?.length); process.exit(1) }
  console.log('DEL', data[0].qid, s); d++
}
console.log('DONE fixed', u, 'deleted', d)
