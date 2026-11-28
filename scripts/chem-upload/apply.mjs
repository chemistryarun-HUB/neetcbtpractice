import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const ids = JSON.parse(fs.readFileSync('scripts/chem-upload/ids.json','utf8'))
fs.mkdirSync('scripts/chem-upload/dump/img',{recursive:true})
const { data, error } = await sb.from('questions').select('*').in('qid', ids)
fs.writeFileSync('scripts/chem-upload/dump/rows.json', JSON.stringify({error,data},null,1))
for (const r of data||[]) for (const [k,v] of Object.entries(r)) if (k.includes('image') && typeof v==='string' && v.startsWith('http')) {
  const res=await fetch(v); const b=Buffer.from(await res.arrayBuffer()); const ext=(v.split('?')[0].split('.').pop()||'png').slice(0,4)
  fs.writeFileSync(`scripts/chem-upload/dump/img/${r.qid}__${k}.${ext}`,b); console.log(r.qid,k,res.status,b.length)
}
