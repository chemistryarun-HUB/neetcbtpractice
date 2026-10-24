import * as XLSX from 'xlsx'
import { resolveCorrectOptionValue, correctOptionKey } from './questionOptions'

// GSEB Std 12 Science board papers (Part A MCQs). Separate from the NEET
// level-wise bank — see migration_gseb_papers.sql for why.

// Group B (Physics, Chemistry, Biology) is live. Maths (Group A) keeps its
// chapters below but stays out of every tab and dropdown until it has papers:
// flip `live` to bring it back.
const ALL_GSEB_SUBJECTS = [
  { id: 'physics',   label: 'Physics',   paperCode: '054', live: true },
  { id: 'chemistry', label: 'Chemistry', paperCode: '052', live: true },
  { id: 'biology',   label: 'Biology',   paperCode: '056', live: true },
  { id: 'maths',     label: 'Maths',     paperCode: '050', live: false },
]
export const GSEB_SUBJECTS = ALL_GSEB_SUBJECTS.filter(s => s.live)
export const GSEB_SUBJECT_LABELS = Object.fromEntries(ALL_GSEB_SUBJECTS.map(s => [s.id, s.label]))
export const GSEB_MEDIUM_LABELS = { en: 'English', gu: 'Gujarati' }
// The exam is named without its month (the supplementary month changes year
// to year): March is the main paper, July the supplementary one.
export const GSEB_EXAM_LABELS = { march: 'Main Paper', july: 'Supplementary Paper' }

// "2025 · Supplementary Paper"
export function paperExam(p) {
  return [p.year, GSEB_EXAM_LABELS[p.session]].filter(Boolean).join(' · ')
}

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

