import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import QuestionView from '../shared/QuestionView'
import InfoTooltip from '../shared/InfoTooltip'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { attemptGrading } from '../../lib/attemptGrading'
import { accuracyOf, totalQuestions, fmtDuration, unitName, levelDef } from '../../lib/performanceMetrics'
import { levelBadge, MARKS_CORRECT } from '../../lib/constants'

// Same three colours as the Correct/Wrong/Skipped result tiles, so the palette
// at the bottom reads as those tiles broken out question by question.
const STATUS = {
  correct: { label: 'Correct', fg: '#15803d', bg: '#dcfce7', border: '#86efac', solid: '#16a34a' },
  wrong:   { label: 'Wrong',   fg: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', solid: '#dc2626' },
  skipped: { label: 'Skipped', fg: '#b45309', bg: '#fffbeb', border: '#fcd34d', solid: '#d97706' },
}
const FILTERS = [
  [null, 'All'],
  ['correct', 'Correct'],
  ['wrong', 'Wrong'],
  ['skipped', 'Skipped'],
]

/**
 * Full-screen, one-question-at-a-time replay of a submitted attempt.
 *
 * Modelled on the admin's QuestionReviewer (and rendering options through the
 * same QuestionView), which is far easier to actually study from than the
 * long scrolling list this replaced: the question gets the whole screen at
 * the size it was sat at, and the numbered palette underneath doubles as a
 * map of the whole test — green/red/amber at a glance, one tap to any of them.
 *
 * Numbers are the order the student saw the questions in, and stay put when
 * filtering, so "Q7" in the Wrong view is the same Q7 as in All.
 *
 * `questions === null` means still loading.
 */
export default function AttemptReviewer({ attempt, questions, studentName, attemptNo, initialFilter = null, onClose }) {
  useBodyScrollLock()
  const grading = useMemo(() => attemptGrading(attempt), [attempt])
  const [filter, setFilter] = useState(initialFilter)
  const [pos, setPos] = useState(0)
  const paletteRef = useRef(null)
  const contentRef = useRef(null)

  const items = useMemo(() => (questions || []).map((q, i) => ({
    q, num: i + 1, status: grading.statusOf(q), keyChanged: grading.keyChangedOf(q),
  })), [questions, grading])

  const counts = useMemo(() => {
    const c = { all: items.length, correct: 0, wrong: 0, skipped: 0 }
    for (const it of items) c[it.status]++
    return c
  }, [items])

  const visible = filter ? items.filter(it => it.status === filter) : items
  const index = Math.min(pos, Math.max(visible.length - 1, 0))
  const cur = visible[index]
  const atFirst = index <= 0
  const atLast = index >= visible.length - 1

  function pickFilter(f) {
    setFilter(f)
    setPos(0)
  }
  function go(delta) {
    const next = index + delta
    if (next >= 0 && next < visible.length) setPos(next)
  }

  // Fresh question, fresh scroll; and keep the current chip in view in the
  // palette strip as ← / → walk past the edge of it.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [cur?.q.id])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); go(1); break
        case 'ArrowLeft':  e.preventDefault(); go(-1); break
        case 'Home':       e.preventDefault(); setPos(0); break
        case 'End':        e.preventDefault(); setPos(visible.length - 1); break
        case 'a': case 'A': pickFilter(null); break
        case 'c': case 'C': pickFilter('correct'); break
        case 'w': case 'W': pickFilter('wrong'); break
        case 's': case 'S': pickFilter('skipped'); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })   // no dep array: the handler closes over index/visible, which change every render

  const total = totalQuestions(attempt)
  const maxScore = total * MARKS_CORRECT
  const lDef = levelDef(attempt.unit_id, attempt.level)
  const syllabus = [unitName(attempt.unit_id), lDef && `${lDef.name}${lDef.topic && lDef.topic !== lDef.name ? ` — ${lDef.topic}` : ''}`]
    .filter(Boolean).join(' · ')

  return (
    <div className="attempt-reviewer" role="dialog" aria-label="Attempt review">
      {/* ── Header: which attempt, and how it went ── */}
      <div className="ar-header">
        <button onClick={onClose} title="Close (Esc)" className="ar-close" aria-label="Close review">
          <X size={18} />
        </button>

        <div style={{ minWidth: 0 }}>
          {/* "·" between every pair: "Unit 01 Level 03" butts two numbers
              together — the "Level 3 2 times" misread this app has hit before. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.9375rem', flexWrap: 'wrap' }}>
            <span>Unit {String(attempt.unit_id).padStart(2, '0')}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{levelBadge(attempt.unit_id, attempt.level, { pad: true })}</span>
            <InfoTooltip text={syllabus} align="left" />
            {attemptNo != null && <><span style={{ opacity: 0.5 }}>·</span><span>Attempt #{attemptNo}</span></>}
          </div>
          {studentName && <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.05rem' }}>{studentName}</div>}
        </div>

        <div className="ar-stats">
          <span><small>Score</small> {attempt.score ?? 0}<em>/{maxScore}</em></span>
          <span><small>Accuracy</small> {accuracyOf(attempt).toFixed(0)}%</span>
          <span><small>Time</small> {fmtDuration(attempt.time_taken)}</span>
        </div>
      </div>

      {/* ── Filter: the old Correct/Wrong/Skipped tiles, as one segmented row ── */}
      <div className="ar-filterbar">
        {FILTERS.map(([key, label]) => {
          const active = filter === key
          const tone = key ? STATUS[key] : null
          const n = key ? counts[key] : counts.all
          return (
            <button key={label} onClick={() => pickFilter(key)} className="ar-filter"
              title={`Show ${key ? label.toLowerCase() : 'all'} questions (${label[0]})`}
              style={{
                borderColor: active ? (tone ? tone.solid : 'var(--primary)') : 'var(--gray-200)',
                background: active ? (tone ? tone.bg : 'var(--primary-light)') : '#fff',
                color: active ? (tone ? tone.fg : 'var(--primary-dark)') : 'var(--gray-600)',
              }}>
              {tone && <span className="ar-dot" style={{ background: tone.solid }} />}
              {label}
              <strong style={{ color: tone ? tone.solid : 'inherit' }}>{n}</strong>
            </button>
          )
        })}
      </div>

      {/* ── The question itself ── */}
      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {questions === null ? (
            <div className="empty-state">Loading questions…</div>
          ) : !cur ? (
            <div className="ar-card" style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{filter === 'wrong' ? '🎉' : filter === 'correct' ? '📘' : '✨'}</div>
              <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>
                {filter === 'wrong' ? 'No wrong answers in this attempt!'
                  : filter === 'skipped' ? 'Nothing skipped — every question was answered.'
                  : filter === 'correct' ? 'No correct answers in this attempt yet.'
                  : 'No questions found for this attempt.'}
              </div>
              {filter && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => pickFilter(null)}>
                  Show all questions
                </button>
              )}
            </div>
          ) : (
            <div className="ar-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--gray-500)' }}>Q{cur.num}.</span>
                <code style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{cur.q.qid}</code>
                {cur.q.difficulty_level && (
                  <span className={`badge badge-${cur.q.difficulty_level.toLowerCase()}`}>{cur.q.difficulty_level}</span>
                )}
                {cur.q.question_tag && (
                  <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{cur.q.question_tag}</span>
                )}
                <span className="badge" style={{
                  marginLeft: 'auto', background: STATUS[cur.status].bg, color: STATUS[cur.status].fg,
                  border: `1px solid ${STATUS[cur.status].border}`, fontSize: '0.8rem', padding: '0.25rem 0.75rem',
                }}>
                  {cur.status === 'correct' ? '✓ ' : cur.status === 'wrong' ? '✗ ' : '– '}{STATUS[cur.status].label}
                </span>
              </div>

              {cur.keyChanged && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8125rem', color: '#92400e', marginBottom: '1rem', lineHeight: 1.5 }}>
                  <strong>Answer key updated.</strong> This question’s key was corrected after the attempt — it was graded <strong>{cur.keyChanged.graded}</strong> at the time, and the right answer is now shown below. The score above is unchanged.
                </div>
              )}

              <QuestionView
                q={cur.q}
                mode="review"
                size="full"
                options={grading.optionsFor(cur.q)}
                isChosen={opt => grading.isChosen(cur.q, opt)}
              />

              {cur.status === 'skipped' && (
                <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#b45309', background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                  Not answered — the correct answer is highlighted in green.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: prev / question palette / next ── */}
      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => go(-1)} disabled={atFirst || !cur}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Previous question">
          <ChevronLeft size={16} /> <span className="ar-nav-label">Previous</span>
        </button>

        <div ref={paletteRef} className="ar-palette">
          {visible.map((it, i) => {
            const current = i === index
            const tone = STATUS[it.status]
            return (
              <button key={it.q.id} data-current={current} onClick={() => setPos(i)}
                title={`Q${it.num} · ${it.q.qid} · ${tone.label}${it.keyChanged ? ' · answer key updated' : ''}`}
                className="ar-chip"
                style={{
                  background: current ? tone.solid : tone.bg,
                  color: current ? '#fff' : tone.fg,
                  borderColor: current ? tone.solid : tone.border,
                  boxShadow: current ? `0 0 0 2px #fff, 0 0 0 4px ${tone.solid}` : 'none',
                }}>
                {it.num}
                {it.keyChanged && <span className="ar-chip-flag" />}
              </button>
            )
          })}
        </div>

        <div className="ar-count">{cur ? `${index + 1} of ${visible.length}` : '0 of 0'}</div>

        {atLast && cur ? (
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>
            Done
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => go(1)} disabled={!cur}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Next question">
            <span className="ar-nav-label">Next</span> <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="ar-hints">
        <span><kbd>←</kbd> <kbd>→</kbd> prev / next</span>
        <span><kbd>A</kbd> all</span>
        <span><kbd>C</kbd> correct</span>
        <span><kbd>W</kbd> wrong</span>
        <span><kbd>S</kbd> skipped</span>
        <span><kbd>Home</kbd> <kbd>End</kbd> first / last</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  )
}
