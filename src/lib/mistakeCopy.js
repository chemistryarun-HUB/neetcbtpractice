// The Mistake Copy: every question a student got wrong or skipped.
//
// Which questions are in it, and whether each is Pending or Cleared, is worked
// out afresh from every level test, GSEB test and re-attempt, graded against the CURRENT
// answer key. Nothing about that is stored, so correcting a key moves a question
// out of (or into) the copy on its own, with no re-grade needed first. Only what
// the student picks as Error Type and the teacher's check are saved
// (migration_mistake_copy.sql).
import { supabase } from './supabase'
import { attemptGrading } from './attemptGrading'
import { liveStatusOf } from './regrade'
import { courseUnitId, fromCourseUnitId, MARKS_CORRECT } from './constants'
import { practiceUnitName } from './subjects'
import { GSEB_QUESTION_SELECT, GSEB_SUBJECT_LABELS, chapterName, gsebReviewQuestion, paperTitle } from './gseb'
import { levelBadgeT, unitName } from './neetI18n'

export const ERROR_TYPES = ['conceptual', 'calculation', 'reading', 'time', 'guesswork', 'silly', 'other']

// Right on this many different days = Cleared. Getting it right straight after
// asking the teacher only shows the answer is still fresh, so one day isn't proof.
export const CLEAR_AFTER_DAYS = 2

// One calendar for student, teacher and admin alike, whatever the device's clock says.
const IST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
export const istDay = ts => IST.format(new Date(ts))
export const fmtDay = ts => new Date(ts).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })

const attemptTime = a => a.submitted_at || a.started_at

// From the question, not the attempt: a few old attempts have no unit_id at all.
function unitIdOf(q, attempt) {
  const unit = Number(String(q.unit || '').match(/^Unit\s+(\d+)/i)?.[1])
  return unit ? courseUnitId(q.subject, unit) : attempt.unit_id
}

function isTableMissing(err) {
  return err?.code === '42P01' || err?.code === 'PGRST205' || /does not exist|schema cache/i.test(err?.message || '')
}

// A single Supabase request caps at 1000 rows.
async function fetchAll(build) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}

async function fetchQuestions(ids, table = 'questions', columns = '*') {
  const chunks = []
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100))
  const rows = []
  for (let i = 0; i < chunks.length; i += 4) {
    const results = await Promise.all(chunks.slice(i, i + 4).map(chunk => supabase.from(table).select(columns).in('id', chunk)))
    for (const { data, error } of results) {
      if (error) throw error
      rows.push(...(data || []))
    }
  }
  return rows
}

export async function loadMistakeData(studentId) {
  const attempts = await fetchAll(() => supabase.from('test_attempts')
    .select('id, student_id, unit_id, level, score, correct_count, wrong_count, skipped_count, submitted_at, started_at, question_ids, answers')
    .eq('student_id', studentId).eq('submitted', true))
  const questions = await fetchQuestions([...new Set(attempts.flatMap(a => a.question_ids || []))])
  const gsebAttempts = await fetchAll(() => supabase.from('gseb_attempts').select('*').eq('student_id', studentId).eq('submitted', true))
  const gsebQuestions = await fetchQuestions([...new Set(gsebAttempts.flatMap(a => a.question_ids || []))], 'gseb_questions', GSEB_QUESTION_SELECT)

  // The copy can still be read before the migration has run; only saving needs it.
  let setupMissing = false
  const optional = build => fetchAll(build).catch(err => {
    if (!isTableMissing(err)) throw err
    setupMissing = true
    return []
  })
  const [entries, retries] = await Promise.all([
    optional(() => supabase.from('mistake_entries').select('*').eq('student_id', studentId)),
    optional(() => supabase.from('mistake_retries').select('*').eq('student_id', studentId)),
  ])
  return {
    attempts: [...attempts, ...gsebAttempts.map(a => ({ ...a, kind: 'gseb' }))],
    questions: [...questions, ...gsebQuestions.map(gsebReviewQuestion)],
    entries, retries, setupMissing,
  }
}

