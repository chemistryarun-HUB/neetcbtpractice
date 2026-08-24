import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { UNIT_LEVELS, QUESTIONS_PER_ATTEMPT, thresholdPctFor, nextLevelIdFor, levelBadge, isChapterTestLevel } from '../../lib/constants'
import { optionEntries, correctOptionKey } from '../../lib/questionOptions'
import { orderOptionsForReview } from '../../lib/optionShuffle'
import { hasStructuredMtc } from '../../lib/mtc'
import MatchTable from '../../components/shared/MatchTable'
import InfoTooltip from '../../components/shared/InfoTooltip'
import { useModalExpand, useBodyScrollLock } from '../../hooks/useModalExpand'
import ModalExpandButton from '../../components/shared/ModalExpandButton'
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
  const [nextLevelId, setNextLevelId] = useState(null)
  const [expanded, toggleExpanded] = useModalExpand()
  useBodyScrollLock(!!modal)

  useEffect(() => {
    async function load() {
      const { data: att } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
      if (!att) { navigate('/student/dashboard'); return }
      setAttempt(att)

      // Fetch ALL question objects for this attempt using question_ids array
      const { data: qs } = await supabase
        .from('questions')
        .select('id, qid, question, question_type, question_image, option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image, correct_option, difficulty_level, question_tag, topic, col_a1, col_a2, col_a3, col_a4, col_b1, col_b2, col_b3, col_b4, col_a1_image, col_a2_image, col_a3_image, col_a4_image, col_b1_image, col_b2_image, col_b3_image, col_b4_image')
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

      // Next level comes from this unit's level list, not `level + 1` capped at 9 —
      // units with more than nine levels never showed the unlock banner past L9.
      const nextLvl = nextLevelIdFor(att.unit_id, att.level)
      setNextLevelId(nextLvl)
      setNextUnlocked(nextLvl != null && (prog?.unlocked_levels_by_unit?.[att.unit_id] || []).includes(nextLvl))

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
  // The option order this student actually saw during the test. Attempts taken
  // before this was recorded fall back to the authored order — which is exactly
  // what they used to display anyway.
  const optionOrder = hasNewFormat ? (storedAnswers.option_order || {}) : {}

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

  // How this answer scores under the CURRENT key, vs. how it was graded at submit
  // time. An admin correcting a question's answer key afterwards desyncs the two,
  // which otherwise renders as a flat contradiction — a question sitting under
  // "Wrong" with the student's own answer highlighted green, or under "Correct"
  // with a red ✗ on it. Surface the change instead of showing it silently.
  function liveStatusOf(q) {
    const selected = responses[q.id]
    if (!selected) return 'skipped'
    const correctKey = correctOptionKey(q)
    const correctEntry = optionEntries(q).find(e => e.key === correctKey)
    return (selected === correctKey || (correctEntry?.text && selected === correctEntry.text)) ? 'correct' : 'wrong'
  }

  function keyChangedOf(q) {
    if (!hasNewFormat) return null
    const graded = correctIds.includes(q.id) ? 'correct' : wrongIds.includes(q.id) ? 'wrong' : 'skipped'
    const now = liveStatusOf(q)
    if (graded === 'skipped' || now === 'skipped' || graded === now) return null
    return { graded, now }
  }

  const requiredPct = thresholdPctFor(attemptsForLevel)
  const passed = requiredPct != null && pct >= requiredPct

  const mins = Math.floor((attempt.time_taken || 0) / 60)
  const secs = (attempt.time_taken || 0) % 60

  return (
    <div className="dashboard">
      <header className="topbar">
        <Link to="/student/dashboard" className="topbar-brand" style={{ color: '#fff', textDecoration: 'none' }}>NEETCBT — Result</Link>
        <Link to="/student/dashboard" className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
          Back to Syllabus
        </Link>
      </header>

      <div className="page-content" style={{ maxWidth: '720px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
            {isChapterTestLevel(unitId, level) ? 'CCT' : `${levelBadge(unitId, level)}: ${levelInfo?.name}`} · Attempt #{attemptsForLevel}
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
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              🎉 {isChapterTestLevel(unitId, nextLevelId) ? (
                <>CCT Unlocked!<InfoTooltip text="Complete Chapter Test" /></>
              ) : (
                `${levelBadge(unitId, nextLevelId)} Unlocked!`
              )}
            </div>
            <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.25rem' }}>Score ≥ {requiredPct}% — great work!</div>
          </div>
        ) : requiredPct != null && !passed ? (
          <div style={{ background: '#fef9c3', border: '1.5px solid #d97706', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#92400e' }}>Score more to unlock next level</div>
            <div style={{ color: '#b45309', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Need {requiredPct}% score on attempt #{attemptsForLevel}. You got {pct}%.
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
          {nextUnlocked && nextLevelId != null && (
            <button className="btn btn-primary" onClick={() => navigate(`/student/test/${unitId}/${nextLevelId}`)}>
              Start {isChapterTestLevel(unitId, nextLevelId) ? 'CCT' : levelBadge(unitId, nextLevelId)} →
            </button>
          )}
          <Link to="/student/dashboard" className="btn btn-ghost">
            Back to Syllabus
          </Link>
        </div>
      </div>

      {/* Detail modal */}
      {modal && (
        <div className="modal-overlay overlay-review" onClick={() => setModal(null)}>
          <div className={`modal modal-review${expanded ? ' expanded' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              {modal === 'correct' ? '✅ Correct Questions' : modal === 'wrong' ? '❌ Wrong Questions' : '⏭ Skipped Questions'}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                <ModalExpandButton expanded={expanded} onToggle={toggleExpanded} />
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button>
              </span>
            </div>
            <div className="modal-body">
              {questionsForModal.length === 0 ? (
                <div className="empty-state">None</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {questionsForModal.map(q => {
                    const opts = orderOptionsForReview(q, optionOrder[q.id])
                    const correctKey = correctOptionKey(q)
                    const selected = responses[q.id]
                    // Attempts submitted before the key-based fix stored the raw
                    // selected option text instead of its key — match either form.
                    const isSelected = (opt) => selected === opt.key || (opt.text !== '' && selected === opt.text)
                    const keyChanged = keyChangedOf(q)
                    return (
                      <div key={q.id} style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                        {/* Meta row — kept in sync with AttemptReviewModal.jsx's meta row */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span><span style={{ fontWeight: 600 }}>Q ID:</span> <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{q.qid}</code></span>
                          <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                          {q.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{q.question_tag}</span>}
                          {keyChanged && (
                            <span className="badge" style={{ background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' }}>key updated</span>
                          )}
                        </div>

                        {keyChanged && (
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#92400e', marginBottom: '0.6rem', lineHeight: 1.5 }}>
                            This question’s answer key was corrected after your attempt. It was graded <strong>{keyChanged.graded}</strong> at the time, but the right answer is now shown below. Your score for this test hasn’t changed.
                          </div>
                        )}

                        {/* Question text */}
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', whiteSpace: 'pre-wrap', marginBottom: '0.6rem' }}>{q.question}</div>
                        {q.question_image && (
                          <div style={{ marginBottom: '0.6rem' }}>
                            <img src={q.question_image} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                          </div>
                        )}
                        {hasStructuredMtc(q) && <MatchTable q={q} />}

                        {modal === 'correct' && !keyChanged && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {opts.map((opt, i) => {
                              const isCorrect = opt.key === correctKey
                              return (
                                <div key={opt.key} style={{
                                  padding: '0.4rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8125rem',
                                  whiteSpace: 'pre-wrap',
                                  background: isCorrect ? '#dcfce7' : 'transparent',
                                  color: isCorrect ? '#15803d' : 'var(--gray-600)',
                                  fontWeight: isCorrect ? 600 : 400,
                                  border: isCorrect ? '1px solid #86efac' : '1px solid transparent',
                                }}>
                                  {String.fromCharCode(65 + i)}. {opt.text}
                                  {opt.image && <img src={opt.image} alt={`Option ${i + 1}`} style={{ maxWidth: '100%', maxHeight: 120, marginTop: '0.3rem', display: 'block', borderRadius: 4 }} />}
                                  {isCorrect && ' ✓'}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* The "correct" view normally just points at the right answer,
                            since the student's pick and the right answer are the same
                            thing. A corrected key breaks that, so fall through to the
                            detailed view that marks both. */}
                        {(modal !== 'correct' || keyChanged) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {opts.map((opt, i) => {
                              const isCorrect  = opt.key === correctKey
                              const selectedHere = isSelected(opt)
                              let bg = 'transparent', color = 'var(--gray-600)', border = '1px solid transparent', fw = 400, suffix = ''
                              if (isCorrect) { bg = '#dcfce7'; color = '#15803d'; border = '1px solid #86efac'; fw = 600; suffix = ' ✓' }
                              if (selectedHere && !isCorrect) { bg = '#fee2e2'; color = '#b91c1c'; border = '1px solid #fca5a5'; fw = 600; suffix = ' ✗' }
                              return (
                                <div key={opt.key} style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', background: bg, color, fontWeight: fw, border }}>
                                  {String.fromCharCode(65 + i)}. {opt.text}
                                  {opt.image && <img src={opt.image} alt={`Option ${i + 1}`} style={{ maxWidth: '100%', maxHeight: 120, marginTop: '0.3rem', display: 'block', borderRadius: 4 }} />}
                                  {suffix}
                                  {/* Without this, an answer that turned green because
                                      the key was corrected is indistinguishable from
                                      one the student never picked. */}
                                  {selectedHere && (
                                    <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                                      Your answer
                                    </span>
                                  )}
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
