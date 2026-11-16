import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: a } = await sb.from('questions').select('*').like('qid', 'NCU16%').order('qid')
const { data: b } = await sb.from('questions').select('qid,unit,level,medium,is_published,question_tag,source').eq('subject', 'Chemistry').like('unit', 'Unit 16%')
const { data: c } = await sb.from('questions').select('unit').eq('subject', 'Chemistry').like('unit', 'Unit 1_ -%').limit(2000)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
fs.writeFileSync('scripts/chem-upload/dump/u16.json', JSON.stringify({ a, b, units: [...new Set((c || []).map(r => r.unit))] }, null, 1))
console.log('RESULT', a?.length, b?.length)
