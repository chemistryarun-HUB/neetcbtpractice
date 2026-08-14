// Helpers for "Match the Column" (MTC) questions with structured, per-item data.
//
// MTC questions authored before this feature flattened the whole table into
// `question` as one block of plain text, with nothing per-item in the DB at
// all — hasStructuredMtc() distinguishes those legacy rows from newer ones, so
// every render surface can fall back to plain-text display for them without
// any MTC-specific handling (the existing generic `question` render already
// does the right thing for legacy rows).

const LABELS_A = ['1', '2', '3', '4']
const LABELS_B = ['p', 'q', 'r', 's']

export function hasStructuredMtc(q) {
  if (!q || q.question_type !== 'Match the Column') return false
  return [1, 2, 3, 4].some(n => q[`col_a${n}`] || q[`col_a${n}_image`] || q[`col_b${n}`] || q[`col_b${n}_image`])
}

export function mtcColumns(q) {
  return {
    colA: [1, 2, 3, 4].map(n => ({ label: LABELS_A[n - 1], text: q[`col_a${n}`] || '', image: q[`col_a${n}_image`] || null })),
    colB: [1, 2, 3, 4].map(n => ({ label: LABELS_B[n - 1], text: q[`col_b${n}`] || '', image: q[`col_b${n}_image`] || null })),
  }
}