// Where a question sits in the copy. A level test's question goes under its unit
// and level, a GSEB one under its board chapter, which has no levels.
function placementOf(q, attempt) {
  if (attempt.kind === 'gseb') {
    const subjectId = q.paper?.subject || attempt.subject
    const chapter = q.chapter_no ?? null
    return {
      source: 'gseb', unitId: null, level: null,
      subject: GSEB_SUBJECT_LABELS[subjectId] || 'Other',
      groupKey: `g-${subjectId}-${chapter ?? 0}`, groupNumber: chapter,
      groupName: chapterName(subjectId, chapter) || 'Other chapters',
    }
  }
  const unitId = unitIdOf(q, attempt)
  const { subject, unit } = fromCourseUnitId(unitId)
  return {
    source: 'neet', unitId, level: q.level ?? attempt.level, subject,
    groupKey: `u${unitId}`, groupNumber: unit, groupName: practiceUnitName(unitId),
  }
}

// The chapter's name alone, for a heading with its number shown beside it.
export function groupName(group, medium) {
  return group.source === 'gseb' ? `GSEB · ${group.groupName}` : unitName({ name: group.groupName }, group.unitId, medium)
}

// "Unit 2: Atomic Structure" / "GSEB · Ch 5: Molecular Basis of Inheritance"
export function groupLabel(group, medium, t) {
  if (group.source === 'gseb') return `GSEB · ${group.groupNumber ? `Ch ${group.groupNumber}: ` : ''}${group.groupName}`
  return `${t.unit(group.groupNumber)}: ${groupName(group, medium)}`
}

// A test group's full name, for the PDF's header.
export function testName(group, medium, t) {
  const { attempt } = group.test
  if (group.source === 'gseb') return group.paper ? paperTitle(group.paper) : attempt.title || 'GSEB test'
  return `${t.unit(group.groupNumber)} · ${groupName(group, medium)} · ${levelBadgeT(group.unitId, attempt.level, medium)} · ${t.mcAttempt(group.test.position)}`
}

/**
 * Replays each question's history, oldest first:
 *   wrong   → in the copy; the correct-days count starts again
 *   skipped → in the copy if it wasn't already, otherwise changes nothing
 *   correct → counts one day once the question is in the copy; before that it
 *             means nothing, since a question that was never missed isn't a mistake
 */
export function buildMistakeCopy({ attempts = [], questions = [], entries = [], retries = [], today = istDay(new Date()) }) {
  const questionById = new Map(questions.map(q => [q.id, q]))
  const entryByQuestion = new Map(entries.map(e => [e.question_id, e]))
  const history = new Map()
  const addEvent = (qid, event) => {
    if (!history.has(qid)) history.set(qid, [])
    history.get(qid).push(event)
  }

  const ordered = [...attempts].sort((a, b) => new Date(attemptTime(a)) - new Date(attemptTime(b)))
  const positions = {}
  for (const attempt of ordered) {
    const slot = attempt.kind === 'gseb' ? `g-${attempt.paper_id || attempt.title}` : `${attempt.unit_id}-${attempt.level}`
    positions[slot] = (positions[slot] || 0) + 1
    const test = { attempt, position: positions[slot] }

    const stored = attempt.answers || {}
    const responses = stored.responses !== undefined ? (stored.responses || {}) : stored
    const grading = attemptGrading(attempt)
    for (const qid of attempt.question_ids || []) {
      const q = questionById.get(qid)
      if (!q) continue
      addEvent(qid, {
        at: attemptTime(attempt),
        status: liveStatusOf(q, responses[qid]),
        selected: responses[qid] || null,
        optionOrder: stored.option_order?.[qid] || null,
        test,
        keyChanged: !!grading.keyChangedOf(q),
      })
    }
  }
  for (const retry of retries) {
    const q = questionById.get(retry.question_id)
    if (!q) continue
    addEvent(retry.question_id, {
      at: retry.created_at,
      status: liveStatusOf(q, retry.selected),
      selected: retry.selected,
      optionOrder: retry.option_order,
      test: null,
    })
  }

  const items = []
  for (const [qid, events] of history) {
    const q = questionById.get(qid)
    // A question taken out of service leaves the copy along with the bank.
    if (q.is_active === false || q.is_published === false) continue
    events.sort((a, b) => new Date(a.at) - new Date(b.at))

    let wrongCount = 0, skippedCount = 0, lastMistake = null, lastTest = null, keyChanged = false
    let correctDays = new Set(), clearedOn = null
    for (const e of events) {
      if (e.status === 'correct') {
        if (!lastMistake) continue
        correctDays.add(istDay(e.at))
        if (!clearedOn && correctDays.size >= CLEAR_AFTER_DAYS) clearedOn = e.at
        continue
      }
      if (e.status === 'skipped') {
        skippedCount++
        if (lastMistake) continue
      } else {
        wrongCount++
        correctDays = new Set()
        clearedOn = null
      }
      lastMistake = e
      if (e.test) lastTest = e.test
      if (e.keyChanged) keyChanged = true
    }
    // Re-attempts only ever follow a test, so no test left means nothing to show.
    if (!lastMistake || !lastTest) continue

    const entry = entryByQuestion.get(qid) || null
    const pending = !clearedOn
    items.push({
      q,
      entry,
      status: pending ? 'pending' : 'cleared',
      ...placementOf(q, lastTest.attempt),
      test: lastTest,
      wrongCount,
      skippedCount,
      repeat: wrongCount >= 2,
      lastMistake,
      keyChanged,
      correctDays: correctDays.size,
      clearedOn,
      doneToday: correctDays.has(today),
      // Right today already counts for today, so another go today can't help.
      canRetry: pending && !correctDays.has(today),
    })
  }
  return items.sort((a, b) => new Date(b.lastMistake.at) - new Date(a.lastMistake.at))
}

