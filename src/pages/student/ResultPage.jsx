import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { thresholdPctFor, nextLevelIdFor, isChapterTestLevel } from '../../lib/constants'
import { neetT, levelName, levelBadgeT } from '../../lib/neetI18n'
import InfoTooltip from '../../components/shared/InfoTooltip'
import AttemptReviewer from '../../components/performance/AttemptReviewer'

export default function ResultPage() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const medium = user.medium || 'en'
  const t = neetT(medium)

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState(null)
  // Which slice the full-screen reviewer opens on: 'all' | 'correct' | 'wrong'
  // | 'skipped' — null while it's closed.
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attemptsForLevel, setAttemptsForLevel] = useState(0)
  const [nextUnlocked, setNextUnlocked] = useState(false)
  const [nextLevelId, setNextLevelId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: att } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
      if (!att) { navigate('/student/dashboard'); return }
      setAttempt(att)

      // Fetch ALL question objects for this attempt using question_ids array
      const { data: qs } = await supabase
        .from('questions')
        .select('id, qid, question, question_type, question_image, option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image, correct_option, difficulty_level, question_tag, topic, col_a1, col_a2, col_a3, col_a4, col_a5, col_a6, col_a7, col_a8, col_a9, col_a10, col_b1, col_b2, col_b3, col_b4, col_b5, col_b6, col_b7, col_b8, col_b9, col_b10, col_a1_image, col_a2_image, col_a3_image, col_a4_image, col_a5_image, col_a6_image, col_a7_image, col_a8_image, col_a9_image, col_a10_image, col_b1_image, col_b2_image, col_b3_image, col_b4_image, col_b5_image, col_b6_image, col_b7_image, col_b8_image, col_b9_image, col_b10_image, mtc_label_a, mtc_label_b')
        .in('id', att.question_ids)
      // In the order the student actually sat them, so the reviewer's Q7 is
      // the Q7 they saw in the test.
      const byId = Object.fromEntries((qs || []).map(q => [q.id, q]))
      setQuestions((att.question_ids || []).map(id => byId[id]).filter(Boolean))

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

  const badge = id => levelBadgeT(unitId, id, medium)

  const requiredPct = thresholdPctFor(attemptsForLevel)
  const passed = requiredPct != null && pct >= requiredPct

  const mins = Math.floor((attempt.time_taken || 0) / 60)
  const secs = (attempt.time_taken || 0) % 60

  return (
    <div className="dashboard" lang={medium}>
      <header className="topbar">
        <Link to="/student/dashboard" className="topbar-brand" style={{ color: '#fff', textDecoration: 'none' }}>NEETCBT — {t.result}</Link>
        <Link to="/student/dashboard" className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
          {t.backToSyllabus}
        </Link>
      </header>

      <div className="page-content" style={{ maxWidth: '720px' }}>
        <div className="rp-hero">
          <div className="rp-hero-label">
            {isChapterTestLevel(unitId, level) ? 'CCT' : `${badge(level)}: ${levelName(unitId, level, medium)}`} · {t.attemptNo(attemptsForLevel)}
          </div>
          <div className="rp-ring" style={{ '--p': Math.max(0, Math.min(100, pct)), '--c': score >= 0 ? (pct >= 60 ? '#16a34a' : '#d97706') : '#dc2626' }}>
            <div className="rp-ring-inner">
              <div className="rp-score">{score}</div>
              <div className="rp-outof">{t.outOf(maxScore)}</div>
            </div>
          </div>
          <div className="rp-meta">
            <span><strong>{pct}%</strong> {t.score}</span>
            <span><strong>{totalQ ? Math.round((correct / totalQ) * 100) : 0}%</strong> {t.correctPct}</span>
            <span><strong>{mins}m {secs}s</strong> {t.time}</span>
          </div>
          <div className="rp-bar" aria-hidden="true">
            <span style={{ width: `${totalQ ? (correct / totalQ) * 100 : 0}%`, background: '#16a34a' }} />
            <span style={{ width: `${totalQ ? (wrong / totalQ) * 100 : 0}%`, background: '#dc2626' }} />
            <span style={{ width: `${totalQ ? (skipped / totalQ) * 100 : 0}%`, background: '#f59e0b' }} />
          </div>
        </div>

        {/* Status banner */}
        {nextUnlocked ? (
          <div style={{ background: '#dcfce7', border: '1.5px solid #16a34a', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              🎉 {isChapterTestLevel(unitId, nextLevelId) ? (
                <>{t.unlocked('CCT')}<InfoTooltip text="Complete Chapter Test" /></>
              ) : (
                t.unlocked(badge(nextLevelId))
              )}
            </div>
            <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.25rem' }}>{t.greatWork(requiredPct)}</div>
          </div>
        ) : requiredPct != null && !passed ? (
          <div style={{ background: '#fef9c3', border: '1.5px solid #d97706', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#92400e' }}>{t.scoreMore}</div>
            <div style={{ color: '#b45309', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {t.needScore(requiredPct, attemptsForLevel, pct)}
            </div>
          </div>
        ) : null}

        <div className="result-tiles" style={{ marginBottom: '0.75rem' }}>
          <div className="result-tile correct" onClick={() => setReview('correct')}>
            <div className="tile-num">{correct}</div>
            <div className="tile-label">{t.correct}</div>
          </div>
          <div className="result-tile wrong" onClick={() => setReview('wrong')}>
            <div className="tile-num">{wrong}</div>
            <div className="tile-label">{t.wrong}</div>
          </div>
          <div className="result-tile skipped" onClick={() => setReview('skipped')}>
            <div className="tile-num">{skipped}</div>
            <div className="tile-label">{t.skipped}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={() => setReview('all')}>
            {t.reviewAll(totalQ)}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate(`/student/test/${unitId}/${level}`)}>
            {t.practiceMore}
          </button>
          {nextUnlocked && nextLevelId != null && (
            <button className="btn btn-primary" onClick={() => navigate(`/student/test/${unitId}/${nextLevelId}`)}>
              {t.startNext(badge(nextLevelId))}
            </button>
          )}
          <Link to="/student/dashboard" className="btn btn-ghost">
            {t.backToSyllabus}
          </Link>
        </div>
      </div>

      {review && (
        <AttemptReviewer
          attempt={attempt}
          questions={questions}
          attemptNo={attemptsForLevel}
          initialFilter={review === 'all' ? null : review}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  )
}
