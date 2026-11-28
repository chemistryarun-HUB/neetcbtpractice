import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const rows = []
for (const pat of ['JEE(Main) MTG Halo Q.%', 'IIT MTG Halo Q.%']) {
  const { data, error } = await sb.from('questions').select('qid,source,source_locked,content_locked,is_published').like('source', pat)
  if (error) throw error
  rows.push(...data)
}
fs.writeFileSync('scripts/chem-upload/dump/upd-backup.json', JSON.stringify(rows, null, 1))
const res = { total: rows.length, updated: [], skipped: [], failed: [], bad: [] }
for (const r of rows) {
  const m = r.source.match(/^(?:JEE\(Main\)|IIT) MTG Halo (Q\.\S+)$/)
  if (!m) { res.skipped.push([r.qid, 'pattern', r.source]); continue }
  if (r.source_locked) { res.skipped.push([r.qid, 'source_locked']); continue }
  const ns = 'JEE MTG Halo ' + m[1]
  const { error } = await sb.from('questions').update({ source: ns }).eq('qid', r.qid)
  if (error) { res.failed.push([r.qid, error.message]); continue }
  const { data: [n] } = await sb.from('questions').select('source,is_published,content_locked').eq('qid', r.qid)
  if (n.source !== ns || n.is_published !== r.is_published || n.content_locked !== r.content_locked) res.bad.push(r.qid)
  res.updated.push([r.qid, ns])
}
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
console.log('RESULT', res.total, res.updated.length, res.skipped.length, res.failed.length, res.bad.length)
