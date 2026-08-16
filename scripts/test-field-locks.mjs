// Tests for planLockedUpload() — which columns an Excel re-upload may overwrite.
// Pure logic, no DB. Run: node scripts/test-field-locks.mjs
import { planLockedUpload } from '../src/lib/fieldLocks.js'

let pass = 0, fail = 0
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`) }
}

// A row exactly as handleExcelUpload builds it from a sheet.
const sheetRow = qid => ({
  qid,
  question_type: 'MCQ', subject: 'Chemistry', unit: 'Unit 9 - Classification of Elements',
  chapter_name: 'Periodicity', topic: 'Excel Topic', level: 4,
  question: 'Excel question text', option1: 'a', option2: 'b', option3: 'c', option4: 'd',
  correct_option: 'a', difficulty_level: 'Easy', question_tag: 'ExcelTag',
  source: 'ExcelSource', uploaded_by: null,
})

const lockRow = over => ({
  content_locked: false, unit_locked: false, level_locked: false,
  difficulty_locked: false, tag_locked: false, source_locked: false, ...over,
})

const fieldsFor = (plan, qid) => plan.partialUpdates.find(u => u.qid === qid)?.fields

console.log('\n1. New Q ID (not yet in DB) inserts in full, no locking')
{
  const plan = planLockedUpload([sheetRow('NEW1')], new Map())
  check('goes to the batch-upsert path', plan.fullRecords.length === 1)
  check('nothing skipped or partially updated', plan.partialUpdates.length === 0 && plan.skippedQids.length === 0)
}

console.log('\n2. Existing row with no locks updates normally')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow()]]))
  check('still the fast full-upsert path', plan.fullRecords.length === 1 && plan.partialUpdates.length === 0)
}

console.log('\n3. Level locked — the reported bug')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({ level_locked: true })]]))
  const f = fieldsFor(plan, 'Q1')
  check('level is NOT overwritten', !('level' in f), `got keys: ${Object.keys(f)}`)
  check('topic follows level (would otherwise contradict it)', !('topic' in f))
  check('unit still updates (per-field, not all-or-nothing)', f.unit === 'Unit 9 - Classification of Elements')
  check('question text still updates', f.question === 'Excel question text')
  check('options still update', f.option1 === 'a' && f.correct_option === 'a')
  check('difficulty/tag/source still update', f.difficulty_level === 'Easy' && f.question_tag === 'ExcelTag' && f.source === 'ExcelSource')
  check('counted for the toast', plan.fieldLockCounts.Level === 1)
}

console.log('\n4. Each of the 5 fields locks independently')
for (const [lockCol, col, label] of [
  ['unit_locked', 'unit', 'Unit'],
  ['level_locked', 'level', 'Level'],
  ['difficulty_locked', 'difficulty_level', 'Difficulty'],
  ['tag_locked', 'question_tag', 'Question Tag'],
  ['source_locked', 'source', 'Source'],
]) {
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({ [lockCol]: true })]]))
  const f = fieldsFor(plan, 'Q1')
  const others = ['unit', 'level', 'difficulty_level', 'question_tag', 'source'].filter(c => c !== col)
  // topic intentionally rides along with unit/level
  const expectedMissing = col === 'unit' || col === 'level' ? [col, 'topic'] : [col]
  check(`${label}: only ${expectedMissing.join(' + ')} withheld`,
    expectedMissing.every(k => !(k in f)) && others.every(c => c in f || (c === 'topic')),
    `withheld: ${['unit','level','topic','difficulty_level','question_tag','source'].filter(k => !(k in f))}`)
  check(`${label}: counted once`, plan.fieldLockCounts[label] === 1)
}

console.log('\n5. Two locks at once')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({ level_locked: true, source_locked: true })]]))
  const f = fieldsFor(plan, 'Q1')
  check('both withheld', !('level' in f) && !('source' in f))
  check('the other three still update', f.unit && f.difficulty_level && f.question_tag)
}

console.log('\n6. content_locked keeps its original meaning')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({ content_locked: true })]]))
  const f = fieldsFor(plan, 'Q1')
  check('question/options/answer withheld', !('question' in f) && !('option1' in f) && !('correct_option' in f))
  check('metadata still re-syncs, as before', f.unit && f.level === 4 && f.difficulty_level === 'Easy' && f.question_tag && f.source)
  check('counted separately', plan.contentLockedCount === 1 && Object.values(plan.fieldLockCounts).every(n => n === 0))
}

console.log('\n7. content_locked + level_locked together')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({ content_locked: true, level_locked: true })]]))
  const f = fieldsFor(plan, 'Q1')
  check('content withheld', !('question' in f))
  check('level + topic withheld', !('level' in f) && !('topic' in f))
  check('remaining metadata still updates', f.unit && f.difficulty_level && f.question_tag && f.source)
}

console.log('\n8. All 5 + content locked → only the fields nobody can lock still sync')
{
  const plan = planLockedUpload([sheetRow('Q1')], new Map([['Q1', lockRow({
    content_locked: true, unit_locked: true, level_locked: true,
    difficulty_locked: true, tag_locked: true, source_locked: true,
  })]]))
  const f = fieldsFor(plan, 'Q1')
  check('all five withheld', ['unit', 'level', 'difficulty_level', 'question_tag', 'source'].every(k => !(k in f)))
  check('topic withheld too', !('topic' in f))
  check('content withheld', !('question' in f) && !('option1' in f))
  // subject/chapter_name aren't among the five lockable fields, so they keep syncing
  check('subject + chapter_name still update', f.subject === 'Chemistry' && f.chapter_name === 'Periodicity',
    `got: ${JSON.stringify(f)}`)
}

console.log('\n9. Lock state itself survives a re-upload')
{
  const plan = planLockedUpload(
    [sheetRow('Q1'), sheetRow('Q2'), sheetRow('NEW1')],
    new Map([['Q1', lockRow({ level_locked: true })], ['Q2', lockRow()]]))
  const everyPayload = [...plan.fullRecords, ...plan.partialUpdates.map(u => u.fields)]
  const lockCols = ['content_locked', 'unit_locked', 'level_locked', 'difficulty_locked', 'tag_locked', 'source_locked']
  check('no payload writes any lock column',
    everyPayload.every(p => lockCols.every(c => !(c in p))))
  check('mixed batch splits correctly: 2 unlocked upserted, 1 locked updated',
    plan.fullRecords.length === 2 && plan.partialUpdates.length === 1)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
