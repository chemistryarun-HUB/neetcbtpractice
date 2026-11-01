import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import QuestionView from '../shared/QuestionView'
import MathText from '../shared/MathText'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { orderOptionsForAttempt, shuffleArray } from '../../lib/optionShuffle'
import { liveStatusOf } from '../../lib/regrade'
import { CLEAR_AFTER_DAYS, saveRetries } from '../../lib/mistakeCopy'
import { neetT } from '../../lib/neetI18n'
import { QUESTIONS_PER_ATTEMPT } from '../../lib/constants'

// A re-attempt of the Mistake Copy, in the same shell as a level test. Its answers
// go to mistake_retries and nowhere else, so score, unlocks and Performance never
// see it. Options are reshuffled so it can't be sat from "the answer was C".
export default function MistakeRetest({ studentId, items, medium, onClose }) {
  useBodyScrollLock()
  const t = neetT(medium)
  const questions = useMemo(() => shuffleArray(items).slice(0, QUESTIONS_PER_ATTEMPT).map(item => ({
    item, q: item.q, options: orderOptionsForAttempt(item.q),
  })), [items])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState(null)
  const contentRef = useRef(null)
  const paletteRef = useRef(null)

  const current = questions[idx]
  const answered = Object.keys(answers).length
  const isLast = idx === questions.length - 1

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [idx, results])

  async function submit() {
    const unanswered = questions.length - answered
    if (unanswered > 0 && !window.confirm(t.mcRetestConfirm(unanswered))) return
    setSubmitting(true)
    try {
      await saveRetries(studentId, questions.filter(x => answers[x.q.id]).map(x => ({
        questionId: x.q.id, selected: answers[x.q.id], optionOrder: x.options.map(o => o.key),
      })))
      setResults(questions.map(x => ({ ...x, outcome: liveStatusOf(x.q, answers[x.q.id]) })))
    } catch {
      toast.error(t.mcSaveFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (results) {
    const count = s => results.filter(r => r.outcome === s).length
    const note = r => {
      if (r.outcome === 'wrong') return t.mcResultReset
      if (r.outcome !== 'correct') return ''
      return r.item.correctDays + 1 >= CLEAR_AFTER_DAYS ? t.mcResultCleared : t.mcResultOneDay
    }
    return (
      <div className="attempt-reviewer test-run" role="main" lang={medium}>
        <div className="ar-header"><div className="ar-title"><span>{t.mcResultTitle}</span></div></div>
        <div ref={contentRef} className="ar-content">
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="mc-result-tiles">
              <div className="mc-result-tile correct"><strong>{count('correct')}</strong>{t.mcResultCorrect}</div>
              <div className="mc-result-tile wrong"><strong>{count('wrong')}</strong>{t.mcResultWrong}</div>
              <div className="mc-result-tile skipped"><strong>{count('skipped')}</strong>{t.mcResultSkipped}</div>
            </div>
            <div className="card">
              {results.map(r => (
                <div key={r.q.id} className="mc-result-row">
                  <span className={`mc-dot ${r.outcome}`} />
                  <code className="mc-qid">{r.q.qid}</code>
                  <span className="mc-stem">{r.q.question ? <MathText text={String(r.q.question).replace(/\s+/g, ' ')} style={{ whiteSpace: 'nowrap' }} /> : <em>{t.mcImageQuestion}</em>}</span>
                  <span className="mc-result-note">{note(r)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ar-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>{t.mcBack}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="attempt-reviewer test-run" role="main" lang={medium}>
      <div className="ar-header">
        <div className="ar-title"><span>{t.mcRetestTitle}</span></div>
        <div className="ar-stats tp-progress">
          <span><small>{t.answered}</small> {answered}<em>/{questions.length}</em></span>
        </div>
        <button className="btn btn-ghost btn-sm mc-retest-close" onClick={onClose}>✕</button>
      </div>

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--gray-500)' }}>Q{idx + 1}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{t.of(questions.length)}</span>
            </div>
            <QuestionView q={current.q} mode="attempt" size="full" options={current.options}
              selectedKey={answers[current.q.id]}
              onSelect={key => setAnswers(a => ({ ...a, [current.q.id]: key }))} />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>{t.mcRetestMarks}</div>
        </div>
      </div>

      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Previous question">
          <ChevronLeft size={16} /> <span className="ar-nav-label">{t.previous}</span>
        </button>
        <div ref={paletteRef} className="ar-palette">
          {questions.map((x, i) => {
            const isCur = i === idx
            const done = !!answers[x.q.id]
            return (
              <button key={x.q.id} data-current={isCur} onClick={() => setIdx(i)} className="ar-chip"
                style={{
                  background: isCur ? 'var(--primary)' : done ? 'var(--primary-light)' : '#fff',
                  color: isCur ? '#fff' : done ? 'var(--primary-dark)' : 'var(--gray-600)',
                  borderColor: isCur || done ? 'var(--primary)' : 'var(--gray-300)',
                  boxShadow: isCur ? '0 0 0 2px #fff, 0 0 0 4px var(--primary)' : 'none',
                }}>
                {i + 1}
              </button>
            )
          })}
        </div>
        <div className="ar-count">{idx + 1} {t.of(questions.length)}</div>
        {!isLast ? (
          <button className="btn btn-primary btn-sm" onClick={() => setIdx(i => i + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Next question">
            <span className="ar-nav-label">{t.next}</span> <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn btn-success btn-sm" onClick={submit} disabled={submitting} style={{ flexShrink: 0 }}>
            {submitting ? t.submitting : t.submit}
          </button>
        )}
      </div>
    </div>
  )
}
