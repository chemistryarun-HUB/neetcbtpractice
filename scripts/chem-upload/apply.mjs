import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
let all = []
for (let f = 0; ; f += 1000) { const { data, error } = await sb.from('questions').select('*').like('qid', 'NCU04%').order('qid').range(f, f + 999); if (error) throw error; all = all.concat(data); if (data.length < 1000) break }
fs.writeFileSync('scripts/chem-upload/dump/u4all.json', JSON.stringify(all))
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify({ n: all.length }))
console.log(all.length)
