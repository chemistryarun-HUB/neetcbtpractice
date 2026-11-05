import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import QuestionView from '../shared/QuestionView'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { orderOptionsForReview } from '../../lib/optionShuffle'
import { ERROR_TYPES, fmtDay } from '../../lib/mistakeCopy'
import { levelBadgeT, neetT } from '../../lib/neetI18n'

const TONE = {
  wrong: { fg: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', solid: '#dc2626' },
  skipped: { fg: '#b45309', bg: '#fffbeb', border: '#fcd34d', solid: '#d97706' },
  cleared: { fg: '#15803d', bg: '#dcfce7', border: '#86efac', solid: '#16a34a' },
}
export const itemKind = it => (it.status === 'cleared' ? 'cleared' : it.wrongCount > 0 ? 'wrong' : 'skipped')

// Attempts from before the key-based fix stored the option's text, so match either.
function chosenTest(selected) {
  return opt => !!selected && (selected === opt.key || (opt.text !== '' && selected === opt.text))
}

// Goes through a chapter's mistakes one question at a time, on the same full-screen
// shell as a test and its review. The Error Type sits in a bar that never scrolls
// away, so marking a chapter is pick, next, pick, next. The student gets the
// question alone, so a re-attempt isn't answered from memory of the green option;
// the teacher sees both answers and marks it checked.
export default function MistakeStudy({ items, startId, medium, editable, teacher, onSave, onCheck, onClose }) {
  useBodyScrollLock()
  const t = neetT(medium)
  const [index, setIndex] = useState(() => Math.max(items.findIndex(it => it.q.id === startId), 0))
  const contentRef = useRef(null)
  const paletteRef = useRef(null)

  const cur = items[index]
  const atLast = index === items.length - 1

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [index])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      // Arrow keys belong to the dropdown while it has focus.
      if (e.target?.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => Math.min(i + 1, items.length - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const { q, entry } = cur
  const kind = itemKind(cur)
  const errorType = entry?.error_type
  const heading = cur.source === 'gseb'
    ? `GSEB${cur.groupNumber ? ` · Ch ${cur.groupNumber}` : ''}`
    : `${t.unit(cur.groupNumber)} · ${levelBadgeT(cur.unitId, cur.level, medium)}`

  return (
    <div className="attempt-reviewer test-run" role="dialog" aria-label={t.mistakeCopy} lang={medium}>
      <div className="ar-header">
        <button onClick={onClose} title={t.mcClose} className="ar-close" aria-label={t.mcClose}><X size={18} /></button>
        <div className="ar-title"><span>{heading}</span></div>
        <div className="ar-stats tp-progress"><span>{index + 1}<em>/{items.length}</em></span></div>
      </div>

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
            <div className="ms-meta">
              <span className="mc-chip" style={{ background: TONE[kind].bg, color: TONE[kind].fg }}>
                {kind === 'cleared' ? t.mcClearedOn(fmtDay(cur.clearedOn)) : kind === 'wrong' ? t.mcWrongTimes(cur.wrongCount) : t.mcSkipped}
              </span>
              {cur.repeat && kind !== 'cleared' && <span className="mc-chip mc-chip-repeat">{t.mcRepeat}</span>}
              {cur.status === 'pending' && cur.correctDays === 1 && <span className="mc-chip mc-chip-progress">{t.mcOneCorrect}</span>}
              <span className="ms-date">{fmtDay(cur.lastMistake.at)}</span>
              {teacher && <code className="mc-qid">{q.qid}</code>}
            </div>
            {cur.keyChanged && <div className="mc-key-note">{t.mcKeyUpdated}</div>}
            <QuestionView q={q} mode={editable ? 'student' : 'review'} size="full"
              options={orderOptionsForReview(q, cur.lastMistake.optionOrder)}
              isChosen={chosenTest(cur.lastMistake.selected)} />
          </div>
        </div>
      </div>

      <div className="ms-typebar">
        <span className="ms-type-label">{t.mcErrorType}</span>
        {editable ? (
          <select className={`form-control ms-type-select et-select et-${errorType || 'none'}`} aria-label={t.mcErrorType} value={errorType || ''}
            onChange={e => { onSave(q.id, { error_type: e.target.value }); e.target.blur() }}>
            <option value="" disabled>{t.mcSelectType}</option>
            {ERROR_TYPES.map(type => <option key={type} value={type}>{t.mcErrorTypes[type]}</option>)}
          </select>
        ) : (
          <span className="ms-type-value">{errorType ? t.mcErrorTypes[errorType] : '—'}</span>
        )}
        {entry?.checked_at && <span className="ms-checked">{t.mcCheckedBy(entry.checked_by || '—', fmtDay(entry.checked_at))}</span>}
        {teacher && (
          <button className={`btn btn-sm ms-check-btn ${entry?.checked_at ? 'btn-ghost' : 'btn-primary'}`} onClick={() => onCheck(q.id, !entry?.checked_at)}>
            {entry?.checked_at ? 'Remove check' : '✔ Mark checked'}
          </button>
        )}
      </div>

      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setIndex(i => Math.max(i - 1, 0))} disabled={index === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label={t.previous}>
          <ChevronLeft size={16} /> <span className="ar-nav-label">{t.previous}</span>
        </button>
        <div ref={paletteRef} className="ar-palette">
          {items.map((it, i) => {
            const current = i === index
            const tone = TONE[itemKind(it)]
            return (
              <button key={it.q.id} data-current={current} onClick={() => setIndex(i)} className="ar-chip"
                style={{
                  background: current ? tone.solid : tone.bg,
                  color: current ? '#fff' : tone.fg,
                  borderColor: current ? tone.solid : tone.border,
                  boxShadow: current ? `0 0 0 2px #fff, 0 0 0 4px ${tone.solid}` : 'none',
                }}>
                {i + 1}
              </button>
            )
          })}
        </div>
        <div className="ar-count">{index + 1} {t.of(items.length)}</div>
        {atLast ? (
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>{t.mcDone}</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setIndex(i => i + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label={t.next}>
            <span className="ar-nav-label">{t.next}</span> <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="ar-hints">
        <span><kbd>←</kbd> <kbd>→</kbd> {t.hintNav}</span>
        <span><kbd>Esc</kbd> {t.mcClose}</span>
      </div>
    </div>
  )
}
