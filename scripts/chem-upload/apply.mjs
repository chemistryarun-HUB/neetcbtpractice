import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const ids = ['NCU03589','NCU03590','NCU03591','NCU03592','NCU03593','NCU03594']
const { error } = await sb.from('questions').update({ is_published: true }).in('qid', ids)
const { data } = await sb.from('questions').select('qid,is_published').in('qid', ids)
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify({ error, data }, null, 1))
