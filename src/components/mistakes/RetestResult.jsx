import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import QuestionView from '../shared/QuestionView'
import MathText from '../shared/MathText'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { BUCKETS, ERROR_TYPES, saveMistakeEntry } from '../../lib/mistakeCopy'
import { neetT } from '../../lib/neetI18n'

const TONE = {
  wrong: { fg: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', solid: '#dc2626' },
  skipped: { fg: '#b45309', bg: '#fffbeb', border: '#fcd34d', solid: '#d97706' },
  correct: { fg: '#15803d', bg: '#dcfce7', border: '#86efac', solid: '#16a34a' },
}
const OUTCOME_ORDER = { wrong: 0, skipped: 1, correct: 2 }
const LAST_BUCKET = BUCKETS[BUCKETS.length - 1]

export const sortByOutcome = rows => [...rows].sort((a, b) => OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome])

// Where a question went after this answer: Cleared, or the next bucket up.
export function outcomeNote(t, outcome, bucket) {
  if (!bucket) return ''   // a test result, not a re-attempt: no bucket to move between
  if (outcome === 'correct') return t.mcResultCleared
  return bucket >= LAST_BUCKET ? t.mcStaysIn(t.mcBucketName(LAST_BUCKET)) : t.mcMovedTo(t.mcBucketName(bucket + 1))
}

/**
 * One re-attempt's result: a summary (right / wrong / not answered, one row per
 * question) and, from any row, a full answer review with the student's answer,
 * the correct one and the explanation. Used straight after submitting and again
 * from the Results tab for any earlier re-attempt.
 *
 * rows: [{ q, options, selected, outcome, bucket, hasType }]
 */
