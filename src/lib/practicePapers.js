// Subject order is fixed (matches the printed order of a typical NEET paper):
// Physics, then Chemistry, then Botany, then Zoology. Question numbers are
// sequential across subjects and derived from the four *_count fields —
// never stored redundantly on the paper row.
export const SUBJECTS = ['physics', 'chemistry', 'botany', 'zoology']
export const SUBJECT_LABELS = { physics: 'Physics', chemistry: 'Chemistry', botany: 'Botany', zoology: 'Zoology' }
// One accent color per subject, reused for chips/badges anywhere subjects need quick visual scanning.
export const SUBJECT_COLORS = {
  physics: { bg: '#eff6ff', color: '#1d4ed8' },
  chemistry: { bg: '#f0fdf4', color: '#15803d' },
  botany: { bg: '#faf5ff', color: '#7e22ce' },
  zoology: { bg: '#fff7ed', color: '#c2410c' },
}

export function subjectRanges(paper) {
  let from = 1
  return SUBJECTS.map(subject => {
    const count = paper[`${subject}_count`] || 0
    const range = { subject, label: SUBJECT_LABELS[subject], from, to: from + count - 1, count }
    from += count
    return range
  })
}

export function totalQuestions(paper) {
  return SUBJECTS.reduce((sum, s) => sum + (paper[`${s}_count`] || 0), 0)
}

// Compares `responses` ({ "1": "A", ... }) against `paper.answer_key`.
// A question with no key set is excluded from scoring entirely (not counted
// as wrong) — only relevant if a paper somehow got activated with a gap in
// its key.
export function scorePaper(paper, responses) {
  const ranges = subjectRanges(paper)
  const key = paper.answer_key || {}
  const subject_breakdown = {}
  let correct = 0, wrong = 0, skipped = 0

  for (const r of ranges) {
    let sCorrect = 0, sWrong = 0, sSkipped = 0
    for (let q = r.from; q <= r.to; q++) {
      const correctAnswer = key[q]
      if (!correctAnswer) continue // unscored question
      const given = responses[q]
      if (!given) { sSkipped++; continue }
      if (given === correctAnswer) sCorrect++
      else sWrong++
    }
    subject_breakdown[r.subject] = { correct: sCorrect, wrong: sWrong, skipped: sSkipped, score: sCorrect * 4 - sWrong }
    correct += sCorrect; wrong += sWrong; skipped += sSkipped
  }

  return { correct, wrong, skipped, score: correct * 4 - wrong, subject_breakdown }
}
