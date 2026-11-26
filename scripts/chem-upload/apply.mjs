import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').select('*').like('qid', 'NCU09%').gte('qid', 'NCU09355')
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify({ error, data }, null, 1))
