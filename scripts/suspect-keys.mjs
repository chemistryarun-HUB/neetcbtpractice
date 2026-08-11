// Read-only. Ranks active questions by how likely their answer key is wrong,
// using the same analysis the admin "Suspect Keys" tab shows.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { analyseAnswerKeys, ITEM_ANALYSIS_RULES } from '../src/lib/itemAnalysis.js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function pageAll(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const questions = await pageAll(() => sb.from('questions')
  .select('id, qid, question, unit, level, option1, option2, option3, option4, correct_option, is_active'))
const attempts = await pageAll(() => sb.from('test_attempts')
  .select('id, score, correct_count, wrong_count, skipped_count, answers').eq('submitted', true))

const rows = analyseAnswerKeys({ attempts, questions: questions.filter(q => q.is_active !== false) })

console.log(`Rules: >= ${ITEM_ANALYSIS_RULES.MIN_RESPONSES} responses, rival needs >= ${ITEM_ANALYSIS_RULES.MIN_OPTION_RESPONSES} picks and a >= ${ITEM_ANALYSIS_RULES.SUSPICION_THRESHOLD}pt lead.\n`)
console.log(`${rows.length} question(s) look mis-keyed:\n`)

for (const r of rows) {
  console.log(`${r.qid}  (${r.unit} · L${r.level} · ${r.responses} responses)`)
  console.log(`  ${r.question.slice(0, 100).replace(/\s+/g, ' ')}`)
  console.log(`  why:   ${r.reasons.join('; ')}`)
  console.log(`  keyed  ${r.keyed.letter}: "${(r.keyed.text || '(image)').slice(0, 60)}" — ${r.keyed.count} picked, avg ${r.keyed.meanPct.toFixed(0)}%`)
  if (r.rival) {
    console.log(`  rival  ${r.rival.letter}: "${(r.rival.text || '(image)').slice(0, 60)}" — ${r.rival.count} picked, avg ${r.rival.meanPct.toFixed(0)}%`)
  }
  if (r.keyedOutperforms) {
    console.log(`  NOTE:  the key's students beat the field by ${r.discrimination.toFixed(0)} pts — likely just a hard question, check before changing anything`)
  }
  console.log('')
}
if (!rows.length) console.log('  (none)')
