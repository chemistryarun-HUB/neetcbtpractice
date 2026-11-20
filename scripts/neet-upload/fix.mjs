// One-off: repair text of 6 earlier drafts where "\n" / "\'" / "\AA" showed literally.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const fixes = JSON.parse(fs.readFileSync('scripts/neet-upload/fix.json', 'utf8'))
for (const f of fixes) {
  const { source, ...set } = f
  const { data, error } = await sb.from('questions').update(set).eq('source', source).select('qid')
  if (error || data.length !== 1) { console.error('fix', source, error, data?.length); process.exit(1) }
  console.log('FIXED', data[0].qid, source)
}
