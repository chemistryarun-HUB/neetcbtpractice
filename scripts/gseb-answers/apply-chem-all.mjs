// One-off, 2026-11-20, at Arun's request ("Chemistry ke saare papers"): write
// NCERT-based model answers for Part B of the 10 Chemistry papers other than
// 2024 Main (scripts/gseb-answers/chem/ch01..ch10.mjs), plus drawn isomer
// figures for 9 Coordination Compounds questions (chem/img/).
// Safety: a row is written only when its question text, marks and chapter are
// what the answers were written against (chem/expect.json, read from the live
// app the same day) AND it has no answer yet, so nothing typed in admin is
// overwritten. Dry run by default; --apply writes.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const dir = new URL('./chem/', import.meta.url)
const EXPECT = JSON.parse(readFileSync(new URL('expect.json', dir)))

const ANSWERS = {}, IMAGES = {}
for (let c = 1; c <= 10; c++) {
  const m = await import(new URL(`ch${String(c).padStart(2, '0')}.mjs`, dir))
  for (const [k, v] of Object.entries(m.ANSWERS)) { if (ANSWERS[k]) throw new Error(`duplicate ${k}`); ANSWERS[k] = v }
  Object.assign(IMAGES, m.IMAGES || {})
}
const keys = Object.keys(EXPECT)
const missing = keys.filter(k => !ANSWERS[k])
if (missing.length || Object.keys(ANSWERS).length !== keys.length) throw new Error(`answers ${Object.keys(ANSWERS).length} vs expected ${keys.length}; missing ${missing}`)

const { data: papers, error } = await sb.from('gseb_papers').select('id, year, session, medium, set_no').eq('subject', 'chemistry').eq('medium', 'en')
if (error) throw new Error(error.message)
const paperOf = {}
for (const p of papers) {
  if ((p.set_no || '') !== '') continue
  const tag = `${p.year}${p.session === 'march' ? 'M' : 'S'}`
  if (paperOf[tag]) throw new Error(`two papers for ${tag}`)
  paperOf[tag] = p.id
}

// Upload each figure once (only on --apply).
const imageUrl = {}
for (const file of new Set(Object.values(IMAGES))) {
  const path = `gseb-answers/chemistry/${file}`
  if (APPLY) {
    const { error: eu } = await sb.storage.from('question-images').upload(path, readFileSync(new URL(`img/${file}`, dir)), { contentType: 'image/png', upsert: false })
    if (eu && !/exists|duplicate/i.test(eu.message)) throw new Error(`upload ${file}: ${eu.message}`)
  }
  imageUrl[file] = sb.storage.from('question-images').getPublicUrl(path).data.publicUrl
}

const byPaper = {}
for (const k of keys) (byPaper[k.split('-')[0]] ||= []).push(k)
let written = 0, images = 0
const skipped = []
for (const [tag, list] of Object.entries(byPaper)) {
  const pid = paperOf[tag]
  if (!pid) { skipped.push(`${tag} (paper not found)`); continue }
  const { data: rows, error: e2 } = await sb.from('gseb_subjective').select('id, q_no, marks, chapter_no, question, answer, answer_image').eq('paper_id', pid)
  if (e2) throw new Error(e2.message)
  let n = 0
  for (const k of list) {
    const q = Number(k.split('-')[1]), ex = EXPECT[k]
    const hits = rows.filter(r => r.q_no === q)
    if (hits.length !== 1) { skipped.push(`${k} (${hits.length} rows)`); continue }
    const row = hits[0]
    if (row.question !== ex.q || row.marks !== ex.marks || row.chapter_no !== ex.ch) { skipped.push(`${k} (question changed since)`); continue }
    if ((row.answer || '').trim()) { skipped.push(`${k} (already has an answer)`); continue }
    const patch = { answer: ANSWERS[k] }
    if (IMAGES[k] && !row.answer_image) { patch.answer_image = imageUrl[IMAGES[k]]; images++ }
    if (APPLY) {
      const { error: e3 } = await sb.from('gseb_subjective').update(patch).eq('id', row.id)
      if (e3) throw new Error(`${k}: ${e3.message}`)
    }
    written++; n++
  }
  console.log(`${tag}: ${APPLY ? 'wrote' : 'would write'} ${n} of ${list.length}`)
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}: answers ${written} / ${keys.length}, figures ${images}; skipped: ${skipped.join(', ') || 'none'}`)
if (skipped.length) process.exitCode = 1
