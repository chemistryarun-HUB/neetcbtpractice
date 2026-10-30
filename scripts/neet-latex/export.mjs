// One-off: prints one batch of Chemistry Unit 7 (English) questions as
// gzip+base64 between markers, so they can be read back from the job log.
import { createClient } from '@supabase/supabase-js'
import { gzipSync } from 'zlib'

const batch = Number(process.argv[2] || 0)
const SIZE = 120
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error, count } = await sb.from('questions').select('*', { count: 'exact' })
  .eq('subject', 'Chemistry').eq('medium', 'en').ilike('unit', '%Redox Reactions and Electrochemistry%')
  .order('qid').range(batch * SIZE, batch * SIZE + SIZE - 1)
if (error) throw error
console.log(`TOTAL ${count} BATCH ${batch} ROWS ${data.length}`)
const b64 = gzipSync(Buffer.from(JSON.stringify(data))).toString('base64')
console.log('BEGIN-DATA')
for (let i = 0; i < b64.length; i += 1000) console.log('D:' + b64.slice(i, i + 1000))
console.log('END-DATA')
