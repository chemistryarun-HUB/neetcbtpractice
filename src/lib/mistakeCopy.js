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

// 'time' (Time Mismanagement) is no longer offered: running out of time shows up as
// a skipped question, and "Didn't get time" below covers it. A 'time' already saved
// still reads as its name, and typeKeysFor keeps it in its dropdown.
export const ERROR_TYPES = ['conceptual', 'calculation', 'reading', 'guesswork', 'silly', 'other']
// Why a question was left blank. Same column as ERROR_TYPES (a question is
// tagged once), but a skipped question is offered these instead.
export const SKIP_REASONS = ['forgot', 'never_read', 'not_understood', 'no_time']

// The dropdown's options for a wrong or a skipped question. A value already saved
// from the other list (skipped once, wrong later) is kept, so the dropdown never
// shows a blank for something that is stored.
export function typeKeysFor(skipped, current) {
  const list = skipped ? SKIP_REASONS : ERROR_TYPES
  return current && !list.includes(current) ? [...list, current] : list
}

// How many questions one re-attempt holds by default, as everywhere else in the app.
export const RETEST_SIZES = [25, 50]

// The questions for a re-attempt of `size` (a number, or 'all'): repeat mistakes
// first, the rest in random order, so 25 at a time works through the whole copy.
export function pickForRetest(items, size) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  shuffled.sort((a, b) => Number(b.repeat) - Number(a.repeat))
  return size === 'all' ? shuffled : shuffled.slice(0, size)
}

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
  // Online practice papers (migration_online_papers.sql). Before that setup has
  // run the table is missing, and the copy simply has none.
  const paperAttempts = await fetchAll(() => supabase.from('online_paper_attempts').select('*').eq('student_id', studentId).eq('submitted', true))
    .catch(err => { if (isTableMissing(err)) return []; throw err })
  let paperTitles = {}
  if (paperAttempts.length) {
    const { data: papers } = await supabase.from('online_papers').select('id, title').in('id', [...new Set(paperAttempts.map(a => a.paper_id))])
    paperTitles = Object.fromEntries((papers || []).map(p => [p.id, p.title]))
  }
  const knownIds = new Set(questions.map(q => q.id))
  const paperQuestions = await fetchQuestions([...new Set(paperAttempts.flatMap(a => a.question_ids || []))].filter(id => !knownIds.has(id)))

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
    attempts: [
      ...attempts,
      ...gsebAttempts.map(a => ({ ...a, kind: 'gseb' })),
      ...paperAttempts.map(a => ({ ...a, kind: 'paper', title: paperTitles[a.paper_id] || 'Practice paper' })),
    ],
    questions: [...questions, ...paperQuestions, ...gsebQuestions.map(gsebReviewQuestion)],
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
  if (attempt.kind === 'paper') return `${attempt.title} · ${t.mcPracticePaper}`
  return `${t.unit(group.groupNumber)} · ${groupName(group, medium)} · ${levelBadgeT(group.unitId, attempt.level, medium)} · ${t.mcAttempt(group.test.position)}`
}

/**
 * Replays each question's history, oldest first:
 *   wrong   → in the copy; the correct-days count starts again
 *   skipped → in the copy if it wasn't already, otherwise changes nothing
 *   correct → counts one day once the question is in the copy; before that it
 *             means nothing, since a question that was never missed isn't a mistake
 */
// Every answer a student has given to each question in their tests, graded against
// the CURRENT key, as question id -> events. Shared by the Mistake Copy and the
// Bookmarked list, which need the same replay.
function replayAttempts(attempts, questionById) {
  const history = new Map()
  const ordered = [...attempts].sort((a, b) => new Date(attemptTime(a)) - new Date(attemptTime(b)))
  const positions = {}
  for (const attempt of ordered) {
    const slot = attempt.kind === 'gseb' ? `g-${attempt.paper_id || attempt.title}`
      : attempt.kind === 'paper' ? `p-${attempt.paper_id}` : `${attempt.unit_id}-${attempt.level}`
    positions[slot] = (positions[slot] || 0) + 1
    const test = { attempt, position: positions[slot] }

    const stored = attempt.answers || {}
    const responses = stored.responses !== undefined ? (stored.responses || {}) : stored
    const grading = attemptGrading(attempt)
    for (const qid of attempt.question_ids || []) {
      const q = questionById.get(qid)
      if (!q) continue
      if (!history.has(qid)) history.set(qid, [])
      history.get(qid).push({
        at: attemptTime(attempt),
        status: liveStatusOf(q, responses[qid]),
        selected: responses[qid] || null,
        optionOrder: stored.option_order?.[qid] || null,
        test,
        keyChanged: !!grading.keyChangedOf(q),
      })
    }
  }
  return history
}

// Buckets: every mistake from a test lands in bucket 1 (Main). A question
// answered wrong or left blank in a re-attempt moves one bucket up, up to the
// last one; answered right (in a re-attempt or a later test) it is Cleared.
// Going wrong again in a test sends it back to Main.
export const BUCKETS = [1, 2, 3, 4, 5]
const LAST_BUCKET = BUCKETS[BUCKETS.length - 1]