const subjectRank = s => ['Chemistry', 'Physics', 'Biology'].indexOf(s)

const groupFields = it => ({
  source: it.source, unitId: it.unitId, subject: it.subject, groupNumber: it.groupNumber, groupName: it.groupName,
})

// Level-test chapters first within a subject, then GSEB chapters.
export function groupByChapter(items) {
  const units = new Map()
  for (const it of items) {
    if (!units.has(it.groupKey)) units.set(it.groupKey, { key: it.groupKey, ...groupFields(it), items: [], levels: new Map() })
    const unit = units.get(it.groupKey)
    unit.items.push(it)
    if (!unit.levels.has(it.level)) unit.levels.set(it.level, [])
    unit.levels.get(it.level).push(it)
  }
  return [...units.values()]
    .map(u => ({ ...u, levels: [...u.levels.entries()].sort((a, b) => a[0] - b[0]).map(([level, levelItems]) => ({ level, items: levelItems })) }))
    .sort((a, b) => subjectRank(a.subject) - subjectRank(b.subject)
      || (a.source === 'gseb') - (b.source === 'gseb')
      || (a.groupNumber ?? 999) - (b.groupNumber ?? 999))
}

export function groupByTest(items) {
  const tests = new Map()
  for (const it of items) {
    const id = it.test.attempt.id
    if (!tests.has(id)) tests.set(id, { key: `t${id}`, test: it.test, ...groupFields(it), paper: it.test.attempt.paper_id ? it.q.paper : null, items: [] })
    tests.get(id).items.push(it)
  }
  return [...tests.values()].sort((a, b) => new Date(attemptTime(b.test.attempt)) - new Date(attemptTime(a.test.attempt)))
}

export function testMarks(attempt) {
  const total = (attempt.correct_count || 0) + (attempt.wrong_count || 0) + (attempt.skipped_count || 0)
  return { score: attempt.score ?? 0, max: attempt.kind === 'gseb' ? total : total * MARKS_CORRECT }
}

export const testDate = attempt => fmtDay(attemptTime(attempt))

// "Silly Mistake 45% · Conceptual 30%", most common first.
export function errorSummary(items) {
  const counts = {}
  let total = 0
  for (const it of items) {
    const type = it.entry?.error_type
    if (!type) continue
    counts[type] = (counts[type] || 0) + 1
    total++
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
}

// Only the columns in `patch` are written, so saving one field can't overwrite
// another saved a moment earlier.
export async function saveMistakeEntry(studentId, questionId, patch) {
  const { data, error } = await supabase.from('mistake_entries')
    .upsert({ student_id: studentId, question_id: questionId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'student_id,question_id' })
    .select().single()
  if (error) throw error
  return data
}

export async function setMistakesChecked(studentId, questionIds, checkedBy) {
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('mistake_entries')
    .upsert(questionIds.map(question_id => ({
      student_id: studentId, question_id, updated_at: now,
      checked_at: checkedBy ? now : null, checked_by: checkedBy,
    })), { onConflict: 'student_id,question_id' })
    .select()
  if (error) throw error
  return data || []
}

export async function saveRetries(studentId, answers) {
  if (!answers.length) return []
  const { data, error } = await supabase.from('mistake_retries')
    .insert(answers.map(a => ({ student_id: studentId, question_id: a.questionId, selected: a.selected, option_order: a.optionOrder })))
    .select()
  if (error) throw error
  return data || []
}
