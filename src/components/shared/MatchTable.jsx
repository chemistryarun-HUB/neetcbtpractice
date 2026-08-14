import { mtcColumns } from '../../lib/mtc'

// Read-only Column A / Column B display for a structured "Match the Column"
// question. Used everywhere a question is shown — test screen, result review,
// admin review, admin preview — so the table looks identical to admin and
// student alike. Callers gate rendering on hasStructuredMtc(q) themselves and
// keep showing the plain question text for legacy (pre-structured) MTC rows.
export default function MatchTable({ q }) {
  const { colA, colB } = mtcColumns(q)
  return (
    <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--gray-200)', margin: '0.75rem 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--gray-700, #374151)' }}>
        <div style={{ padding: '0.5rem 0.875rem', fontWeight: 700, color: '#fff', fontSize: '0.8125rem', borderRight: '1px solid rgba(255,255,255,0.15)' }}>COLUMN A</div>
        <div style={{ padding: '0.5rem 0.875rem', fontWeight: 700, color: '#fff', fontSize: '0.8125rem' }}>COLUMN B</div>
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--gray-150, #e8ecf0)', background: i % 2 === 1 ? '#f8faff' : '#fff' }}>
          <div style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid var(--gray-200)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{colA[i].label}.</span>
            <div style={{ minWidth: 0 }}>
              {colA[i].text && <span style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{colA[i].text}</span>}
              {colA[i].image && (
                <img src={colA[i].image} alt={`Item ${colA[i].label}`}
                  style={{ maxWidth: '100%', maxHeight: 120, marginTop: colA[i].text ? '0.35rem' : 0, display: 'block', borderRadius: 4 }} />
              )}
            </div>
          </div>
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{colB[i].label}.</span>
            <div style={{ minWidth: 0 }}>
              {colB[i].text && <span style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{colB[i].text}</span>}
              {colB[i].image && (
                <img src={colB[i].image} alt={`Item ${colB[i].label}`}
                  style={{ maxWidth: '100%', maxHeight: 120, marginTop: colB[i].text ? '0.35rem' : 0, display: 'block', borderRadius: 4 }} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
