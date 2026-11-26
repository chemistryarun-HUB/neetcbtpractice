import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
let all = [], from = 0
while (true) { const { data, error } = await sb.from('questions').select('*').like('qid', 'NCU03%').order('qid').range(from, from + 999); if (error) throw error; all = all.concat(data); if (data.length < 1000) break; from += 1000 }
fs.writeFileSync('scripts/chem-upload/dump/u3all.json', JSON.stringify(all))
