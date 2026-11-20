import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AttemptReviewer from '../../components/performance/AttemptReviewer'
import { attemptGrading } from '../../lib/attemptGrading'
import { fmtDuration } from '../../lib/performanceMetrics'
import { paperTitle, chapterBreakdown, GSEB_QUESTION_SELECT, gsebReviewQuestion } from '../../lib/gseb'
import { startGsebPractice } from '../../lib/gsebBank'

const STATUS_LABEL = { correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped' }

export default function GsebResultPage() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [review, setReview] = useState(null) // null | 'all' | 'correct' | 'wrong' | 'skipped'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: att } = await supabase.from('gseb_attempts').select('*')
        .eq('id', attemptId).eq('student_id', user.id).eq('submitted', true).single()
      if (!att) { navigate('/student/gseb', { replace: true }); return }
      // Chapter-wise tests have no paper_id; their questions carry
      // their own paper so the review can say which year each came from.
      const [{ data: p }, { data: qs }] = await Promise.all([
        att.paper_id ? supabase.from('gseb_papers').select('*').eq('id', att.paper_id).single() : { data: null },
        supabase.from('gseb_questions').select(GSEB_QUESTION_SELECT).in('id', att.question_ids),
      ])
      const byId = Object.fromEntries((qs || []).map(q => [q.id, gsebReviewQuestion(q)]))
      setAttempt(att)
      setPaper(p)
      setQuestions((att.question_ids || []).map(id => byId[id]).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [attemptId, user.id, navigate])

  async function again() {
    if (attempt.paper_id) { navigate(`/student/gseb/test/${attempt.paper_id}`); return }
    try {
      const id = await startGsebPractice({
        studentId: user.id, subject: attempt.subject, mode: attempt.mode, title: attempt.title,
        questionIds: attempt.question_ids, durationMin: attempt.duration_min,
      })
      navigate(`/student/gseb/practice/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const total = questions.length
  const pct = total ? Math.round((attempt.score / total) * 100) : 0
  const ringColor = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626'
  const subject = paper?.subject || attempt.subject
  const grading = attemptGrading(attempt)
  const chapters = subject ? chapterBreakdown(subject, questions, q => grading.statusOf(q)) : []
  const title = paper ? paperTitle(paper) : attempt.title || 'GSEB test'

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/student/dashboard')}>NEETCBT</div>
      </header>
      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link to="/student/gseb" className="back-btn"><ArrowLeft size={15} /> All GSEB papers</Link>

        <div className="rp-hero">
          <div className="rp-hero-label">{title}</div>
          <div className="rp-ring" style={{ '--p': pct, '--c': ringColor }}>
            <div className="rp-ring-inner">
              <div className="rp-score">{attempt.score}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>out of {total}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Time taken {fmtDuration(attempt.time_taken)}
            {paper?.key_status === 'provisional' && ' · graded on the provisional answer key'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={again}>
              <RotateCcw size={14} /> Attempt again
            </button>
          </div>
        </div>

        <div className="result-tiles" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          {['correct', 'wrong', 'skipped'].map(s => (
            <div key={s} className={`result-tile ${s}`} onClick={() => setReview(s)}>
              <div className="tile-num">{attempt[`${s}_count`]}</div>
              <div className="tile-label">{STATUS_LABEL[s]}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button className="btn btn-primary" onClick={() => setReview('all')}>Review all {total} questions →</button>
        </div>

        {chapters.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ fontWeight: 700 }}>Chapter-wise</div>
            <div className="table-wrap" style={{ maxHeight: 'none' }}>
              <table>
                <thead><tr><th>Chapter</th><th style={{ textAlign: 'right' }}>Correct</th></tr></thead>
                <tbody>
                  {chapters.map(c => (
                    <tr key={c.chapterNo ?? 'none'}>
                      <td>{c.chapterNo ? `${c.chapterNo}. ` : ''}{c.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: c.correct === c.total ? '#15803d' : c.correct === 0 ? '#b91c1c' : undefined }}>
                        {c.correct}/{c.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {review && (
        <AttemptReviewer
          attempt={{ ...attempt, kind: 'gseb', review_title: title }}
          questions={questions}
          initialFilter={review === 'all' ? null : review}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  )
}
