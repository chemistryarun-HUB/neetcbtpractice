// One-off: add the missing MCQs 14-46 to Chemistry July 2022 (English) from
// Arun's photos, attach the Q25 graph, then publish if the paper is complete.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const q = async p => { const { data, error } = await p; if (error) throw new Error(error.message); return data }
const rows = JSON.parse(readFileSync(new URL('./rows.json', import.meta.url)))

const papers = await q(sb.from('gseb_papers').select('*').match({ subject: 'chemistry', year: 2022, session: 'july', medium: 'en' }))
if (papers.length !== 1) throw new Error(`expected 1 paper, found ${papers.length}`)
const paper = papers[0]
const before = await q(sb.from('gseb_questions').select('q_no').eq('paper_id', paper.id))
console.log('BEFORE', before.length, 'MCQ:', before.map(r => r.q_no).sort((a, b) => a - b).join(','))
const clash = rows.filter(r => before.some(b => b.q_no === r.q_no))
if (clash.length) throw new Error(`already there: ${clash.map(r => r.q_no)}`)

await q(sb.from('gseb_questions').insert(rows.map(r => ({ ...r, paper_id: paper.id }))))

const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`
const { error: upErr } = await sb.storage.from('question-images').upload(path, readFileSync(new URL('./A25.png', import.meta.url)), { contentType: 'image/png', upsert: false })
if (upErr) throw upErr
const { data: { publicUrl } } = sb.storage.from('question-images').getPublicUrl(path)
await q(sb.from('gseb_questions').update({ question_image: publicUrl }).eq('paper_id', paper.id).eq('q_no', 25))

const after = await q(sb.from('gseb_questions').select('q_no, correct_option, question, question_image, chapter_no').eq('paper_id', paper.id))
const nums = new Set(after.map(r => r.q_no))
const missing = []; for (let n = 1; n <= paper.mcq_count; n++) if (!nums.has(n)) missing.push(n)
const noKey = after.filter(r => !r.correct_option).map(r => r.q_no)
const noCh = after.filter(r => !r.chapter_no).map(r => r.q_no)
console.log('AFTER', after.length, 'missing', missing, 'noKey', noKey, 'noChapter', noCh, 'Q25 image', !!after.find(r => r.q_no === 25)?.question_image)
if (!missing.length && !noKey.length) {
  await q(sb.from('gseb_papers').update({ is_published: true }).eq('id', paper.id))
  console.log('PUBLISHED')
}
const pub = await q(sb.from('gseb_papers').select('is_published'))
console.log('papers published', pub.filter(p => p.is_published).length, 'of', pub.length)
