import { optionEntries, correctOptionKey } from '../../lib/questionOptions'
import { hasStructuredMtc } from '../../lib/mtc'
import MatchTable from './MatchTable'

// One renderer for a question's *content* (stem, image, match table, options),
// used by every admin surface that shows a question — the full-screen reviewer
// and the Find Duplicates preview. Keeping it in one place is what guarantees
// "Student Preview" really is what the student sees; three hand-maintained
// copies of this markup had already drifted apart in spacing and image sizes.
//
//   mode  'student' — mirrors the test screen, answer NOT revealed
//         'admin'   — same layout, correct option highlighted green
//   size  'full'    — the reviewer's roomy, screen-filling layout
//         'compact' — small inline preview inside a table row
export default function QuestionView({ q, mode = 'student', size = 'full' }) {
  const full = size === 'full'
  const correctKey = correctOptionKey(q)
  const opts = optionEntries(q)

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

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: S.optGap }}>
        {opts.map((opt, i) => {
          const isCorrect = mode === 'admin' && opt.key === correctKey
          return (
            <li key={opt.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: S.optPad,
                borderRadius: S.radius, fontSize: S.optFont, cursor: 'default',
                border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}`,
                background: isCorrect ? '#f0fdf4' : '#fff',
                color: isCorrect ? '#15803d' : 'var(--gray-800)',
                fontWeight: isCorrect ? 600 : 400,
              }}>
              <div style={{
                width: S.circle, height: S.circle, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: full ? '0.875rem' : '0.7rem',
                background: isCorrect ? '#16a34a' : 'var(--gray-100)',
                color: isCorrect ? '#fff' : 'var(--gray-600)',
                border: `1.5px solid ${isCorrect ? '#16a34a' : 'var(--gray-300)'}`,
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {opt.text && <span style={{ whiteSpace: 'pre-wrap' }}>{opt.text}</span>}
                {opt.image && (
                  <img src={opt.image} alt={`Option ${i + 1}`}
                    style={{ maxWidth: '100%', maxHeight: S.optImg, marginTop: opt.text ? '0.5rem' : 0, display: 'block', borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                )}
              </div>
              {isCorrect && (
                <span style={{ flexShrink: 0, fontSize: full ? '0.8125rem' : '0.7rem', fontWeight: 700, color: '#15803d', alignSelf: 'center' }}>
                  ✓ Correct
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
