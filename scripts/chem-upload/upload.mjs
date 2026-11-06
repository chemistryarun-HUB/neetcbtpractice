import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const ids = JSON.parse(fs.readFileSync('scripts/chem-upload/ids.json', 'utf8'))
const topic = 'p-Block Elements: Important compounds of p-block elements (preparation, properties, structures and uses)'
const { data: before } = await sb.from('questions').select('qid, level').in('qid', ids)
console.log('found', before.length, 'of', ids.length, 'levels', JSON.stringify(before.reduce((a, r) => (a[r.level] = (a[r.level] || 0) + 1, a), {})))
if (before.length !== ids.length) { console.error('STOP: missing ids'); process.exit(1) }
const { error } = await sb.from('questions').update({ level: 7, topic }).in('qid', ids)
if (error) { console.error(error); process.exit(1) }
const { data: all } = await sb.from('questions').select('qid, level, is_published').like('qid', 'NCU10%')
const c = {}; for (const q of all) { const k = `L${q.level} pub=${q.is_published}`; c[k] = (c[k] || 0) + 1 }
console.log('NCU10 now', all.length, JSON.stringify(c))
