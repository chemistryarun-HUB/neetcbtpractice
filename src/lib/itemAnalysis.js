// Finds probably-mis-keyed questions from response data you already have.
//
// The signal: a question's keyed answer should be chosen more often by students
// who do well overall than by students who do badly. When the opposite holds —
// when the cohort picking some *other* option outscores the cohort picking the
// keyed one — the key itself is the most likely explanation. This is the standard
// discrimination-index idea from item analysis, using each attempt's overall score
// as the ability proxy.
//
// It reports suspicion, never truth. A genuinely hard question can look mildly
// suspicious, so every flag is a prompt to go and read the question, not a verdict.

// Explicit .js extensions — see the note in regrade.js; scripts/ loads this under
// plain Node, which won't resolve extensionless paths.
import { MARKS_CORRECT } from './constants.js'
import { correctOptionKey, optionEntries } from './questionOptions.js'

// Two independent signals, because on real data they catch different things.
//
// Tuned against NCU02491, a confirmed mis-key: under its old key the students who
// picked the keyed option and those who picked the true answer BOTH averaged 73%,
// so ability-based discrimination saw nothing at all. What gave it away was that
// 8 of 12 students chose the unkeyed option and only 3 chose the keyed one.
// Popularity inversion is the primary detector; discrimination is a secondary one
// for questions where the cohorts do differ in ability.
const MIN_RESPONSES = 10          // total students who answered the question
const MIN_OPTION_RESPONSES = 5    // students on a rival option before it's worth comparing
const MIN_OPTION_SHARE = 0.2      // ...and it must be a real slice, not a stray few
const POPULARITY_RATIO = 1.5      // rival picked this many times more often than the key
const SUSPICION_THRESHOLD = 10    // percentage points the rival cohort must lead by
// Above this, the students who picked the key clearly outperformed everyone else,
// which points at a hard question rather than a wrong key. Not used to suppress
// the flag — a genuinely mis-keyed question can still discriminate by luck — but
// reported alongside it so the reviewer sees the evidence pointing both ways.
const DISCRIMINATION_TOLERANCE = 5

/** Resolves a stored response to an option key, tolerating the legacy text format. */
function responseToKey(question, selected) {
  if (!selected) return null
  const opts = optionEntries(question)
  if (opts.some(o => o.key === selected)) return selected
  const byText = opts.find(o => o.text !== '' && o.text === selected)
  return byText ? byText.key : null
}

