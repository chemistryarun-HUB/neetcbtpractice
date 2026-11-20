// One-off: restore apostrophe in NPU08267 (wheel's) lost during build.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const f = JSON.parse(fs.readFileSync('scripts/neet-upload/fix.json', 'utf8'))
const { data, error } = await sb.from('questions').update({ question: f.question }).eq('qid', f.qid).eq('source', f.source).select('qid,question')
if (error) { console.error(error); process.exit(1) }
console.log('FIXED', JSON.stringify(data))
