// Helpers for "Match the Column" (MTC) questions with structured, per-item data.
//
// MTC questions authored before this feature flattened the whole table into
// `question` as one block of plain text, with nothing per-item in the DB at
// all — hasStructuredMtc() distinguishes those legacy rows from newer ones, so
// every render surface can fall back to plain-text display for them without
// any MTC-specific handling (the existing generic `question` render already
// does the right thing for legacy rows).

// Six rows, not four. Measured across the real bank on 2026-08-31: Column A
// runs to 5 items and Column B to 6, and 6 of the 11 non-empty MTC questions
// exceeded the original 4-slot schema — which is exactly why every MTC row in
// the bank was still an unstructured blob. See migration_mtc_six_rows.sql.
export const MTC_ROWS = 6
export const MTC_ROW_NUMS = Array.from({ length: MTC_ROWS }, (_, i) => i + 1)
const ROW_NUMS = MTC_ROW_NUMS

// Which alphabet a column's labels are drawn from — editable per question
// (see migration_mtc_label_schemes.sql) because source books don't agree:
// some number Column A with roman numerals and letter Column B, some do the
// reverse, some are plain numbers throughout. Six presets cover every style
// actually seen in the bank as of 2026-09-03. Storing a SCHEME rather than six
// free-text labels keeps a question's labels internally consistent — there's
// no way to end up with two items both labelled "B".
export const LABEL_SCHEMES = {
  num:         { title: '1, 2, 3…', labels: ['1', '2', '3', '4', '5', '6'] },
  upper:       { title: 'A, B, C…', labels: ['A', 'B', 'C', 'D', 'E', 'F'] },
  lower:       { title: 'a, b, c…', labels: ['a', 'b', 'c', 'd', 'e', 'f'] },
  roman_upper: { title: 'I, II, III…', labels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  roman_lower: { title: 'i, ii, iii…', labels: ['i', 'ii', 'iii', 'iv', 'v', 'vi'] },
  // The app's original default for Column B, kept as a named preset (rather
  // than folded into 'lower') because it's the one scheme that doesn't start
  // at the first letter — matches the label Arun asked for at the start of
  // this feature and every already-converted question in the bank.
  lower_pu:    { title: 'p, q, r…', labels: ['p', 'q', 'r', 's', 't', 'u'] },
}
export const DEFAULT_LABEL_A = 'num'
export const DEFAULT_LABEL_B = 'lower_pu'

function labelsForScheme(key) {
  return (LABEL_SCHEMES[key] || LABEL_SCHEMES[DEFAULT_LABEL_A]).labels
}

// Back-compat presets for any caller still importing the old fixed arrays —
// identical to what num/lower_pu resolve to.
export const MTC_LABELS_A = LABEL_SCHEMES[DEFAULT_LABEL_A].labels
export const MTC_LABELS_B = LABEL_SCHEMES[DEFAULT_LABEL_B].labels

export function hasStructuredMtc(q) {
  if (!q || q.question_type !== 'Match the Column') return false
  return ROW_NUMS.some(n => q[`col_a${n}`] || q[`col_a${n}_image`] || q[`col_b${n}`] || q[`col_b${n}_image`])
}

/**
 * The two columns as render-ready rows.
 *
 * Trailing empty rows are dropped rather than rendered blank: a 3-item
 * question should look like a 3-item question, not three items followed by
 * three empty ruled lines. Trailing only — a gap in the middle is left alone,
 * because silently closing it would renumber the items below it and break the
 * answer options, which reference these labels by position.
 */
export function mtcColumns(q) {
  const build = (side, labels) => ROW_NUMS.map(n => ({
    label: labels[n - 1],
    text: q[`col_${side}${n}`] || '',
    image: q[`col_${side}${n}_image`] || null,
  }))
  // Falls back to the original hardcoded schemes for any row from before this
  // migration ran, or a legacy row that has never been given a scheme at all —
  // same labels those questions have always rendered with.
  const colA = build('a', labelsForScheme(q?.mtc_label_a || DEFAULT_LABEL_A))
  const colB = build('b', labelsForScheme(q?.mtc_label_b || DEFAULT_LABEL_B))

  const lastUsed = rows => {
    let last = -1
    rows.forEach((r, i) => { if (r.text || r.image) last = i })
    return last
  }
  // Both columns are trimmed to the same height so the two halves of a row
  // stay side by side; a 4-item Column A next to a 6-item Column B keeps all 6.
  const height = Math.max(lastUsed(colA), lastUsed(colB)) + 1
  return { colA: colA.slice(0, height), colB: colB.slice(0, height) }
}

// A leading item marker: (i) / (a) / (A) / 1. / iv] — a roman numeral, a
// single letter, or a number, wrapped or followed by a bracket or dot.
const MARKER = String.raw`[([]?\s*(?:i{1,3}|iv|vi{0,3}|ix|xi{0,3}|[a-z]|\d{1,2})\s*[).\]]`
const LEADING_MARKER = new RegExp(`^\\s*${MARKER}\\s+`, 'i')

/**
 * Split one string into items on their markers.
 *
 * Handles both "one item per line" and the whole list crammed onto a single
 * line ("List-I: (A) Bronze  (B) Brass  (C) UK silver coin"). A marker only
 * counts at the very start or after two-plus spaces, which is what keeps
 * chemistry from being torn apart mid-item: state symbols and formulae like
 * "NaCl(s)" or "Al(CH₃)₃" have no space before the bracket, and a genuine
 * inline list is always separated by a wide gap.
 */
function splitItems(str) {
  const s = String(str || '').trim()
  if (!s) return []
  const re = new RegExp(`(?:^|(?<=\\s{2}))${MARKER}\\s*`, 'gi')
  const starts = [...s.matchAll(re)].map(m => ({ at: m.index, len: m[0].length }))
  if (!starts.length) return []
  return starts.map((m, i) => {
    const from = m.at + m.len
    const to = i + 1 < starts.length ? starts[i + 1].at : s.length
    return s.slice(from, to).trim()
  }).filter(Boolean)
}

/**
 * Parse a flattened MTC question's text into per-item values.
 *
 * Every MTC row in the bank stores its whole table as one block of text under
 * headings, because the structured fields could not hold a real question until
 * the six-row migration. Retyping 11 items by hand per question is the thing
 * that made MTC unusable, so this reads that text back instead.
 *
 * Deliberately conservative about prose: only a line (or inline run) that
 * starts with a marker becomes an item, so "Match the catalysts in Column I
 * with the processes in Column II." is never mistaken for one. Everything it
 * declines to use comes back in `ignored`, so the caller can show the admin
 * exactly what was and wasn't picked up rather than filling fields silently.
 */
export function parseMtcFromText(text) {
  const lines = String(text || '').split('\n')
  const colA = []
  const colB = []
  const ignored = []

  // Which column a run of items belongs to comes from the heading above (or
  // in front of) it. Marker STYLE deliberately does not decide this: real
  // questions in the bank use letters for Column I and romans for Column II
  // just as often as the reverse, so trusting the style mislabels half of them.
  const HEAD_A = /^\s*(column|list)\s*[-–—]?\s*(i|1|a)\s*[-–—:.)]?\s*/i
  const HEAD_B = /^\s*(column|list)\s*[-–—]?\s*(ii|2|b)\s*[-–—:.)]?\s*/i

  let side = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Check II before I — "List-II" also matches the looser "List-I" pattern.
    const bHead = line.match(HEAD_B)
    const aHead = bHead ? null : line.match(HEAD_A)
    if (bHead || aHead) {
      side = bHead ? 'b' : 'a'
      // The heading may carry its whole list on the same line.
      const rest = line.slice((bHead || aHead)[0].length)
      const inline = splitItems(rest)
      if (inline.length) (side === 'a' ? colA : colB).push(...inline)
      continue
    }

    // Custom headings — real questions use "Catalysts: … / Processes: …" or
    // "Catalyst: … / Process: …" as often as they use Column/List. Any short
    // label ending in a colon and followed by two or more marked items counts;
    // the first such run is Column A, the next is Column B. Requiring two
    // items keeps an ordinary sentence that happens to contain a colon from
    // being read as a column.
    const labelled = line.match(/^([^:]{1,40}):\s*(.+)$/)
    if (labelled) {
      const inline = splitItems(labelled[2])
      if (inline.length >= 2) {
        const target = colA.length === 0 ? 'a' : 'b'
        ;(target === 'a' ? colA : colB).push(...inline)
        side = target
        continue
      }
    }

    if (!LEADING_MARKER.test(line)) { ignored.push(line); continue }

    const items = splitItems(line)
    if (!items.length) { ignored.push(line); continue }

    // With no heading seen yet, fall back to the marker's own style: romans
    // and digits read as Column A, plain letters as Column B.
    let target = side
    if (target === null) {
      const first = line.match(new RegExp(`^\\s*[([]?\\s*(${'i{1,3}|iv|vi{0,3}|ix|xi{0,3}|\\d{1,2}'})\\s*[).\\]]`, 'i'))
      target = first ? 'a' : 'b'
    }
    ;(target === 'a' ? colA : colB).push(...items)
  }

  return {
    colA: colA.slice(0, MTC_ROWS),
    colB: colB.slice(0, MTC_ROWS),
    ignored,
    // Flagged so the caller can warn instead of silently dropping items.
    overflowA: Math.max(0, colA.length - MTC_ROWS),
    overflowB: Math.max(0, colB.length - MTC_ROWS),
  }
}
