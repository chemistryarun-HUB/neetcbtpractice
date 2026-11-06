import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { old, new: nw } = JSON.parse(fs.readFileSync('scripts/chem-upload/pair.json', 'utf8'))
const F = ['question', 'option1', 'option2', 'option3', 'option4', 'correct_option', ...[1, 2, 3, 4].flatMap(i => ['col_a' + i, 'col_b' + i])]
let upd = 0, same = 0, skipped = [], failed = []
for (let i = 0; i < old.length; i++) {
  const o = old[i], n = nw[i]
  const patch = {}
  for (const f of F) if (typeof n[f] === 'string' && n[f] !== o[f]) patch[f] = n[f]
  if (!Object.keys(patch).length) { same++; continue }
  const { data: cur, error } = await sb.from('questions').select('*').eq('qid', o.qid).maybeSingle()
  if (error || !cur) { failed.push(o.qid + ' ' + (error?.message || 'missing')); continue }
  const edited = F.filter(f => typeof o[f] === 'string' && cur[f] !== o[f])
  if (edited.length || cur.content_locked) { skipped.push(o.qid + ' ' + (cur.content_locked ? 'locked' : 'edited:' + edited.join('/'))); continue }
  if (cur.is_published) { skipped.push(o.qid + ' published'); continue }
  const { error: e2 } = await sb.from('questions').update(patch).eq('qid', o.qid)
  if (e2) failed.push(o.qid + ' ' + e2.message); else upd++
}
console.log('updated', upd, 'unchanged', same, 'skipped', skipped.length, 'failed', failed.length)
console.log('SKIPPED', skipped.join('; ')); console.log('FAILED', failed.join('; '))
