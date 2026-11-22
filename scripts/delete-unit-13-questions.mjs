// One-off, 2026-11-16, at Arun's request: delete every question in Chemistry Unit 13
// so fresh ones can be uploaded. Writes a full backup of the rows first (enough to put
// them back), refuses to run if any student data points at them, then deletes.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { data: rows, error } = await db.from('questions').select('*').eq('subject', 'Chemistry').ilike('unit', 'Unit 13 -%').order('qid')
if (error) throw new Error(error.message)
console.log('questions in Chemistry Unit 13:', rows.length, rows.length ? `(${rows[0].qid} … ${rows.at(-1).qid})` : '')
if (rows.length !== 76) { console.log('Expected 76, stopping so nothing unexpected is deleted.'); process.exit(1) }
const ids = rows.map(r => r.id)

// Anything a student did with these questions.
async function count(table, col) {
  let n = 0
  for (let i = 0; i < ids.length; i += 50) {
    const { count: c, error: e } = await db.from(table).select('id', { count: 'exact', head: true }).in(col, ids.slice(i, i + 50))
    if (e) throw new Error(`${table}: ${e.message}`)
    n += c
  }
  return n
}
const attempts = []
for (let from = 0; ; from += 1000) {
  const { data } = await db.from('test_attempts').select('id, question_ids').range(from, from + 999)
  attempts.push(...data); if (data.length < 1000) break
}
const idSet = new Set(ids)
const inAttempts = attempts.filter(a => (a.question_ids || []).some(q => idSet.has(q))).length
const used = await count('used_questions', 'question_id')
const entries = await count('mistake_entries', 'question_id')
const retries = await count('mistake_retries', 'question_id')
const dismissals = await count('dupe_dismissals', 'question_id')
const logs = (await db.from('answer_key_changes').select('id', { count: 'exact', head: true }).in('qid', rows.map(r => r.qid))).count
console.log({ attemptsContainingThem: inAttempts, used_questions: used, mistake_entries: entries, mistake_retries: retries, dupe_dismissals: dismissals, key_change_log: logs })
if (inAttempts || used || entries || retries) { console.log('Student data points at these questions, stopping.'); process.exit(1) }

const withImages = rows.filter(r => r.question_image || r.option1_image || r.option2_image || r.option3_image || r.option4_image).length
console.log('questions that have images (the image files stay in storage):', withImages)

const backup = `backup-unit-13-questions-deleted-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(backup, JSON.stringify({ questions: rows, dupe_dismissals_count: dismissals }, null, 1))
console.log('backup written:', backup, '|', rows.length, 'full rows')

const { data: gone, error: delErr } = await db.from('questions').delete().in('id', ids).select('id')
if (delErr) { console.log('DELETE FAILED:', delErr.message); process.exit(1) }
console.log('deleted:', gone.length)

const left = await db.from('questions').select('id', { count: 'exact', head: true }).eq('subject', 'Chemistry').ilike('unit', 'Unit 13 -%')
const total = await db.from('questions').select('id', { count: 'exact', head: true })
console.log('Unit 13 questions left:', left.count, '| bank total now:', total.count)