function replayCopy({ attempts = [], questions = [], entries = [], retries = [] }) {
  const questionById = new Map(questions.map(q => [q.id, q]))
  const entryByQuestion = new Map(entries.map(e => [e.question_id, e]))
  const history = replayAttempts(attempts, questionById)
  // One re-attempt's answers are saved in one insert, so they share created_at.
  const sessions = new Map()
  for (const retry of retries) {
    const q = questionById.get(retry.question_id)
    if (!q) continue
    if (!history.has(retry.question_id)) history.set(retry.question_id, [])
    const event = {
      at: retry.created_at,
      status: liveStatusOf(q, retry.selected),
      selected: retry.selected || null,
      optionOrder: retry.option_order,
      test: null,
      q,
      bucket: null,
    }
    history.get(retry.question_id).push(event)
    if (!sessions.has(retry.created_at)) sessions.set(retry.created_at, [])
    sessions.get(retry.created_at).push(event)
  }

  const items = []
  for (const [qid, events] of history) {
    const q = questionById.get(qid)
    events.sort((a, b) => new Date(a.at) - new Date(b.at))

    let wrongCount = 0, skippedCount = 0, lastMistake = null, lastTest = null, keyChanged = false, fromPaper = false
    let bucket = 1, clearedOn = null, retryCount = 0
    for (const e of events) {
      if (!e.test) {
        // A re-attempt: only of a question in the copy and not yet cleared.
        if (!lastMistake || clearedOn) continue
        e.bucket = bucket
        retryCount++
        if (e.status === 'correct') { clearedOn = e.at; continue }
        if (e.status === 'wrong') wrongCount++; else skippedCount++
        bucket = Math.min(bucket + 1, LAST_BUCKET)
        continue
      }
      if (e.status === 'correct') {
        if (lastMistake && !clearedOn) clearedOn = e.at
        continue
      }
      if (e.status === 'skipped') {
        skippedCount++
        if (lastMistake) continue
      } else {
        wrongCount++
        bucket = 1
        clearedOn = null
      }
      lastMistake = e
      lastTest = e.test
      if (e.test.attempt.kind === 'paper') fromPaper = true
      if (e.keyChanged) keyChanged = true
    }
    // Re-attempts only ever follow a test, so no test left means nothing to show.
    if (!lastMistake || !lastTest) continue
    // A question taken out of service leaves the copy along with the bank.
    if (q.is_active === false || q.is_published === false) continue

    items.push({
      q,
      entry: entryByQuestion.get(qid) || null,
      status: clearedOn ? 'cleared' : 'pending',
      bucket,
      retryCount,
      ...placementOf(q, lastTest.attempt),
      test: lastTest,
      wrongCount,
      skippedCount,
      repeat: wrongCount >= 2,
      fromPaper,
      lastMistake,
      keyChanged,
      clearedOn,
      canRetry: !clearedOn,
    })
  }
  items.sort((a, b) => new Date(b.lastMistake.at) - new Date(a.lastMistake.at))

  // Each re-attempt, newest first, numbered in the order they were taken.
  const retests = [...sessions.entries()]
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([at, rows], i) => {
      const counted = rows.filter(r => r.bucket != null)
      const byBucket = {}
      for (const r of counted) byBucket[r.bucket] = (byBucket[r.bucket] || 0) + 1
      const bucket = Number(Object.entries(byBucket).sort((x, y) => y[1] - x[1])[0]?.[0]) || null
      const count = st => rows.filter(r => r.status === st).length
      return { key: at, number: i + 1, at, bucket, rows, correct: count('correct'), wrong: count('wrong'), skipped: count('skipped') }
    })
    .reverse()
  return { items, sessions: retests }
}

export function buildMistakeCopy(data) {
  return replayCopy(data).items
}

// Every re-attempt the student has taken, newest first, for the Results tab.
export function buildRetestHistory(data) {
  return replayCopy(data).sessions
}

/**
 * Every question the student has starred, newest star first. Unlike the copy it
 * holds right answers too, so each item carries what the last attempt of it was
 * (`kind`) and is shaped like a copy item (same grouping, rows and study view).
 * A bookmark is never "pending" or "cleared": it stays until the star is removed.
 */
export function buildBookmarks({ attempts = [], questions = [], entries = [] }) {
  const marked = entries.filter(e => e.bookmarked)
  if (marked.length === 0) return []
  const questionById = new Map(questions.map(q => [q.id, q]))
  const history = replayAttempts(attempts, questionById)

  const items = []
  for (const entry of marked) {
    const q = questionById.get(entry.question_id)
    const events = history.get(entry.question_id)
    // A question that has left the bank leaves the list; so does one with no
    // recorded attempt, which has no chapter to be filed under.
    if (!q || !events?.length || q.is_active === false || q.is_published === false) continue
    events.sort((a, b) => new Date(a.at) - new Date(b.at))
    const last = events[events.length - 1]
    items.push({
      q, entry,
      status: 'bookmarked',
      kind: last.status,
      ...placementOf(q, last.test.attempt),
      test: last.test,
      wrongCount: events.filter(e => e.status === 'wrong').length,
      skippedCount: events.filter(e => e.status === 'skipped').length,
      repeat: false, lastMistake: last, keyChanged: last.keyChanged,
      correctDays: 0, clearedOn: null, doneToday: false, canRetry: false,
    })
  }
  return items.sort((a, b) => new Date(b.entry.updated_at) - new Date(a.entry.updated_at))
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
    if (!tests.has(id)) tests.set(id, { key: `t${id}`, test: it.test, ...groupFields(it), paper: it.test.attempt.kind === 'gseb' && it.test.attempt.paper_id ? it.q.paper : null, items: [] })
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
    // A blank answer is saved as '' (the column is NOT NULL) so a skipped question
    // still moves up a bucket.
    .insert(answers.map(a => ({ student_id: studentId, question_id: a.questionId, selected: a.selected || '', option_order: a.optionOrder })))
    .select()
  if (error) throw error
  return data || []
}
