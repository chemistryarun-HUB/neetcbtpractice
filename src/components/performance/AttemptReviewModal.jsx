import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { optionEntries, correctOptionKey } from '../../lib/questionOptions'
import { accuracyOf, totalQuestions, fmtDuration, unitName, levelDef } from '../../lib/performanceMetrics'

// Mirrors ResultPage.jsx's own review UI — same Correct/Wrong/Skipped tiles
// the student sees on their own post-test screen (clicking a tile filters
// the list below), so admin and student are looking at the same thing.
export default function AttemptReviewModal({ attempt, studentName, onClose }) {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null) // null (all) | 'correct' | 'wrong' | 'skipped'

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('questions')
        .select('id, qid, question, question_image, option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image, correct_option, difficulty_level, question_tag')
        .in('id', attempt.question_ids || [])
      if (cancelled) return
      const byId = Object.fromEntries((data || []).map(q => [q.id, q]))
      // Preserve the order the student actually saw the questions in.
      setQuestions((attempt.question_ids || []).map(id => byId[id]).filter(Boolean))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [attempt.id])

  const storedAnswers = attempt.answers || {}
  const hasNewFormat = storedAnswers.responses !== undefined
  const responses = hasNewFormat ? (storedAnswers.responses || {}) : storedAnswers
  const correctIds = new Set(storedAnswers.correct_ids || [])
  const wrongIds = new Set(storedAnswers.wrong_ids || [])
  const skippedIds = new Set(storedAnswers.skipped_ids || [])

  function statusFor(q) {
    // Prefer the status recorded at attempt time (authoritative); fall back to
    // live derivation only for attempts predating that field.
    if (hasNewFormat && (correctIds.size || wrongIds.size || skippedIds.size)) {
      if (correctIds.has(q.id)) return 'correct'
      if (wrongIds.has(q.id)) return 'wrong'
      return 'skipped'
    }
    const selected = responses[q.id]
    if (!selected) return 'skipped'
    const correctKey = correctOptionKey(q)
    const correctEntry = optionEntries(q).find(e => e.key === correctKey)
    const isCorrect = selected === correctKey || (correctEntry?.text && selected === correctEntry.text)
    return isCorrect ? 'correct' : 'wrong'
  }

  function isChosen(opt, q) {
    const selected = responses[q.id]
    return selected === opt.key || (opt.text !== '' && selected === opt.text)
  }

  const total = totalQuestions(attempt)
  const accuracy = accuracyOf(attempt)
  const lDef = levelDef(attempt.unit_id, attempt.level)

  const visibleQuestions = (questions || []).filter(q => !filter || statusFor(q) === filter)
  // Sorted by qid within a filtered category, matching ResultPage.jsx's own
  // Correct/Wrong/Skipped modals; the unfiltered "all" view keeps the order
  // the student actually saw the questions in.
  const sortedVisible = filter
    ? [...visibleQuestions].sort((a, b) => (a.qid || '').localeCompare(b.qid || '', undefined, { numeric: true, sensitivity: 'base' }))
    : visibleQuestions

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div>Attempt Review</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--gray-500)', marginTop: '0.2rem' }}>
              Unit {String(attempt.unit_id).padStart(2, '0')} · Level {String(attempt.level).padStart(2, '0')} · Attempt #{attempt.attempt_number} — {studentName}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
          {[
            ['Score', attempt.score],
            ['Accuracy', `${accuracy.toFixed(0)}%`],
            ['Time', fmtDuration(attempt.time_taken)],
          ].map(([label, value]) => (
            <div key={label} style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              {label}
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gray-800)', marginTop: '0.15rem' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {lDef?.topic && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px dashed var(--gray-200)' }}>
              <strong style={{ color: 'var(--gray-700)' }}>Syllabus:</strong> {lDef.topic}
            </div>
          )}

          {/* Same Correct/Wrong/Skipped tiles as the student's own result screen —
              click a tile to filter the list below to just that category, click it
              again to go back to showing everything. */}
          <div className="result-tiles" style={{ margin: '0 0 1.25rem' }}>
            <div className={`result-tile correct ${filter === 'correct' ? 'active' : ''}`} onClick={() => setFilter(f => f === 'correct' ? null : 'correct')}>
              <div className="tile-num">{attempt.correct_count ?? 0}</div>
              <div className="tile-label">Correct</div>
            </div>
            <div className={`result-tile wrong ${filter === 'wrong' ? 'active' : ''}`} onClick={() => setFilter(f => f === 'wrong' ? null : 'wrong')}>
              <div className="tile-num">{attempt.wrong_count ?? 0}</div>
              <div className="tile-label">Wrong</div>
            </div>
            <div className={`result-tile skipped ${filter === 'skipped' ? 'active' : ''}`} onClick={() => setFilter(f => f === 'skipped' ? null : 'skipped')}>
              <div className="tile-num">{attempt.skipped_count ?? 0}</div>
              <div className="tile-label">Skipped</div>
            </div>
          </div>
          {filter && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }} onClick={() => setFilter(null)}>
              Showing {filter} only — click to show all
            </button>
          )}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
          ) : sortedVisible.length === 0 ? (
            <div className="empty-state">{filter ? `No ${filter} questions` : 'No questions found for this attempt'}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sortedVisible.map((q, i) => {
                const status = statusFor(q)
                const correctKey = correctOptionKey(q)
                const opts = optionEntries(q)
                return (
                  <div key={q.id} style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <code>{q.qid}</code>
                        <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                      </div>
                      <span className={`badge ${status === 'correct' ? 'badge-easy' : status === 'wrong' ? 'badge-hard' : 'badge-locked'}`}>
                        {status === 'correct' ? 'Correct' : status === 'wrong' ? 'Wrong' : 'Skipped'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', whiteSpace: 'pre-wrap', marginBottom: '0.6rem' }}>
                      <span style={{ color: 'var(--gray-400)', marginRight: '0.4rem' }}>Q{i + 1}.</span>{q.question}
                    </div>
                    {q.question_image && (
                      <img src={q.question_image} alt="Question" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, border: '1px solid var(--gray-200)', marginBottom: '0.6rem' }} />
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
                      {opts.map(opt => {
                        const isCorrect = opt.key === correctKey
                        const chosen = isChosen(opt, q)
                        let bg = 'transparent', color = 'var(--gray-600)', border = '1px solid var(--gray-200)', fw = 400
                        if (isCorrect) { bg = '#dcfce7'; color = '#15803d'; border = '1px solid #86efac'; fw = 600 }
                        if (chosen && !isCorrect) { bg = '#fee2e2'; color = '#b91c1c'; border = '1px solid #fca5a5'; fw = 600 }
                        return (
                          <div key={opt.key} style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', background: bg, color, fontWeight: fw, border, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span>{opt.text}{isCorrect ? ' ✓' : chosen ? ' ✗' : ''}</span>
                            {opt.image && <img src={opt.image} alt="" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 4 }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
