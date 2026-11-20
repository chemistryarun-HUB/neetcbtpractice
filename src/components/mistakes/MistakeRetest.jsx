import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import QuestionView from '../shared/QuestionView'
import MathText from '../shared/MathText'
import TestLegend from '../shared/TestLegend'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { orderOptionsForAttempt, shuffleArray } from '../../lib/optionShuffle'
import { liveStatusOf } from '../../lib/regrade'
import { CLEAR_AFTER_DAYS, ERROR_TYPES, saveMistakeEntry, saveRetries } from '../../lib/mistakeCopy'
import { neetT } from '../../lib/neetI18n'

const OUTCOME_ORDER = { wrong: 0, skipped: 1, correct: 2 }

// A re-attempt of the Mistake Copy, on the same screen as a level test, however
// many questions were picked. Its answers go to mistake_retries and nowhere else,
// so score, unlocks and Performance never see it. Options are reshuffled so it
// can't be sat from "the answer was C".
export default function MistakeRetest({ studentId, items, medium, onClose }) {
  useBodyScrollLock()
  const t = neetT(medium)
  const questions = useMemo(() => shuffleArray(items).map(item => ({
    item, q: item.q, options: orderOptionsForAttempt(item.q),
  })), [items])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [elapsed, setElapsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState(null)
  const [types, setTypes] = useState({})
  const contentRef = useRef(null)
  const paletteRef = useRef(null)

  const current = questions[idx]
  const answered = Object.keys(answers).length
  const isLast = idx === questions.length - 1

  useEffect(() => {
    if (results) return undefined
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [results])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [idx, results])

  function clearCurrent() {
    setAnswers(a => {
      const next = { ...a }
      delete next[current.q.id]
      return next
    })
  }

  useEffect(() => {
    function onKey(e) {
      if (results || submitting || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setIdx(i => Math.min(i + 1, questions.length - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Backspace') clearCurrent()
      else if (/^[1-4]$/.test(e.key)) {
        const opt = current.options[Number(e.key) - 1]
        if (opt) setAnswers(a => ({ ...a, [current.q.id]: opt.key }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function leave() {
    if (answered === 0 || window.confirm(t.mcLeaveConfirm)) onClose()
  }

  async function submit() {
    const unanswered = questions.length - answered
    if (unanswered > 0 && !window.confirm(t.mcRetestConfirm(unanswered))) return
    setSubmitting(true)
    try {
      await saveRetries(studentId, questions.filter(x => answers[x.q.id]).map(x => ({
        questionId: x.q.id, selected: answers[x.q.id], optionOrder: x.options.map(o => o.key),
      })))
      setResults(questions
        .map(x => ({ ...x, outcome: liveStatusOf(x.q, answers[x.q.id]) }))
        .sort((a, b) => OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome]))
    } catch {
      toast.error(t.mcSaveFailed)
    } finally {
      setSubmitting(false)
    }
  }

  async function chooseType(questionId, type) {
    setTypes(prev => ({ ...prev, [questionId]: type }))
    try {
      await saveMistakeEntry(studentId, questionId, { error_type: type })
    } catch {
      toast.error(t.mcSaveFailed)
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
              {/* Only what was answered: handing in 3 of 600 shouldn't list 597 blanks. */}
              {results.filter(r => r.outcome !== 'skipped').map(r => (
                <div key={r.q.id} className="mc-result-row">
                  <span className={`mc-dot ${r.outcome}`} />
                  <code className="mc-qid">{r.q.qid}</code>
                  <span className="mc-stem">{r.q.question ? <MathText text={String(r.q.question).replace(/\s+/g, ' ')} style={{ whiteSpace: 'nowrap' }} /> : <em>{t.mcImageQuestion}</em>}</span>
                  {r.outcome === 'wrong' && !r.item.entry?.error_type ? (
                    <select className={`form-control mc-result-type et-select et-${types[r.q.id] || 'none'}`} aria-label={t.mcErrorType} value={types[r.q.id] || ''}
                      onChange={e => chooseType(r.q.id, e.target.value)}>
                      <option value="" disabled>{t.mcSelectType}</option>
                      {ERROR_TYPES.map(type => <option key={type} value={type}>{t.mcErrorTypes[type]}</option>)}
                    </select>
                  ) : (
                    <span className="mc-result-note">{note(r)}</span>
                  )}
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

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')

  return (
    <div className="attempt-reviewer test-run" role="main" lang={medium}>
      <div className="ar-header">
        <button onClick={leave} title={t.mcClose} className="ar-close" aria-label={t.mcClose}><X size={18} /></button>
        <div className="ar-title"><span>{t.mcRetestTitle}</span></div>
        <div className="ar-stats tp-progress">
          <span><small>{t.answered}</small> {answered}<em>/{questions.length}</em></span>
        </div>
        <div className="stopwatch tp-timer">⏱ {mins}:{secs}</div>
      </div>

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
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
              <button key={x.q.id} data-current={isCur} onClick={() => setIdx(i)}
                title={`Q${i + 1} · ${done ? t.isAnswered : t.notAnswered}`}
                className="ar-chip"
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
        {answers[current.q.id] && (
          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={clearCurrent}>{t.clear}</button>
        )}
        <div className="ar-count">{idx + 1} {t.of(questions.length)}</div>
        {/* A long re-attempt can be handed in at any point, not only from the last question. */}
        {!isLast && answered > 0 && (
          <button className="btn btn-success btn-sm" onClick={submit} disabled={submitting} style={{ flexShrink: 0 }}>
            {submitting ? t.submitting : t.submit}
          </button>
        )}
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

      <TestLegend t={t} />
    </div>
  )
}
