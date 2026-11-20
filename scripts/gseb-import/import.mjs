// One-off bulk import of the extracted GSEB board papers (Excel + diagrams),
// doing what Admin → GSEB Papers → New paper / Upload Excel / Upload Diagrams
// does, for every file under data/<subject>/. Papers go in as drafts.
//
// Never duplicates: a paper that already exists (same subject, year, session,
// medium, set) with questions in it is left alone.
//
// Dry-run by default. Pass --apply to write. Reads VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY from the environment.
import { readFileSync, readdirSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseGsebQuestionsFile, GSEB_SUBJECTS } from '../../src/lib/gseb.js'

const APPLY = process.argv.includes('--apply')
const DATA = new URL('./data/', import.meta.url)
const sb = APPLY || process.env.VITE_SUPABASE_URL
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  : null

// GSEB_Physics_P05_March2023_EN.xlsx → { pNo: 5, year: 2023, session: 'march' }
function metaFromName(name) {
  const m = name.match(/_P(\d+)_([A-Za-z]+)(\d{4})_EN\.xlsx$/)
  if (!m) return null
  const month = m[2].toLowerCase()
  // March / May are the main exam; June / July are the supplementary.
  const session = ['june', 'july', 'jul', 'jun', 'august'].includes(month) ? 'july' : 'march'
  return { pNo: Number(m[1]), monthLabel: m[2], year: Number(m[3]), session }
}

async function q(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

const summary = []
for (const subj of GSEB_SUBJECTS) {
  const dir = new URL(`${subj.id}/`, DATA)
  if (!existsSync(dir)) continue
  const files = readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort()
  const images = existsSync(new URL('images/', dir)) ? readdirSync(new URL('images/', dir)) : []

  for (const file of files) {
    const meta = metaFromName(file)
    if (!meta) { summary.push({ subject: subj.id, file, status: 'SKIPPED: name not understood' }); continue }
    const buf = readFileSync(new URL(file, dir))
    const parsed = parseGsebQuestionsFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 50)
    const partB = parsed.partB
    const myImages = images.filter(i => i.startsWith(`p${meta.pNo}_`))
    const row = {
      subject: subj.id, file, year: meta.year, session: meta.session,
      mcq: parsed.questions.length, partB: partB.questions.length, images: myImages.length,
      skipped: [...parsed.skipped, ...partB.skipped].length,
    }

    if (!sb) { summary.push({ ...row, status: 'dry-run' }); continue }

    const key = { subject: subj.id, year: meta.year, session: meta.session, medium: 'en', set_no: '' }
    let paper = (await q(sb.from('gseb_papers').select('*, gseb_questions(count), gseb_subjective(count)').match(key)))[0]
    const existingMcq = paper?.gseb_questions?.[0]?.count || 0
    const existingB = paper?.gseb_subjective?.[0]?.count || 0
    const already = paper && (existingMcq || existingB)
    if (!APPLY) {
      summary.push({ ...row, status: already ? `ALREADY THERE (${existingMcq} MCQ, ${existingB} Part B) — questions left alone, would only add missing diagrams` : paper ? 'would fill empty paper' : 'would create' })
      continue
    }

    if (!paper) {
      paper = (await q(sb.from('gseb_papers').insert({
        ...key, paper_code: subj.paperCode, duration_min: 60, mcq_count: 50, is_published: false,
      }).select()))[0]
    }
    // An existing paper keeps its questions (the admin may have edited them);
    // it only gets diagrams on questions that have none yet.
    if (!already && parsed.questions.length) {
      await q(sb.from('gseb_questions').upsert(parsed.questions.map(x => ({ ...x, paper_id: paper.id })), { onConflict: 'paper_id,q_no' }))
    }
    if (!already && partB.questions.length) {
      await q(sb.from('gseb_subjective').upsert(partB.questions.map(x => ({ ...x, paper_id: paper.id })), { onConflict: 'paper_id,q_no' }))
      await q(sb.from('gseb_papers').update({ part_b_rules: partB.rules }).eq('id', paper.id))
    }

    // Same naming and storage path scheme as Upload Diagrams (lib/storage.js).
    const failed = []
    let attached = 0
    for (const img of myImages) {
      const m = img.match(/([AB])\s*(\d+)\.(png|jpe?g|webp|gif)$/i)
      if (!m) { failed.push(`${img} (name)`); continue }
      const table = m[1].toUpperCase() === 'A' ? 'gseb_questions' : 'gseb_subjective'
      const target = (await q(sb.from(table).select('id, question_image').eq('paper_id', paper.id).eq('q_no', Number(m[2]))))[0]
      if (!target) { failed.push(`${img} (no such question)`); continue }
      if (target.question_image) continue // already has a diagram: keep it
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${m[3].toLowerCase()}`
      const { error } = await sb.storage.from('question-images')
        .upload(path, readFileSync(new URL(`images/${img}`, dir)), { contentType: 'image/png', upsert: false })
      if (error) { failed.push(`${img} (${error.message})`); continue }
      const { data: { publicUrl } } = sb.storage.from('question-images').getPublicUrl(path)
      await q(sb.from(table).update({ question_image: publicUrl }).eq('id', target.id))
      attached++
    }
    summary.push({ ...row, status: `${already ? 'ALREADY THERE, questions kept' : 'UPLOADED'}, ${attached} new diagram(s)${failed.length ? ' — failed: ' + failed.join(', ') : ''}` })
  }
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${summary.length} files\n`)
for (const r of summary) console.log(`${r.subject.padEnd(9)} ${r.file.padEnd(40)} MCQ ${String(r.mcq).padStart(2)}  PartB ${String(r.partB).padStart(2)}  img ${String(r.images).padStart(2)}  skipped ${r.skipped}  → ${r.status}`)

if (sb) {
  // Proof: what the database holds now, per subject.
  const papers = await q(sb.from('gseb_papers').select('id, subject, year, session, is_published, gseb_questions(count), gseb_subjective(count)').order('subject').order('year'))
  const imgA = await q(sb.from('gseb_questions').select('paper_id').not('question_image', 'is', null))
  const imgB = await q(sb.from('gseb_subjective').select('paper_id').not('question_image', 'is', null))
  console.log('\nDATABASE NOW')
  for (const s of GSEB_SUBJECTS) {
    const ps = papers.filter(p => p.subject === s.id)
    const ids = new Set(ps.map(p => p.id))
    const mcq = ps.reduce((a, p) => a + (p.gseb_questions?.[0]?.count || 0), 0)
    const b = ps.reduce((a, p) => a + (p.gseb_subjective?.[0]?.count || 0), 0)
    const img = [...imgA, ...imgB].filter(r => ids.has(r.paper_id)).length
    console.log(`${s.label.padEnd(10)} papers ${ps.length}  MCQ ${mcq}  Part B ${b}  diagrams ${img}  published ${ps.filter(p => p.is_published).length}`)
  }
}
if (summary.some(r => /failed|SKIPPED/.test(r.status))) process.exitCode = 1
