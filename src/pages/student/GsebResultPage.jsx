import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import QuestionView from '../../components/shared/QuestionView'
import { attemptGrading } from '../../lib/attemptGrading'
import { optionEntries } from '../../lib/questionOptions'
import { fmtDuration } from '../../lib/performanceMetrics'
import { paperTitle, chapterBreakdown } from '../../lib/gseb'

const STATUS_LABEL = { correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped' }
const STATUS_COLOR = { correct: '#15803d', wrong: '#b91c1c', skipped: '#b45309' }

export default function GsebResultPage() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [filter, setFilter] = useState(null) // null | 'correct' | 'wrong' | 'skipped'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: att } = await supabase.from('gseb_attempts').select('*')
        .eq('id', attemptId).eq('student_id', user.id).eq('submitted', true).single()
      if (!att) { navigate('/student/gseb', { replace: true }); return }
      const [{ data: p }, { data: qs }] = await Promise.all([
        supabase.from('gseb_papers').select('*').eq('id', att.paper_id).single(),
        supabase.from('gseb_questions').select('*').in('id', att.question_ids),
      ])
      const byId = Object.fromEntries((qs || []).map(q => [q.id, q]))
      setAttempt(att)
      setPaper(p)
      setQuestions((att.question_ids || []).map(id => byId[id]).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [attemptId, user.id, navigate])

  const grading = useMemo(() => attemptGrading(attempt), [attempt])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const total = questions.length
  const pct = total ? Math.round((attempt.score / total) * 100) : 0
  const ringColor = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626'
  const chapters = paper ? chapterBreakdown(paper.subject, questions, q => grading.statusOf(q)) : []
  const visible = filter ? questions.filter(q => grading.statusOf(q) === filter) : questions

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/student/dashboard')}>NEETCBT</div>
      </header>
      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link to="/student/gseb" className="back-btn"><ArrowLeft size={15} /> All GSEB papers</Link>

        <div className="rp-hero">
          <div className="rp-hero-label">{paper ? paperTitle(paper) : 'GSEB paper'}</div>
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
              onClick={() => navigate(`/student/gseb/test/${attempt.paper_id}`)}>
              <RotateCcw size={14} /> Attempt again
            </button>
          </div>
        </div>

        <div className="result-tiles" style={{ marginTop: 0 }}>
          {['correct', 'wrong', 'skipped'].map(s => (
            <div key={s} className={`result-tile ${s} ${filter === s ? 'active' : ''}`} onClick={() => setFilter(f => f === s ? null : s)}>
              <div className="tile-num">{attempt[`${s}_count`]}</div>
              <div className="tile-label">{STATUS_LABEL[s]}</div>
            </div>
          ))}
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Review {filter ? `(${STATUS_LABEL[filter].toLowerCase()} only)` : ''}</h3>
          {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>Show all</button>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visible.map(q => {
            const status = grading.statusOf(q)
            const keyChanged = grading.keyChangedOf(q)
            return (
              <div key={q.id} className="card card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <strong>Q{q.q_no}</strong>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: STATUS_COLOR[status] }}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <QuestionView q={q} mode="review" size="compact" options={optionEntries(q)} isChosen={opt => grading.isChosen(q, opt)} />
                {keyChanged && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#b45309' }}>
                    The answer key for this question changed after you submitted. You were marked {keyChanged.graded}; under the current key it is {keyChanged.now}.
                  </div>
                )}
                {(q.explanation || q.explanation_image) && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                    <strong>Explanation:</strong> {q.explanation}
                    {q.explanation_image && <img src={q.explanation_image} alt="Explanation" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
