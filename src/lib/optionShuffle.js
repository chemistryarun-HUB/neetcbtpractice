// Decides the order a question's options are shown in.
//
// Shuffling options is right for almost every question — it stops a student
// memorising "the answer is C" across attempts. But it silently corrupts the
// few whose option TEXT depends on position:
//
//   "All of the above"      — only true if it IS the last option
//   "Both (b) and (c)"      — (b) and (c) mean the 2nd and 3rd options, so
//                             after a shuffle they point at the wrong things
//
// On the real bank this is ~33 of 4,571 active questions, but they are exactly
// the questions a student would report as broken, so they are worth handling
// precisely rather than by turning shuffling off everywhere.
import { optionEntries } from './questionOptions'

export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// "All of the above", "none of these", "both of the above" …
const ABOVE_RE = /\b(all|none|both|any)\s+of\s+(the\s+)?(above|these|them)\b/i

// Two option letters joined by and/comma, with nothing but whitespace between
// them — "Both (b) and (c)", "(A) and (B)", "both A and B".
//
// Deliberately tight. A looser pattern matched real chemistry that has nothing
// to do with options: "λC = λ∞ + (B)√C" is a constant, "M(A) = 50×10⁻³ and
// M(B) = 25×10⁻³" labels two substances, "Nitrogen (N)" is an element symbol.
// Requiring the two letters to be adjacent excludes all three.
const PAIR_RE = /\(\s*[a-dA-D]\s*\)\s*(?:,|and|&|\+|\/)\s*\(?\s*[a-dA-D]\s*\)/
const BOTH_RE = /\bboth\s+\(?\s*[a-dA-D]\s*\)?\s+(?:and|&|,)\s+\(?\s*[a-dA-D]\s*\)?(?!\w)/i

// Does the QUESTION label its own items (A), (i), "Statement 1"…? If so, letters
// inside an option refer to those stem items, not to the other options — "(C) <
// (A) < (B)" is comparing three compounds listed above, and shuffling the
// options is perfectly safe. 132 questions in the bank are this shape, versus
// about 2 that genuinely self-reference, so getting this test right matters
// more than the self-reference test itself.
const STEM_LABELS_RE = /(\(\s*[a-eA-E]\s*\)|\(\s*i{1,3}v?\s*\)|\b(?:statement|compound|reaction|list|column|assertion)\b)/i

export function isAboveOption(text) {
  return ABOVE_RE.test(String(text || ''))
}

/**
 * How this question's options depend on their position.
 *   'above'    — has an "All/None of the above" style option
 *   'self-ref' — an option points at other options by letter
 *   null       — order-independent, free to shuffle
 */
export function positionDependence(q) {
  const texts = [q.option1, q.option2, q.option3, q.option4].map(x => String(x || ''))
  const stemLabelsItems = STEM_LABELS_RE.test(String(q.question || ''))

  // Self-reference is checked FIRST because a question can be both, and the
  // two need opposite treatment. NCU03210 has "none of these" AND "both (A)
  // and (B)": treating it as merely an "above" question would pin the "none"
  // last and then happily shuffle the option that points at A and B, which is
  // the exact corruption this module exists to prevent. When both apply, the
  // stricter rule has to win.
  if (!stemLabelsItems && texts.some(t => PAIR_RE.test(t) || BOTH_RE.test(t))) return 'self-ref'
  if (texts.some(isAboveOption)) return 'above'
  return null
}

/**
 * The order to show a question's options in, as optionEntries() records.
 *
 * Layered so the common case still shuffles fully:
 *   admin set shuffle_options = false → authored order, untouched
 *   self-referencing options          → authored order, or the letters lie
 *   "All of the above"                → shuffle the rest, pin the "above"
 *                                       options last, keeping their order
 *   everything else                   → full shuffle
 */
export function orderOptionsForAttempt(q) {
  const entries = optionEntries(q)
  if (q.shuffle_options === false) return entries

  switch (positionDependence(q)) {
    case 'self-ref':
      return entries
    case 'above': {
      // Pinning rather than giving up on shuffling entirely: the other three
      // options still move around, so the anti-memorisation benefit survives
      // on the part of the question where it's safe.
      const pinned = entries.filter(e => isAboveOption(e.text))
      const rest = entries.filter(e => !isAboveOption(e.text))
      return [...shuffleArray(rest), ...pinned]
    }
    default:
      return shuffleArray(entries)
  }
}

/**
 * The order to REVIEW an attempt in.
 *
 * `order` is the option-key sequence recorded on the attempt when it was taken
 * (answers.option_order). Replaying it means the review screen shows the same
 * A/B/C/D the student actually saw — without it, review rendered the authored
 * order and a student's remembered "I picked C" pointed at a different option.
 *
 * Falls back to the authored order for attempts submitted before the order was
 * recorded, which is exactly what those attempts used to display anyway.
 */
export function orderOptionsForReview(q, order) {
  const entries = optionEntries(q)
  if (!Array.isArray(order) || order.length === 0) return entries
  const byKey = new Map(entries.map(e => [e.key, e]))
  const replayed = order.map(k => byKey.get(k)).filter(Boolean)
  // Any option missing from the stored order (e.g. the question was edited
  // since) is appended, so a review never silently drops an option.
  for (const e of entries) if (!order.includes(e.key)) replayed.push(e)
  return replayed
}
