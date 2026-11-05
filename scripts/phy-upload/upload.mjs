import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const files = fs.readdirSync('scripts/phy-upload/img').filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort()
const stamp = Date.now(); const backup = []; let n = 0
for (const im of files) {
  const qid = im.slice(0, 8), suf = im.slice(8)
  const field = suf === '' ? 'question_image' : suf[0] === 'O' ? `option${suf[1]}_image` : suf[0] === 'A' ? `col_a${suf[1]}_image` : `col_b${suf[1]}_image`
  const { data: cur, error: e0 } = await sb.from('questions').select(`qid, is_published, ${field}`).eq('qid', qid)
  if (e0 || cur.length !== 1) { console.error('lookup', qid, e0, cur?.length); process.exit(1) }
  if (cur[0].is_published) { console.error('STOP published', qid); process.exit(1) }
  if (!cur[0][field]) { console.error('STOP no existing image', qid, field); process.exit(1) }
  backup.push({ qid, field, old: cur[0][field] })
  const path = `physics/u${qid.slice(3, 5)}/${im}_redraw_${stamp}.png`
  const { error } = await sb.storage.from('question-images').upload(path, fs.readFileSync(`scripts/phy-upload/img/${im}.png`), { contentType: 'image/png' })
  if (error) { console.error('img', im, error); process.exit(1) }
  const url = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
  const { data, error: e2 } = await sb.from('questions').update({ [field]: url }).eq('qid', qid).eq('is_published', false).select('qid')
  if (e2 || data.length !== 1) { console.error('update', qid, e2, data?.length); process.exit(1) }
  n++
}
console.log('REPLACED', n)
console.log('BACKUP_JSON_START'); console.log(JSON.stringify(backup)); console.log('BACKUP_JSON_END')