// "Physics · 2025 · Main Paper · English · Set 15 (054)"
export function paperTitle(p) {
  return [
    GSEB_SUBJECT_LABELS[p.subject],
    paperExam(p),
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

const PART_B_HEADERS = {
  q_no: HEADERS.q_no,
  question: HEADERS.question,
  section: ['section', 'sec'],
  marks: ['marks', 'mark'],
  chapter_no: HEADERS.chapter_no,
  answer: ['model answer', 'answer', 'solution'],
  rule: ['choice rule', 'choice', 'rule'],
}

// Finds the first sheet whose header row has every one of `required`.
function sheetRows(wb, required) {
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
    const keys = rows[0] ? Object.keys(rows[0]).map(k => k.trim().toLowerCase()) : []
    if (required.every(alts => alts.some(k => keys.includes(k)))) return rows
  }
  return []
}

function normalise(row) {
  const norm = {}
  for (const [k, v] of Object.entries(row)) norm[k.trim().toLowerCase()] = v
  return norm
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
 * Reads one paper from an Excel/CSV workbook. Part A comes from the first
 * sheet with "Q No", "Question" and option columns (so a leading instructions
 * sheet is fine); Part B, if present, from the first sheet with "Q No",
 * "Question" and "Marks". Returns rows ready to upsert (minus paper_id) and
 * the rows that were skipped, with the reason.
 */
export function parseGsebQuestionsFile(arrayBuffer, mcqCount) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const rows = sheetRows(wb, [HEADERS.q_no, HEADERS.question, HEADERS.option1])

  const questions = []
  const skipped = []
  const seen = new Set()
  for (const row of rows) {
    const norm = normalise(row)
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
  return { questions, skipped, rowCount: rows.length, partB: parsePartB(wb) }
}

function parsePartB(wb) {
  const rows = sheetRows(wb, [PART_B_HEADERS.q_no, PART_B_HEADERS.question, PART_B_HEADERS.marks])
  const questions = []
  const skipped = []
  const seen = new Set()
  const ruleText = {}
  for (const row of rows) {
    const norm = normalise(row)
    const qRaw = pick(norm, PART_B_HEADERS.q_no)
    if (!qRaw) continue
    const qNo = parseInt(qRaw, 10)
    const marks = parseInt(pick(norm, PART_B_HEADERS.marks), 10)
    if (!qNo || qNo < 1) { skipped.push(`Part B Q${qRaw}: not a question number`); continue }
    if (!marks || marks < 1) { skipped.push(`Part B Q${qNo}: marks missing`); continue }
    if (seen.has(qNo)) { skipped.push(`Part B Q${qNo}: appears twice, kept the first`); continue }
    seen.add(qNo)
    const section = pick(norm, PART_B_HEADERS.section).replace(/^section\s*/i, '').toUpperCase()
    const chapterRaw = parseInt(pick(norm, PART_B_HEADERS.chapter_no), 10)
    const rule = pick(norm, PART_B_HEADERS.rule)
    if (rule && !ruleText[section]) ruleText[section] = rule
    questions.push({
      q_no: qNo,
      section,
      marks,
      question: pick(norm, PART_B_HEADERS.question),
      answer: pick(norm, PART_B_HEADERS.answer) || null,
      chapter_no: Number.isFinite(chapterRaw) && chapterRaw > 0 ? chapterRaw : null,
    })
  }
  questions.sort((a, b) => a.q_no - b.q_no)
  return { questions, skipped, rules: partBRules(questions, ruleText) }
}

// One rule per section: its question range, marks and how many to attempt.
// "Any 8 of Q1–12" in the sheet's Choice rule column sets `attempt`;
// without it every question in the section is compulsory.
export function partBRules(questions, ruleText = {}) {
  const bySection = {}
  for (const q of questions) {
    const r = bySection[q.section] ||= { section: q.section, from: q.q_no, to: q.q_no, count: 0, marks: q.marks }
    r.from = Math.min(r.from, q.q_no)
    r.to = Math.max(r.to, q.q_no)
    r.count++
  }
  return Object.values(bySection).sort((a, b) => a.from - b.from).map(({ count, ...r }) => {
    const any = String(ruleText[r.section] || '').match(/any\s+(\d+)/i)
    return { ...r, attempt: any ? Math.min(Number(any[1]), count) : count }
  })
}

// "Answer any 8 of Q1–12 (2 marks each)"
export function ruleLabel(r) {
  const total = r.to - r.from + 1
  const which = r.attempt < total ? `Answer any ${r.attempt} of Q${r.from}–${r.to}` : `Answer all of Q${r.from}–${r.to}`
  return `${which} (${r.marks} mark${r.marks === 1 ? '' : 's'} each)`
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

// Board Part A marking: 1 mark per correct answer, no negative marking.
export const GSEB_MARKS_CORRECT = 1

/**
 * Grades a GSEB attempt. `responses` is { [questionId]: 'option1'..'option4' }.
 * The returned `answers` payload uses the same shape as test_attempts.answers
 * (responses + correct/wrong/skipped id lists), so lib/attemptGrading.js can
 * read it back unchanged.
 */
export function gradeGsebAttempt(questions, responses) {
  const correct_ids = [], wrong_ids = [], skipped_ids = []
  for (const q of questions) {
    const selected = responses[q.id]
    if (!selected) skipped_ids.push(q.id)
    else if (selected === correctOptionKey(q)) correct_ids.push(q.id)
    else wrong_ids.push(q.id)
  }
  return {
    answers: { responses, correct_ids, wrong_ids, skipped_ids },
    correct_count: correct_ids.length,
    wrong_count: wrong_ids.length,
    skipped_count: skipped_ids.length,
    score: correct_ids.length * GSEB_MARKS_CORRECT,
  }
}

// { chapterNo|'none': { name, total, correct } } for the result screen.
export function chapterBreakdown(subject, questions, statusOf) {
  const out = {}
  for (const q of questions) {
    const k = q.chapter_no || 'none'
    if (!out[k]) out[k] = { chapterNo: q.chapter_no || null, name: chapterName(subject, q.chapter_no) || 'Other', total: 0, correct: 0 }
    out[k].total++
    if (statusOf(q) === 'correct') out[k].correct++
  }
  return Object.values(out).sort((a, b) => (a.chapterNo ?? 999) - (b.chapterNo ?? 999))
}

// Question ID, like the NEET bank's Q ID but built from the paper, so nothing
// is typed or stored: G + subject letter + 2-digit year + exam (M = main,
// S = supplementary; letters, not months, since the months move year to year)
// + part + 2-digit Q no. Chemistry March 2024 Part A Q7 → "GC24MA07". A
// Gujarati paper or a numbered set gets a suffix ("-GU", "-SET2") so two papers
// of the same exam never share an ID.
export function gsebQid(paper, part, qNo) {
  if (!paper?.subject || !paper.year) return `${part}${String(qNo).padStart(2, '0')}`
  const subj = { physics: 'P', chemistry: 'C', biology: 'B', maths: 'M' }[paper.subject] || '?'
  const sess = paper.session === 'july' ? 'S' : 'M'
  const extra = (paper.medium && paper.medium !== 'en' ? `-${paper.medium.toUpperCase()}` : '') + (paper.set_no ? `-SET${paper.set_no}` : '')
  return `G${subj}${String(paper.year).slice(-2)}${sess}${part}${String(qNo).padStart(2, '0')}${extra}`
}

// "2026 · Main Paper" tag shown next to a question pulled out of its paper.
export function paperTag(p) {
  if (!p) return ''
  return paperExam(p)
}

// Fisher–Yates on a copy; `n` caps the length.
export function pickRandom(list, n = list.length) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// Board pace: 60 minutes for 50 MCQs, rounded up, at least 5 minutes.
export function minutesFor(mcqCount) {
  return Math.max(5, Math.ceil(mcqCount * 1.2))
}

/**
 * Picks questions for a custom paper. `spec` = { mcq: n, subjective: { [marks]: n } }.
 * Spreads picks across chapters in turn so one big chapter can't crowd out the
 * rest, then returns them sorted by chapter (the order a printed paper reads in).
 * `short` lists what the pool could not fill, e.g. ['3-mark: 4 of 6'].
 */
export function buildCustomPaper(mcqPool, subjectivePool, spec) {
  const short = []
  const mcq = spreadAcrossChapters(mcqPool, spec.mcq || 0)
  if (mcq.length < (spec.mcq || 0)) short.push(`MCQ: ${mcq.length} of ${spec.mcq}`)
  const subjective = {}
  for (const [marks, n] of Object.entries(spec.subjective || {})) {
    if (!n) continue
    const picked = spreadAcrossChapters(subjectivePool.filter(q => q.marks === Number(marks)), n)
    if (picked.length < n) short.push(`${marks}-mark: ${picked.length} of ${n}`)
    subjective[marks] = picked
  }
  return { mcq, subjective, short }
}

function spreadAcrossChapters(pool, n) {
  const byChapter = {}
  for (const q of pickRandom(pool)) (byChapter[q.chapter_no ?? 0] ||= []).push(q)
  const queues = Object.values(byChapter)
  const out = []
  while (out.length < n && queues.some(qs => qs.length)) {
    for (const qs of pickRandom(queues)) {
      if (out.length >= n) break
      if (qs.length) out.push(qs.shift())
    }
  }
  return out.sort((a, b) => (a.chapter_no ?? 99) - (b.chapter_no ?? 99))
}
