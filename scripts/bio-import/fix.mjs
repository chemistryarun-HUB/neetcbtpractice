import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('questions').update({ topic: 'Complete Chapter Test' })
  .eq('subject', 'Biology').like('unit', 'Unit 1 - %').eq('topic', 'The Living World').select('qid')
if (error) throw error
console.log('UPDATED', data.length)
const { data: rest } = await sb.from('questions').select('topic').eq('subject', 'Biology').like('unit', 'Unit 1 - %')
console.log([...new Set(rest.map(r => r.topic))])
