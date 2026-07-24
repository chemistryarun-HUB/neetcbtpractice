const OPTIONS = ['1', '2', '3', '4']

// Tap-grid of question numbers grouped by subject, each with 1/2/3/4 option
// buttons (matches how NEET answer keys are actually published, by option
// number, not letter).
// Reused for: admin entering the answer key, a student answering, and a
// student reviewing their submitted answers against the key.
//
// - Editable (key entry or answering): pass `onChange`, omit `correctKey`.
// - Review (post-submit): pass `correctKey`, omit `onChange` — cells color
//   green (correct), red (wrong), or stay neutral (skipped / not yet keyed).
export default function AnswerGrid({ subjects, values, onChange, correctKey }) {
  const editable = typeof onChange === 'function'
  const reviewing = !!correctKey

  return (
    <div>
      {subjects.map(r => (
        <div key={r.subject} className="syllabus-section" style={{ marginBottom: '1.5rem' }}>
          <h3>{r.label} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({r.count} questions)</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '0.5rem' }}>
            {Array.from({ length: r.count }, (_, i) => r.from + i).map(q => {
              const given = values[q]
              const correct = reviewing ? correctKey[q] : null
              let cellBg = 'var(--gray-50)', cellBorder = 'var(--gray-200)'
              if (reviewing) {
                if (!correct) { cellBg = 'var(--gray-50)'; cellBorder = 'var(--gray-200)' } // not scored
                else if (!given) { cellBg = '#fffbeb'; cellBorder = '#fde68a' } // skipped
                else if (given === correct) { cellBg = '#f0fdf4'; cellBorder = '#86efac' }
                else { cellBg = '#fef2f2'; cellBorder = '#fca5a5' }
              }
              return (
                <div key={q} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.4rem', borderRadius: 'var(--radius)', background: cellBg, border: `1px solid ${cellBorder}` }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Q{q}</span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {OPTIONS.map(opt => {
                      const isGiven = given === opt
                      const isCorrectOpt = reviewing && correct === opt
                      let bg = '#fff', color = 'var(--gray-500)', border = '1px solid var(--gray-300)'
                      if (reviewing) {
                        if (isCorrectOpt) { bg = '#16a34a'; color = '#fff'; border = '1px solid #16a34a' }
                        else if (isGiven) { bg = '#dc2626'; color = '#fff'; border = '1px solid #dc2626' }
                      } else if (isGiven) {
                        bg = 'var(--primary)'; color = '#fff'; border = '1px solid var(--primary)'
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={!editable}
                          onClick={editable ? () => onChange(q, given === opt ? undefined : opt) : undefined}
                          style={{
                            width: '34px', height: '34px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px',
                            background: bg, color, border, cursor: editable ? 'pointer' : 'default', padding: 0, touchAction: 'manipulation',
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
