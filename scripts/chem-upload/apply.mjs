import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { new: want } = JSON.parse(fs.readFileSync('scripts/chem-upload/reord.json', 'utf8'))
const { data: rows } = await sb.from('questions').select('qid,option1,option2,option3,option4,correct_option,content_locked,is_published').in('qid', Object.keys(want))
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/reord-backup.json', JSON.stringify(rows, null, 1))
const res = { updated: [], skipped: [], failed: [], bad: [] }
for (const r of rows) {
  const w = want[r.qid]
  const cur = [r.option1, r.option2, r.option3, r.option4].slice().sort().join('|')
  const nw = [w.option1, w.option2, w.option3, w.option4].slice().sort().join('|')
  if (r.content_locked) { res.skipped.push([r.qid, 'locked']); continue }
  if (cur !== nw) { res.skipped.push([r.qid, 'option set differs']); continue }
  const { error } = await sb.from('questions').update(w).eq('qid', r.qid)
  if (error) { res.failed.push([r.qid, error.message]); continue }
  const { data: [n] } = await sb.from('questions').select('option1,option2,option3,option4,correct_option,is_published,content_locked').eq('qid', r.qid)
  if (['option1','option2','option3','option4'].some(f => n[f] !== w[f]) || n.correct_option !== r.correct_option || n.is_published !== r.is_published) res.bad.push(r.qid); else res.updated.push(r.qid)
}
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
