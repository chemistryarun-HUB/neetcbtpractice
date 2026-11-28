import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
fs.mkdirSync('scripts/chem-upload/dump', { recursive: true })
async function q(build){ let all=[]; for (let f=0;;f+=1000){ const {data,error}=await build().range(f,f+999); if(error) throw error; all=all.concat(data); if(data.length<1000) break } return all }
const u15 = await q(()=>sb.from('questions').select('*').like('qid','NCU15%').order('qid'))
const halo = await q(()=>sb.from('questions').select('qid,unit,source,is_published,content_locked,question_tag').like('source','%MTG Halo%').order('qid'))
const unit15 = await q(()=>sb.from('questions').select('qid,unit,source,is_published').like('unit','Unit 15%').order('qid'))
fs.writeFileSync('scripts/chem-upload/dump/u15.json', JSON.stringify({u15,halo,unit15}))
fs.writeFileSync('scripts/chem-upload/dump/apply-result.json', JSON.stringify({ n: u15.length, h: halo.length, u: unit15.length }))
