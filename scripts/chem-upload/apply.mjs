import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const want = JSON.parse(fs.readFileSync('scripts/chem-upload/src.json', 'utf8'))
const { data: rows, error } = await sb.from('questions').select('qid,source,source_locked,content_locked,is_published').in('qid', Object.keys(want))
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/src-backup.json', JSON.stringify(rows, null, 1))
const res = { updated: [], skipped: [], failed: [], bad: [], error }
for (const r of rows || []) {
  if (r.source_locked) { res.skipped.push([r.qid, 'source_locked']); continue }
  const { error: e } = await sb.from('questions').update({ source: want[r.qid] }).eq('qid', r.qid)
  if (e) { res.failed.push([r.qid, e.message]); continue }
  const { data: [n] } = await sb.from('questions').select('source,content_locked,is_published').eq('qid', r.qid)
  if (n.source !== want[r.qid]) res.bad.push([r.qid, 'source']); else res.updated.push(r.qid)
  if (n.content_locked !== r.content_locked || n.is_published !== r.is_published) res.bad.push([r.qid, 'lock/publish'])
}
const { data: all } = await sb.from('questions').select('qid,source').like('qid', 'NCU09%')
res.allSources = all
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
console.log('RESULT', res.updated.length, res.skipped.length, res.failed.length, res.bad.length)