function mean(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

/**
 * @returns rows sorted most-suspicious first, each describing how the keyed
 *   option's cohort compares with its strongest rival.
 */
export function analyseAnswerKeys({ attempts, questions }) {
  const qById = Object.fromEntries(questions.map(q => [q.id, q]))

  // questionId → optionKey → array of the answering attempts' overall score %
  const buckets = {}
  for (const a of attempts) {
    const responses = (a.answers || {}).responses
    if (!responses) continue
    const total = (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
    const max = total * MARKS_CORRECT
    if (max <= 0) continue
    const abilityPct = ((a.score ?? 0) / max) * 100

    for (const [qid, selected] of Object.entries(responses)) {
      const q = qById[qid]
      if (!q) continue
      const key = responseToKey(q, selected)
      if (!key) continue
      ;((buckets[qid] ||= {})[key] ||= []).push(abilityPct)
    }
  }

  const rows = []
  for (const [qid, byOption] of Object.entries(buckets)) {
    const q = qById[qid]
    if (!q) continue
    const keyedKey = correctOptionKey(q)
    const n = Object.values(byOption).reduce((s, arr) => s + arr.length, 0)
    if (n < MIN_RESPONSES) continue

    const keyedScores = byOption[keyedKey] || []
    const keyedMean = mean(keyedScores)

    // Discrimination: do the students who picked the keyed answer outperform
    // everyone else who answered? On a correctly-keyed question this is positive.
    // Zero or negative is the actual red flag — a single rival option beating the
    // key can just be one popular distractor among strong students.
    const restScores = Object.entries(byOption)
      .filter(([k]) => k !== keyedKey)
      .flatMap(([, s]) => s)
    const discrimination = keyedMean - mean(restScores)

    // Candidate rivals: non-keyed options with enough students behind them.
    const rivals = Object.entries(byOption)
      .filter(([k, s]) => k !== keyedKey && s.length >= MIN_OPTION_RESPONSES && s.length / n >= MIN_OPTION_SHARE)
      .map(([k, s]) => ({ key: k, mean: mean(s), count: s.length }))

    const nobodyPickedKeyed = keyedScores.length === 0

    // Signal 1 — popularity inversion: more students chose some other option than
    // chose the key. On a factual question that usually means the key is wrong,
    // not that most of the class is.
    const mostPopular = rivals.reduce((best, r) => (!best || r.count > best.count ? r : best), null)
    const popularityInverted = !!mostPopular &&
      (keyedScores.length === 0 || mostPopular.count >= keyedScores.length * POPULARITY_RATIO)

    // Signal 2 — ability inversion: the rival's students outscore the key's, AND
    // the key's students don't outperform the field overall.
    const strongest = rivals.reduce((best, r) => (!best || r.mean > best.mean ? r : best), null)
    const abilityInverted = !!strongest &&
      (strongest.mean - keyedMean) >= SUSPICION_THRESHOLD && discrimination <= 0

    if (!nobodyPickedKeyed && !popularityInverted && !abilityInverted) continue

    // Report against whichever signal fired, preferring the popularity one since
    // it's the more reliable of the two at these cohort sizes.
    const rival = popularityInverted ? mostPopular : strongest
    const lead = rival ? rival.mean - keyedMean : 0
    const reasons = []
    if (nobodyPickedKeyed) reasons.push('nobody chose the keyed answer')
    if (popularityInverted) reasons.push('more students chose another option')
    if (abilityInverted) reasons.push('stronger students chose another option')

    // Evidence the other way: the key's students beat the field, so the question
    // may simply be hard. Verified against real data — every false positive in the
    // first pass (NCU02018, NCU01180) had a strongly positive discrimination.
    const keyedOutperforms = !nobodyPickedKeyed && discrimination > DISCRIMINATION_TOLERANCE

    const opts = optionEntries(q)
    const labelOf = k => {
      const idx = opts.findIndex(o => o.key === k)
      const o = opts[idx]
      return { letter: idx >= 0 ? String.fromCharCode(65 + idx) : '?', text: o?.text || '(image option)' }
    }

    rows.push({
      question_id: qid,
      qid: q.qid,
      question: q.question,
      unit: q.unit,
      level: q.level,
      responses: n,
      keyed: { ...labelOf(keyedKey), key: keyedKey, count: keyedScores.length, meanPct: keyedMean },
      rival: rival ? { ...labelOf(rival.key), key: rival.key, count: rival.count, meanPct: rival.mean } : null,
      lead,
      discrimination,
      nobodyPickedKeyed,
      popularityInverted,
      abilityInverted,
      keyedOutperforms,
      reasons,
      // Strength of evidence: nobody-on-the-key first, then how badly the key was
      // out-chosen, then ability lead. Anything carrying counter-evidence sinks
      // below everything that doesn't, so the likeliest real errors sort to the top.
      rank: (nobodyPickedKeyed ? 10000
        : popularityInverted ? 100 + (mostPopular.count / Math.max(keyedScores.length, 1))
        : lead) - (keyedOutperforms ? 1000 : 0),
    })
  }

  return rows.sort((a, b) => b.rank - a.rank)
}

export const ITEM_ANALYSIS_RULES = {
  MIN_RESPONSES, MIN_OPTION_RESPONSES, MIN_OPTION_SHARE, POPULARITY_RATIO,
  SUSPICION_THRESHOLD, DISCRIMINATION_TOLERANCE,
}
