import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const { data, error } = await sb.from('questions').select('*').eq('qid', 'NCU22050')
fs.writeFileSync('scripts/chem-upload/dump/row.json', JSON.stringify({ error, data }, null, 1))
for (const r of data || []) for (const [k, v] of Object.entries(r)) {
  if (k.endsWith('_image') && v) { const res = await fetch(v); fs.writeFileSync(`scripts/chem-upload/dump/${k}.png`, Buffer.from(await res.arrayBuffer())) }
}
console.log('done', (data || []).length)
