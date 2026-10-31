// One-off: add the Gujarati versions of Biology Unit 1 as UNPUBLISHED drafts.
// Skips any Q ID that already exists, so it never overwrites a row.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const rows = JSON.parse(readFileSync(new URL('./rows.json', import.meta.url)))
const { data: have, error: e1 } = await sb.from('questions').select('qid').in('qid', rows.map(r => r.qid))
if (e1) { console.error(e1); process.exit(1) }
const skip = new Set(have.map(r => r.qid))
const fresh = rows.filter(r => !skip.has(r.qid))
console.log('ALREADY', [...skip].join(',') || 'none')
if (fresh.length) {
  const { error } = await sb.from('questions').insert(fresh)
  if (error) { console.error(error); process.exit(1) }
}
const { data: after } = await sb.from('questions').select('qid, medium, is_published').like('qid', 'NBU01%G').order('qid')
console.log('INSERTED', fresh.length, 'NOW', after.length, 'PUBLISHED', after.filter(r => r.is_published).length, 'GU', after.filter(r => r.medium === 'gu').length)
