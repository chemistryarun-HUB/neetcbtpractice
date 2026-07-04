import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { UNIT_LEVELS, UNLOCK_THRESHOLDS, QUESTIONS_PER_ATTEMPT } from '../../lib/constants'
import { X } from 'lucide-react'

export default function ResultPage() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState(null)
  const [modal, setModal] = useState(null) // 'correct' | 'wrong' | 'skipped'
  const [loading, setLoading] = useState(true)
  const [attemptsForLevel, setAttemptsForLevel] = useState(0)
  const [nextUnlocked, setNextUnlocked] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: att } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
      if (!att) { navigate('/student/dashboard'); return }
      setAttempt(att)

      // Fetch ALL question objects for this attempt using question_ids array
      const { data: qs } = await supabase
        .from('questions')
        .select('id, qid, question, option1, option2, option3, option4, correct_option, difficulty_level, question_tag, topic')
        .in('id', att.question_ids)
      setQuestions(qs || [])

      const [{ data: prog }, { count }] = await Promise.all([
        supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
        supabase.from('test_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('unit_id', att.unit_id)
          .eq('level', att.level)
          .eq('submitted', true),
      ])
      setProgress(prog)
      setAttemptsForLevel(count || 0)

      const nextLvl = att.level + 1
      setNextUnlocked((prog?.unlocked_levels_by_unit?.[att.unit_id] || []).includes(nextLvl) && nextLvl <= 9)

      setLoading(false)
    }
    load()
  }, [attemptId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!attempt) return null

  const { correct_count: correct, wrong_count: wrong, skipped_count: skipped, score, level, unit_id: unitId } = attempt
  const totalQ = correct + wrong + skipped
  const maxScore = totalQ * 4
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  const levelInfo = (UNIT_LEVELS[unitId] || []).find(l => l.id === level)

  // Read pre-classified ID lists stored at submission time (new format)
  // Fall back to legacy re-classification if old attempt format
  const storedAnswers = attempt.answers || {}
  const hasNewFormat = storedAnswers.responses !== undefined

  const responses   = hasNewFormat ? (storedAnswers.responses   || {}) : storedAnswers
  const correctIds  = hasNewFormat ? (storedAnswers.correct_ids  || []) : []
  const wrongIds    = hasNewFormat ? (storedAnswers.wrong_ids    || []) : []
  const skippedIds  = hasNewFormat ? (storedAnswers.skipped_ids  || []) : attempt.question_ids || []

  // Build O(1) lookup map: id → question object
  const qMap = new Map(questions.map(q => [q.id, q]))

  // Sort a list of question IDs by qid string ascending (e.g. CU11001 < CU11002)
  function sortedQObjects(ids) {
    return ids
      .map(id => qMap.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.qid || '').localeCompare(b.qid || '', undefined, { numeric: true, sensitivity: 'base' }))
  }

  const correctQs  = sortedQObjects(correctIds)
  const wrongQs    = sortedQObjects(wrongIds)
  const skippedQs  = sortedQObjects(skippedIds)

  const questionsForModal = modal === 'correct' ? correctQs : modal === 'wrong' ? wrongQs : skippedQs

  const threshold = UNLOCK_THRESHOLDS.find(t => t.attempt === attemptsForLevel)
  const passed = threshold ? pct >= threshold.score_pct : false

  const mins = Math.floor((attempt.time_taken || 0) / 60)
  const secs = (attempt.time_taken || 0) % 60

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT — Result</div>
        <Link to="/student/dashboard" className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
          Back to Syllabus
        </Link>
      </header>

      <div className="page-content" style={{ maxWidth: '720px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
            Level {level}: {levelInfo?.name} · Attempt #{attemptsForLevel}
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: score >= 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>out of {maxScore} · {pct}% score</div>
          <div style={{ color: 'var(--gray-400)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Time: {mins}m {secs}s
          </div>
        </div>

        {/* Status banner */}
        {nextUnlocked ? (
          <div style={{ background: '#dcfce7', border: '1.5px solid #16a34a', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1rem' }}>🎉 Level {level + 1} Unlocked!</div>
            <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.25rem' }}>Score ≥ {threshold?.score_pct}% — great work!</div>
          </div>
        ) : threshold && !passed ? (
          <div style={{ background: '#fef9c3', border: '1.5px solid #d97706', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#92400e' }}>Score more to unlock next level</div>
            <div style={{ color: '#b45309', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Need {threshold.score_pct}% score on attempt #{threshold.attempt}. You got {pct}%.
            </div>
          </div>
        ) : null}

        <div className="result-tiles">
          <div className="result-tile correct" onClick={() => setModal('correct')}>
            <div className="tile-num">{correct}</div>
            <div className="tile-label">Correct</div>
          </div>
          <div className="result-tile wrong" onClick={() => setModal('wrong')}>
            <div className="tile-num">{wrong}</div>
            <div className="tile-label">Wrong</div>
          </div>
          <div className="result-tile skipped" onClick={() => setModal('skipped')}>
            <div className="tile-num">{skipped}</div>
            <div className="tile-label">Skipped</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate(`/student/test/${unitId}/${level}`)}>
            Practice More
          </button>
          {nextUnlocked && level < 9 && (
            <button className="btn btn-primary" onClick={() => navigate(`/student/test/${unitId}/${level + 1}`)}>
              Start Level {level + 1} →
            </button>
          )}
          <Link to="/student/dashboard" className="btn btn-ghost">
            Back to Syllabus
          </Link>
        </div>
      </div>

      {/* Detail modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              {modal === 'correct' ? '✅ Correct Questions' : modal === 'wrong' ? '❌ Wrong Questions' : '⏭ Skipped Questions'}
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {questionsForModal.length === 0 ? (
                <div className="empty-state">None</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {questionsForModal.map(q => {
                    const opts = [q.option1, q.option2, q.option3, q.option4]
                    const selected = responses[q.id]
                    return (
                      <div key={q.id} style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                        {/* Meta row — no topic chip to save space */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <code>{q.qid}</code>
                          <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                          {q.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{q.question_tag}</span>}
                        </div>

                        {/* Question text */}
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', whiteSpace: 'pre-wrap', marginBottom: '0.6rem' }}>{q.question}</div>

                        {modal === 'correct' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {opts.map((opt, i) => (
                              <div key={i} style={{
                                padding: '0.4rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.8125rem',
                                whiteSpace: 'pre-wrap',
                                background: opt === q.correct_option ? '#dcfce7' : 'transparent',
                                color: opt === q.correct_option ? '#15803d' : 'var(--gray-600)',
                                fontWeight: opt === q.correct_option ? 600 : 400,
                                border: opt === q.correct_option ? '1px solid #86efac' : '1px solid transparent',
                              }}>
                                {String.fromCharCode(65 + i)}. {opt}
                                {opt === q.correct_option && ' ✓'}
                              </div>
                            ))}
                          </div>
                        )}

                        {(modal === 'wrong' || modal === 'skipped') && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {opts.map((opt, i) => {
                              const isCorrect  = opt === q.correct_option
                              const isSelected = opt === selected
                              let bg = 'transparent', color = 'var(--gray-600)', border = '1px solid transparent', fw = 400, suffix = ''
                              if (isCorrect) { bg = '#dcfce7'; color = '#15803d'; border = '1px solid #86efac'; fw = 600; suffix = ' ✓' }
                              if (isSelected && !isCorrect) { bg = '#fee2e2'; color = '#b91c1c'; border = '1px solid #fca5a5'; fw = 600; suffix = ' ✗' }
                              return (
                                <div key={i} style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', background: bg, color, fontWeight: fw, border }}>
                                  {String.fromCharCode(65 + i)}. {opt}{suffix}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
