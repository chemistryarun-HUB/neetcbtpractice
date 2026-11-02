import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { qid, set } = JSON.parse(fs.readFileSync('scripts/chem-upload/update.json', 'utf8'))
const { data: before, error: e0 } = await sb.from('questions').select('qid, question_type, is_published').eq('qid', qid)
if (e0 || before.length !== 1) { console.error('STOP', e0, before); process.exit(1) }
console.log('before', before[0])
const { data, error } = await sb.from('questions').update(set).eq('qid', qid).select('qid, question_type, mtc_label_a, mtc_label_b, col_a1, col_b4, correct_option, is_published')
if (error || !data.length) { console.error('update failed', error, data); process.exit(1) }
console.log('after', data[0])
