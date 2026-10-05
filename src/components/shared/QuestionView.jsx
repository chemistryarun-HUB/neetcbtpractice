import { optionEntries, correctOptionKey } from '../../lib/questionOptions'
import { hasStructuredMtc } from '../../lib/mtc'
import MatchTable from './MatchTable'

// One renderer for a question's *content* (stem, image, match table, options),
// used by every admin surface that shows a question — the full-screen reviewer
// and the Find Duplicates preview. Keeping it in one place is what guarantees
// "Student Preview" really is what the student sees; three hand-maintained
// copies of this markup had already drifted apart in spacing and image sizes.
//
//   mode  'attempt' — the live test screen: options are tappable, the picked
//                     one (`selectedKey`) is highlighted blue, nothing revealed
//         'student' — mirrors the test screen, answer NOT revealed
//         'admin'   — same layout, correct option highlighted green
//         'review'  — a submitted attempt read back: correct option green,
//                     the student's pick marked (red when it was wrong)
//   size  'full'    — the reviewer's roomy, screen-filling layout
//         'compact' — small inline preview inside a table row
//
// `options` overrides the authored option order — an attempt review passes
// the order that student actually saw, so "I picked C" still points at C.
// `isChosen(opt)` marks the student's own answer in 'review' mode.
export default function QuestionView({ q, mode = 'student', size = 'full', options, isChosen, selectedKey, onSelect }) {
  const attempt = mode === 'attempt'
  const full = size === 'full'
  const correctKey = correctOptionKey(q)
  const opts = options || optionEntries(q)
  const hasImageOptions = opts.some(o => o.image)
  const reveal = mode === 'admin' || mode === 'review'

  const S = full
    ? { stem: '1.1875rem', stemLead: 1.75, gap: '1.5rem', qImg: '42vh', optImg: 300,
        optPad: '0.875rem 1.125rem', optFont: '1.0625rem', circle: 32, optGap: '0.75rem', radius: 12 }
    : { stem: '0.9rem', stemLead: 1.6, gap: '0.75rem', qImg: '180px', optImg: 120,
        optPad: '0.45rem 0.7rem', optFont: '0.8125rem', circle: 22, optGap: '0.4rem', radius: 8 }

  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: S.stem, color: 'var(--gray-800)', whiteSpace: 'pre-wrap', lineHeight: S.stemLead, marginBottom: S.gap }}>
        {q.question}
      </div>

      {q.question_image && (
        <div style={{ marginBottom: S.gap }}>
          <img src={q.question_image} alt="Question"
            style={{ maxWidth: '100%', maxHeight: S.qImg, borderRadius: S.radius, border: '1px solid var(--gray-200)', background: '#fff' }} />
        </div>
      )}

      {hasStructuredMtc(q) && <MatchTable q={q} />}

      {/* Image options (structure-comparison questions especially) are narrow
          — stacked one-per-row they leave most of a laptop screen's width
          empty. A grid lets several sit side by side when there's room and
          folds back to one column as the viewport narrows, with no separate
          mobile rule needed. Plain-text options keep the single-column list
          they've always had — wrapping text across grid cells of uneven
          height reads worse than it solves. */}
      <ul style={hasImageOptions
        ? { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${full ? 260 : 160}px, 1fr))`, gap: S.optGap }
        : { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: S.optGap }}>
        {opts.map((opt, i) => {
          const isCorrect = reveal && opt.key === correctKey
          const picked = mode === 'review' && !!isChosen?.(opt)
          const pickedWrong = picked && !isCorrect
          // green = the right answer, red = the student's wrong pick, else plain
          const selected = attempt && opt.key === selectedKey
          const tone = selected
            ? { border: 'var(--primary)', bg: 'var(--primary-light)', fg: 'var(--primary-dark)', solid: 'var(--primary)' }
            : isCorrect
            ? { border: '#86efac', bg: '#f0fdf4', fg: '#15803d', solid: '#16a34a' }
            : pickedWrong
              ? { border: '#fca5a5', bg: '#fef2f2', fg: '#b91c1c', solid: '#dc2626' }
              : null
          // Without the "Your answer" half, an option that's green because the
          // key was corrected after the attempt reads the same as one the
          // student actually picked.
          const label = mode === 'review'
            ? (isCorrect && picked ? '✓ Your answer' : isCorrect ? '✓ Correct answer' : pickedWrong ? '✗ Your answer' : null)
            : (isCorrect ? '✓ Correct' : null)
          return (
            <li key={opt.key}
              onClick={attempt ? () => onSelect?.(opt.key) : undefined}
              role={attempt ? 'radio' : undefined}
              aria-checked={attempt ? !!selected : undefined}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: S.optPad,
                borderRadius: S.radius, fontSize: S.optFont, cursor: attempt ? 'pointer' : 'default', transition: 'border-color .12s, background .12s',
                border: `${tone ? 2 : 1.5}px solid ${tone ? tone.border : 'var(--gray-200)'}`,
                background: tone ? tone.bg : '#fff',
                color: tone ? tone.fg : 'var(--gray-800)',
                fontWeight: tone ? 600 : 400,
              }}>
              <div style={{
                width: S.circle, height: S.circle, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: full ? '0.875rem' : '0.7rem',
                background: tone ? tone.solid : 'var(--gray-100)',
                color: tone ? '#fff' : 'var(--gray-600)',
                border: `1.5px solid ${tone ? tone.solid : 'var(--gray-300)'}`,
              }}>
                {i + 1}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {opt.text && <span style={{ whiteSpace: 'pre-wrap' }}>{opt.text}</span>}
                {opt.image && (
                  <img src={opt.image} alt={`Option ${i + 1}`}
                    style={{ maxWidth: '100%', maxHeight: S.optImg, marginTop: opt.text ? '0.5rem' : 0, display: 'block', borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff' }} />
                )}
                {/* In review mode the verdict sits under the option rather than
                    beside it: on a phone a right-hand label steals a third of
                    the width the option text needs. */}
                {label && mode === 'review' && (
                  <div style={{ marginTop: '0.4rem', fontSize: full ? '0.72rem' : '0.62rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: tone.fg }}>
                    {label}
                  </div>
                )}
              </div>
              {label && mode !== 'review' && (
                <span style={{ flexShrink: 0, fontSize: full ? '0.8125rem' : '0.7rem', fontWeight: 700, color: tone.fg, alignSelf: 'center', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {mode === 'admin' && !correctKey && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
          ⚠ No option matches this question's stored answer key.
        </div>
      )}
    </div>
  )
}
