import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const E = [2, 3, 4, 18, 21, 25], H = [1, 9, 10, 23]
const out = {}
for (let n = 1; n <= 25; n++) {
  const d = E.includes(n) ? 'Easy' : H.includes(n) ? 'Hard' : 'Medium', q = 'NCU19' + String(326 + n).padStart(3, '0')
  const { data, error } = await sb.from('questions').update({ difficulty_level: d }).eq('qid', q).eq('difficulty_locked', false).select('qid')
  if (error) { console.error(q, error); process.exit(1) }
  out[d] = (out[d] || 0) + data.length; if (!data.length) console.log('locked/skip', q)
}
console.log(JSON.stringify(out))
