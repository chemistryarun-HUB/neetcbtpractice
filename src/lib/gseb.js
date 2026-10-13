import * as XLSX from 'xlsx'
import { resolveCorrectOptionValue } from './questionOptions'

// GSEB Std 12 Science board papers (Part A MCQs). Separate from the NEET
// level-wise bank — see migration_gseb_papers.sql for why.

export const GSEB_SUBJECTS = [
  { id: 'physics',   label: 'Physics',   paperCode: '054' },
  { id: 'chemistry', label: 'Chemistry', paperCode: '052' },
  { id: 'biology',   label: 'Biology',   paperCode: '056' },
  { id: 'maths',     label: 'Maths',     paperCode: '050' },
]
export const GSEB_SUBJECT_LABELS = Object.fromEntries(GSEB_SUBJECTS.map(s => [s.id, s.label]))
export const GSEB_MEDIUM_LABELS = { en: 'English', gu: 'Gujarati' }
export const GSEB_SESSION_LABELS = { march: 'March', july: 'July (Supplementary)' }

// GSEB Std 12 Science follows the NCERT (rationalised) textbooks, so chapters
// are the NCERT Class 12 chapters. chapter_no on a question is the `id` here.
// Papers from before the rationalised syllabus can have questions with no
// matching chapter; those stay unmapped (chapter_no null) rather than forced.
export const GSEB_XII_SYLLABUS = {
  physics: [
    'Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity',
    'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction',
    'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments',
    'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei',
    'Semiconductor Electronics',
  ],
  chemistry: [
    'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'The d- and f-Block Elements',
    'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules',
  ],
  biology: [
    'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health',
    'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution',
    'Human Health and Disease', 'Microbes in Human Welfare', 'Biotechnology: Principles and Processes',
    'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem',
    'Biodiversity and Conservation',
  ],
  maths: [
    'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants',
    'Continuity and Differentiability', 'Application of Derivatives', 'Integrals',
    'Application of Integrals', 'Differential Equations', 'Vector Algebra',
    'Three Dimensional Geometry', 'Linear Programming', 'Probability',
  ],
}

export function chaptersOf(subject) {
  return (GSEB_XII_SYLLABUS[subject] || []).map((name, i) => ({ id: i + 1, name }))
}

export function chapterName(subject, chapterNo) {
  return GSEB_XII_SYLLABUS[subject]?.[Number(chapterNo) - 1] || ''
}

// "Physics · March 2025 · English · Set 15 (054)"
export function paperTitle(p) {
  return [
    GSEB_SUBJECT_LABELS[p.subject],
    `${GSEB_SESSION_LABELS[p.session]?.split(' ')[0] || ''} ${p.year}`.trim(),
    GSEB_MEDIUM_LABELS[p.medium],
    p.set_no ? `Set ${p.set_no}` : null,
  ].filter(Boolean).join(' · ') + (p.paper_code ? ` (${p.paper_code})` : '')
}

const HEADERS = {
  q_no: ['q no', 'q.no', 'qno', 'question no', 'question number', 'q'],
  question: ['question', 'question text'],
  option1: ['option a', 'option 1', 'a', '(a)'],
  option2: ['option b', 'option 2', 'b', '(b)'],
  option3: ['option c', 'option 3', 'c', '(c)'],
  option4: ['option d', 'option 4', 'd', '(d)'],
  answer: ['answer', 'ans', 'correct answer', 'key', 'correct option'],
  chapter_no: ['chapter no', 'chapter', 'ch no', 'chapter number'],
  explanation: ['explanation', 'solution'],
}

function pick(norm, keys) {
  for (const k of keys) {
    const v = norm[k]
    if (v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

// "B", "(b)", "Option B", "2", "(2)" → 'option2'. GSEB keys are printed as
// A–D, but plenty of answer sheets use 1–4, so both are accepted.
export function parseAnswer(raw) {
  const s = String(raw || '').trim().toUpperCase()
  const letter = s.match(/\b([A-D])\b/) || s.match(/^\(?([A-D])\)?$/)
  if (letter) return `option${'ABCD'.indexOf(letter[1]) + 1}`
  const digit = s.match(/[1-4]/)
  return digit ? `option${digit[0]}` : null
}

/**
 * Reads one paper's questions from an Excel/CSV workbook — the first sheet
 * that has "Q No" and "Question" headers (so a leading instructions sheet is
 * fine). Returns rows ready to upsert into gseb_questions (minus paper_id)
 * and a list of rows that were skipped, with the reason.
 */
export function parseGsebQuestionsFile(arrayBuffer, mcqCount) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  let rows = []
  for (const name of wb.SheetNames) {
    const candidate = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
    const keys = candidate[0] ? Object.keys(candidate[0]).map(k => k.trim().toLowerCase()) : []
    if (HEADERS.q_no.some(k => keys.includes(k)) && HEADERS.question.some(k => keys.includes(k))) {
      rows = candidate
      break
    }
  }

  const questions = []
  const skipped = []
  const seen = new Set()
  for (const row of rows) {
    const norm = {}
    for (const [k, v] of Object.entries(row)) norm[k.trim().toLowerCase()] = v
    const qRaw = pick(norm, HEADERS.q_no)
    if (!qRaw) continue // blank row
    const qNo = parseInt(qRaw, 10)
    if (!qNo || qNo < 1 || qNo > mcqCount) { skipped.push(`Q${qRaw}: number outside 1-${mcqCount}`); continue }
    if (seen.has(qNo)) { skipped.push(`Q${qNo}: appears twice, kept the first`); continue }

    const options = [1, 2, 3, 4].map(n => pick(norm, HEADERS[`option${n}`]))
    const answerKey = parseAnswer(pick(norm, HEADERS.answer))
    const chapterRaw = parseInt(pick(norm, HEADERS.chapter_no), 10)

    seen.add(qNo)
    questions.push({
      q_no: qNo,
      question: pick(norm, HEADERS.question),
      option1: options[0], option2: options[1], option3: options[2], option4: options[3],
      // No answer yet is allowed (key filled in later); the paper just can't be
      // published until every question has one.
      correct_option: answerKey ? resolveCorrectOptionValue(answerKey, options) : '',
      chapter_no: Number.isFinite(chapterRaw) && chapterRaw > 0 ? chapterRaw : null,
      explanation: pick(norm, HEADERS.explanation) || null,
    })
  }
  questions.sort((a, b) => a.q_no - b.q_no)
  return { questions, skipped, rowCount: rows.length }
}

// What still blocks publishing a paper, as plain sentences. Empty = ready.
export function publishProblems(paper, questions) {
  const problems = []
  const nums = new Set(questions.map(q => q.q_no))
  const missing = []
  for (let n = 1; n <= paper.mcq_count; n++) if (!nums.has(n)) missing.push(n)
  if (missing.length) problems.push(`Missing questions: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`)
  const noKey = questions.filter(q => !q.correct_option).map(q => q.q_no)
  if (noKey.length) problems.push(`No answer key: Q${noKey.slice(0, 10).join(', Q')}${noKey.length > 10 ? '…' : ''}`)
  const empty = questions.filter(q => !q.question && !q.question_image).map(q => q.q_no)
  if (empty.length) problems.push(`Empty question text: Q${empty.slice(0, 10).join(', Q')}`)
  return problems
}
