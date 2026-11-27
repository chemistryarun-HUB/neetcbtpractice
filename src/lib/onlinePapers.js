// Online practice papers: built by the admin from the question bank, taken by
// students on their dashboard (migration_online_papers.sql).
//
//   mode 'same'   — one fixed list of questions (paper.question_ids); each
//                   student sees it in their own question and option order
//   mode 'random' — each student draws their own questions from the paper's
//                   sources when they start it
//
// A source is { subject, unit_id, level, count }: unit_id is the practice unit
// id (Physics +100, Biology +200), level null means the whole unit (CCT).
import { supabase } from './supabase'
import { fromCourseUnitId, levelBadge, MARKS_CORRECT, MARKS_WRONG } from './constants'
import { practiceUnitName } from './subjects'
import { correctOptionKey } from './questionOptions'

export const PAPER_MODES = {
  same: 'Same questions for all (shuffled per student)',
  random: 'Different questions for each student',
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// "Chemistry · Unit 6 Equilibrium · Level 3" / "... · CCT (whole unit)"
export function sourceLabel(src) {
  const { subject, unit } = fromCourseUnitId(src.unit_id)
  const where = src.level == null ? 'CCT (whole unit)' : levelBadge(src.unit_id, src.level, { subject })
  return `${subject} · Unit ${unit} ${practiceUnitName(src.unit_id)} · ${where}`
}

export const paperQuestionCount = paper => paper.mode === 'same'
  ? (paper.question_ids || []).length
  : (paper.sources || []).reduce((t, s) => t + (Number(s.count) || 0), 0)

/** Every live question a source can draw from (published, active, right medium). */
export async function fetchSourcePool(src, medium) {
  const { subject, unit } = fromCourseUnitId(src.unit_id)
  const out = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('questions').select('*')
      .eq('subject', subject).ilike('unit', `Unit ${unit} -%`)
      .eq('medium', medium || 'en').eq('is_active', true).eq('is_published', true)
    if (src.level != null) q = q.eq('level', Number(src.level))
    const { data, error } = await q.range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

/**
 * Draws each source's count at random, never the same question twice across
 * sources. Returns { questions, short: [{ src, wanted, got }] }.
 */
export async function drawQuestions(sources, medium) {
  const taken = new Set()
  const questions = [], short = []
  for (const src of sources) {
    const pool = shuffle((await fetchSourcePool(src, medium)).filter(q => !taken.has(q.id)))
    const wanted = Number(src.count) || 0
    const pick = pool.slice(0, wanted)
    pick.forEach(q => taken.add(q.id))
    questions.push(...pick)
    if (pick.length < wanted) short.push({ src, wanted, got: pick.length })
  }
  return { questions, short }
}

export async function fetchQuestionsByIds(ids) {
  const out = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('questions').select('*').in('id', ids.slice(i, i + 200))
    if (error) throw error
    out.push(...(data || []))
  }
  const byId = new Map(out.map(q => [q.id, q]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

// Subject order of a NEET paper; within a subject the questions keep their order.
const SUBJECT_ORDER = ['Physics', 'Chemistry', 'Biology']
export function bySubject(questions) {
  return [...questions].sort((a, b) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject))
}

/** Is this paper meant for this student? */
export function paperIsFor(paper, student) {
  if ((paper.medium || 'en') !== (student.medium || 'en')) return false
  if (paper.class_filter && paper.class_filter !== student.class) return false
  if (paper.target_year && String(paper.target_year) !== String(student.neet_year || '')) return false
  return true
}

/** Grades responses ({ questionId: 'option2' }) the same way a level test does. */
export function gradePaper(questions, responses) {
  const correct_ids = [], wrong_ids = [], skipped_ids = []
  for (const q of questions) {
    const sel = responses[q.id]
    if (!sel) skipped_ids.push(q.id)
    else if (sel === correctOptionKey(q)) correct_ids.push(q.id)
    else wrong_ids.push(q.id)
  }
  return {
    correct_ids, wrong_ids, skipped_ids,
    correct_count: correct_ids.length, wrong_count: wrong_ids.length, skipped_count: skipped_ids.length,
    score: correct_ids.length * MARKS_CORRECT + wrong_ids.length * MARKS_WRONG,
  }
}

export const maxMarks = n => n * MARKS_CORRECT

export const isSetupMissing = err => /online_paper|relation .* does not exist|schema cache/i.test(err?.message || '')
