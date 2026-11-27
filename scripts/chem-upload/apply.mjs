import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const ids = []
for (let i = 3674; i <= 3806; i++) ids.push('NCU0' + i)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
const { data: before } = await sb.from('questions').select('qid,is_published').in('qid', ids)
const { error } = await sb.from('questions').update({ is_published: true }).in('qid', ids)
const { data: after } = await sb.from('questions').select('qid,is_published').in('qid', ids)
const res = { error, found: before.length, wasPub: before.filter(r => r.is_published).length, nowPub: after.filter(r => r.is_published).length, notPub: after.filter(r => !r.is_published).map(r => r.qid) }
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify(res, null, 1))
console.log(res)
