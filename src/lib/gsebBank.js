import { supabase } from './supabase'
import { minutesFor } from './gseb'

// The GSEB question bank = every question of every published paper of one
// subject. Chapter-wise practice, student-built tests and the teacher's paper
// generator all draw from it.

const PAGE = 1000 // PostgREST's default row cap per request

async function fetchAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < PAGE) return out
  }
}

/**
 * { papers, mcq, subjective } for one subject. Each question carries its
 * paper as `paper` (year, session, set_no) so it can be tagged "March 2026".
 * Pass narrower selects when only counts are needed.
 */
export async function fetchGsebBank(subject, { mcqSelect = '*', subjectiveSelect = '*' } = {}) {
  const { data: papers, error } = await supabase.from('gseb_papers')
    .select('id, subject, year, session, set_no, medium, paper_code')
    .eq('subject', subject).eq('is_published', true)
    .order('year', { ascending: false })
  if (error) throw error
  if (!papers.length) return { papers: [], mcq: [], subjective: [] }
  const ids = papers.map(p => p.id)
  const byId = Object.fromEntries(papers.map(p => [p.id, p]))
  const [mcq, subjective] = await Promise.all([
    fetchAll(() => supabase.from('gseb_questions').select(mcqSelect).in('paper_id', ids).order('id')),
    fetchAll(() => supabase.from('gseb_subjective').select(subjectiveSelect).in('paper_id', ids).order('id')),
  ])
  const tag = q => ({ ...q, paper: byId[q.paper_id] })
  return { papers, mcq: mcq.map(tag), subjective: subjective.map(tag) }
}

// Newest paper first, then printed order: how a chapter's questions read best.
export function byYearThenNumber(a, b) {
  return (b.paper?.year ?? 0) - (a.paper?.year ?? 0) || a.paper_id.localeCompare(b.paper_id) || a.q_no - b.q_no
}

/**
 * Creates a chapter-wise MCQ attempt and returns its id; the test
 * screen at /student/gseb/practice/:attemptId takes it from there.
 */
export async function startGsebPractice({ studentId, subject, mode, title, questionIds, durationMin }) {
  const { data, error } = await supabase.from('gseb_attempts').insert({
    student_id: studentId,
    paper_id: null,
    mode,
    subject,
    title,
    duration_min: durationMin ?? minutesFor(questionIds.length),
    question_ids: questionIds,
    answers: {},
    submitted: false,
  }).select('id').single()
  if (error) throw error
  return data.id
}
