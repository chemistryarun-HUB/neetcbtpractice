// One-off: (1) strip the wrong "jee main " prefix off tags that combine it with
// "IIT-JEE <year>" — IIT-JEE predates JEE Main (which started 2013), so tagging
// an IIT-JEE paper as JEE Main is simply incorrect, not a second exam sitting.
// (2) rename four MTG source labels to Arun's preferred short forms. Both are
// straight text corrections requested by Arun directly (2026-09-11) — no grading
// impact, correct_option/options untouched.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const APPLY = process.argv.includes('--apply')

const SOURCE_RENAMES = [
  ['MTG PYQ Amines', 'MTG Amines'],
  ['MTG PYQ OrgBasics', 'MTG Org Basics'],
  ['MTG Alcohols Phenols Ethers', 'MTG APE'],
  ['MTG PYQ AldKetAcid', 'MTG AKC'],
]
const TAG_RE = /^jee\s*main\s+(?=iit-jee)/i

let all = []
let from = 0
while (true) {
  const { data, error } = await supabase.from('questions')
    .select('id, qid, question_tag, source')
    .range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all = all.concat(data)
  if (data.length < 1000) break
  from += 1000
}

const updates = []
for (const r of all) {
  let newTag = r.question_tag
  let newSource = r.source
  if (newTag && TAG_RE.test(newTag)) newTag = newTag.replace(TAG_RE, '').trim()
  if (newSource) {
    for (const [from_, to_] of SOURCE_RENAMES) {
      if (newSource.includes(from_)) { newSource = newSource.split(from_).join(to_); break }
    }
  }
  if (newTag !== r.question_tag || newSource !== r.source) {
    updates.push({ id: r.id, qid: r.qid, from_tag: r.question_tag, to_tag: newTag, from_source: r.source, to_source: newSource })
  }
}

console.log(`${all.length} questions scanned, ${updates.length} need an update.`)
const tagChanges = updates.filter(u => u.from_tag !== u.to_tag).length
const sourceChanges = updates.filter(u => u.from_source !== u.to_source).length
console.log(`  tag changes: ${tagChanges}, source changes: ${sourceChanges}`)

if (!APPLY) {
  console.log('\n--- DRY RUN (pass --apply to write) --- sample of 15:')
  for (const u of updates.slice(0, 15)) {
    console.log(`  ${u.qid}: tag "${u.from_tag}" -> "${u.to_tag}" | source "${u.from_source}" -> "${u.to_source}"`)
  }
  process.exit(0)
}

writeFileSync(
  new URL(`../backup-tag-source-fix-2026-09-11.json`, import.meta.url),
  JSON.stringify(updates.map(u => ({ id: u.id, qid: u.qid, question_tag: u.from_tag, source: u.from_source })), null, 2)
)
console.log('Backup written.')

let ok = 0, fail = 0
for (const u of updates) {
  const payload = {}
  if (u.from_tag !== u.to_tag) payload.question_tag = u.to_tag
  if (u.from_source !== u.to_source) payload.source = u.to_source
  const { error } = await supabase.from('questions').update(payload).eq('id', u.id)
  if (error) { console.error(`Failed ${u.qid}:`, error.message); fail++ } else ok++
}
console.log(`Done. ${ok} updated, ${fail} failed.`)
