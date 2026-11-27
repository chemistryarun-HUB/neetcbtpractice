import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const out = {}
for (let u = 19; u <= 40; u++) {
  const p = 'NCU' + String(u).padStart(2, '0') + '%'
  let all = []
  for (let f = 0; ; f += 1000) { const { data, error } = await sb.from('questions').select('*').like('qid', p).order('qid').range(f, f + 999); if (error) throw error; all = all.concat(data); if (data.length < 1000) break }
  out[u] = all.length
  fs.writeFileSync('scripts/chem-upload/dump/u' + u + '.json', JSON.stringify(all))
}
const { data: units } = await sb.from('questions').select('unit').eq('subject','Chemistry').range(0, 0)
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(out))
console.log(out)
