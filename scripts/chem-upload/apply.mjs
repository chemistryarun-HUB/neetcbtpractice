import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const FIX = JSON.parse(fs.readFileSync('scripts/chem-upload/payload.json', 'utf8'))
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const res = { updated: [], skipped: [], failed: [], bad: [], others: [] }
for (const [qid, [oldTag, newTag]] of Object.entries(FIX)) {
  const { data: [r], error } = await sb.from('questions').select('qid,question_tag,content_locked').eq('qid', qid)
  if (error || !r) { res.failed.push([qid, error?.message || 'missing']); continue }
  if (r.content_locked) { res.skipped.push([qid, 'locked']); continue }
  if (r.question_tag !== oldTag) { res.skipped.push([qid, 'drift:' + r.question_tag]); continue }
  const { error: e2 } = await sb.from('questions').update({ question_tag: newTag }).eq('qid', qid)
  if (e2) { res.failed.push([qid, e2.message]); continue }
  const { data: [n] } = await sb.from('questions').select('question_tag').eq('qid', qid)
  if (n.question_tag !== newTag) res.bad.push(qid); else res.updated.push(qid)
}
// report (no change) every other row whose tag holds more than one year
let from = 0
for (;;) {
  const { data, error } = await sb.from('questions').select('qid,subject,question_tag').like('question_tag', '%,%').range(from, from + 999)
  if (error) { res.othersErr = error.message; break }
  for (const r of data) if (!FIX[r.qid] && (r.question_tag.match(/\d{4}/g) || []).length > 1) res.others.push([r.qid, r.subject, r.question_tag])
  if (data.length < 1000) break
  from += 1000
}
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
console.log('RESULT', JSON.stringify({ ...res, others: res.others.length }))