export default function RetestResult({ rows, title, subtitle, medium, studentId, editable = true, onClose, footer = null, backLabel = null }) {
  useBodyScrollLock()
  const t = neetT(medium)
  const [review, setReview] = useState(null)
  const [types, setTypes] = useState({})
  const contentRef = useRef(null)
  const paletteRef = useRef(null)

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [review])

  useEffect(() => {
    function onKey(e) {
      if (review == null || e.target?.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setReview(i => Math.min(i + 1, rows.length - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setReview(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') setReview(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function chooseType(questionId, type) {
    setTypes(prev => ({ ...prev, [questionId]: type }))
    try {
      await saveMistakeEntry(studentId, questionId, { error_type: type })
    } catch {
      toast.error(t.mcSaveFailed)
    }
  }

  const label = r => (r.outcome === 'correct' ? t.mcResultCorrect : r.outcome === 'wrong' ? t.mcResultWrong : t.mcResultSkipped)
  const needsType = r => editable && r.outcome === 'wrong' && !r.hasType
  const typeSelect = (r, className) => (
    <select className={`form-control ${className} et-select et-${types[r.q.id] || 'none'}`} aria-label={t.mcErrorType} value={types[r.q.id] || ''}
      onChange={e => chooseType(r.q.id, e.target.value)}>
      <option value="" disabled>{t.mcSelectType}</option>
      {ERROR_TYPES.map(type => <option key={type} value={type}>{t.mcErrorTypes[type]}</option>)}
    </select>
  )

  if (review != null) {
    const r = rows[review]
    const tone = TONE[r.outcome]
    const note = outcomeNote(t, r.outcome, r.bucket)
    return (
      <div className="attempt-reviewer test-run" role="dialog" aria-label={title} lang={medium}>
        <div className="ar-header">
          <button onClick={() => setReview(null)} title={t.mcClose} className="ar-close" aria-label={t.mcClose}><X size={18} /></button>
          <div className="ar-title"><span>{title}</span></div>
          <div className="ar-stats tp-progress"><span>{review + 1}<em>/{rows.length}</em></span></div>
        </div>
        <div ref={contentRef} className="ar-content">
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="ar-card">
              <div className="ms-meta">
                <span className="mc-chip" style={{ background: tone.bg, color: tone.fg }}>{label(r)}</span>
                {note && <span className={`mc-result-note ${r.outcome}`}>{note}</span>}
              </div>
              <QuestionView q={r.q} mode="review" size="full" options={r.options}
                isChosen={opt => !!r.selected && (opt.key === r.selected || (opt.text !== '' && opt.text === r.selected))} />
              {r.outcome === 'skipped' && <div className="mc-skip-note">{t.mcNotAnsweredNote}</div>}
              {(r.q.explanation || r.q.explanation_image) && (
                <div className="mc-explanation">
                  <strong>{t.mcExplanation}:</strong> <MathText text={r.q.explanation || ''} />
                  {r.q.explanation_image && <img src={r.q.explanation_image} alt={t.mcExplanation} />}
                </div>
              )}
            </div>
          </div>
        </div>
        {needsType(r) && (
          <div className="ms-typebar">
            <span className="ms-type-label">{t.mcErrorType}</span>
            {typeSelect(r, 'ms-type-select')}
          </div>
        )}
        <div className="ar-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => setReview(i => Math.max(0, i - 1))} disabled={review === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label={t.previous}>
            <ChevronLeft size={16} /> <span className="ar-nav-label">{t.previous}</span>
          </button>
          <div ref={paletteRef} className="ar-palette">
            {rows.map((x, i) => {
              const cur = i === review
              const c = TONE[x.outcome]
              return (
                <button key={x.q.id} data-current={cur} onClick={() => setReview(i)} className="ar-chip" title={`Q${i + 1} · ${label(x)}`}
                  style={{
                    background: cur ? c.solid : c.bg, color: cur ? '#fff' : c.fg, borderColor: cur ? c.solid : c.border,
                    boxShadow: cur ? `0 0 0 2px #fff, 0 0 0 4px ${c.solid}` : 'none',
                  }}>
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="ar-count">{review + 1} {t.of(rows.length)}</div>
          {review === rows.length - 1 ? (
            <button className="btn btn-primary btn-sm" onClick={() => setReview(null)} style={{ flexShrink: 0 }}>{t.mcDone}</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setReview(i => i + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label={t.next}>
              <span className="ar-nav-label">{t.next}</span> <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const count = s => rows.filter(r => r.outcome === s).length
  return (
    <div className="attempt-reviewer test-run" role="dialog" aria-label={title} lang={medium}>
      <div className="ar-header">
        <button onClick={onClose} title={t.mcClose} className="ar-close" aria-label={t.mcClose}><X size={18} /></button>
        <div className="ar-title"><span>{title}</span></div>
      </div>
      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {subtitle && <div className="mc-result-sub">{subtitle}</div>}
          <div className="mc-result-tiles">
            <div className="mc-result-tile correct"><strong>{count('correct')}</strong>{t.mcResultCorrect}</div>
            <div className="mc-result-tile wrong"><strong>{count('wrong')}</strong>{t.mcResultWrong}</div>
            <div className="mc-result-tile skipped"><strong>{count('skipped')}</strong>{t.mcResultSkipped}</div>
          </div>
          <button className="btn btn-primary mc-result-review" onClick={() => setReview(0)}>{t.mcReviewAnswers} →</button>
          <div className="card">
            {rows.map((r, i) => (
              <div key={r.q.id} className={`mc-result-row ${r.outcome}`}>
                <button className="mc-result-open" onClick={() => setReview(i)}>
                  <span className={`mc-result-mark ${r.outcome}`}>{r.outcome === 'correct' ? '✓' : r.outcome === 'wrong' ? '✗' : '–'}</span>
                  <span className="mc-result-num">Q{i + 1}</span>
                  <span className="mc-stem">{r.q.question ? <MathText text={String(r.q.question).replace(/\s+/g, ' ')} style={{ whiteSpace: 'nowrap' }} /> : <em>{t.mcImageQuestion}</em>}</span>
                </button>
                <span className={`mc-result-note ${r.outcome}`}>{outcomeNote(t, r.outcome, r.bucket)}</span>
                {needsType(r) && typeSelect(r, 'mc-result-type')}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ar-footer" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{backLabel || t.mcBack}</button>
        {footer}
      </div>
    </div>
  )
}
