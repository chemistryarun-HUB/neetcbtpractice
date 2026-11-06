import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const topic = fs.readFileSync('scripts/chem-upload/newtopic.txt', 'utf8').trim()
const { data: rows, error } = await sb.from('questions').select('qid').like('qid', 'NCU10%').eq('level', 1)
if (error) { console.error(error); process.exit(1) }
console.log('NCU10 level 1 rows:', rows.length)
const { error: e2 } = await sb.from('questions').update({ topic }).like('qid', 'NCU10%').eq('level', 1)
if (e2) { console.error(e2); process.exit(1) }
const { data: after } = await sb.from('questions').select('qid, topic').like('qid', 'NCU10%').eq('level', 1)
console.log('with new topic:', after.filter(a => a.topic === topic).length, 'of', after.length)
