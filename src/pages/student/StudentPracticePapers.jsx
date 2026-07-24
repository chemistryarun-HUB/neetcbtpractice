import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AnswerGrid from '../../components/shared/AnswerGrid'
import { SUBJECTS, SUBJECT_LABELS, subjectRanges, totalQuestions, scorePaper } from '../../lib/practicePapers'

export default function StudentPracticePapers() {
  const { user, logout } = useAuth()
  const [papers, setPapers] = useState([])
  const [attempts, setAttempts] = useState({}) // paperId -> attempt row
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // paper object
  const [mode, setMode] = useState('answering') // 'answering' | 'result'
  const [responses, setResponses] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: paperRows, error } = await supabase.from('practice_papers').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (error) { toast.error(error.message); setLoading(false); return }
    setPapers(paperRows || [])

    const { data: attemptRows } = await supabase
      .from('practice_paper_attempts').select('*').eq('student_id', user.id)
    const byPaper = Object.fromEntries((attemptRows || []).map(a => [a.paper_id, a]))
    setAttempts(byPaper)
    setLoading(false)
  }

  function openPaper(paper) {
    setSelected(paper)
    const existing = attempts[paper.id]
    if (existing) {
      setResponses(existing.responses || {})
      setMode('result')
    } else {
      setResponses({})
      setMode('answering')
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const result = scorePaper(selected, responses)
      const record = {
        paper_id: selected.id,
        student_id: user.id,
        responses,
        correct_count: result.correct,
        wrong_count: result.wrong,
        skipped_count: result.skipped,
        score: result.score,
        subject_breakdown: result.subject_breakdown,
      }
      const { error } = await supabase.from('practice_paper_attempts').upsert([record], { onConflict: 'paper_id,student_id' })
      if (error) throw error
      setAttempts(prev => ({ ...prev, [selected.id]: record }))
      setMode('result')
      toast.success('Scored!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    await logout()
  }

  if (selected) {
    const attempt = attempts[selected.id]
    const total = totalQuestions(selected)
    return (
      <div className="dashboard">
        <header className="topbar">
          <div className="topbar-brand">NEETCBT</div>
          <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>{user.name} ({user.roll_number})</span>
            <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <div className="page-content">
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setSelected(null)}>
            <ArrowLeft size={14} /> Back to Practice Papers
          </button>
          <div className="page-header">
            <h2>{selected.name}</h2>
          </div>

          {mode === 'result' && attempt ? (
            <>
              <div className="result-tiles">
                <div className="result-tile correct"><div className="tile-num">{attempt.correct_count}</div><div className="tile-label">Correct</div></div>
                <div className="result-tile wrong"><div className="tile-num">{attempt.wrong_count}</div><div className="tile-label">Wrong</div></div>
                <div className="result-tile skipped"><div className="tile-num">{attempt.skipped_count}</div><div className="tile-label">Skipped</div></div>
              </div>
              <div className="card card-body" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Score</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{attempt.score}</div></div>
                {SUBJECTS.map(s => {
                  const b = attempt.subject_breakdown?.[s]
                  if (!b) return null
                  return (
                    <div key={s}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{SUBJECT_LABELS[s]}</div>
                      <div style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{b.score} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--gray-500)' }}>({b.correct}/{b.correct + b.wrong + b.skipped})</span></div>
                    </div>
                  )
                })}
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginBottom: '1rem' }} onClick={() => setMode('answering')}>Redo my answers</button>
              <AnswerGrid subjects={subjectRanges(selected)} values={responses} correctKey={selected.answer_key || {}} />
            </>
          ) : (
            <>
              {SUBJECTS.some(s => selected[`syllabus_${s}`]) && (
                <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
                  {SUBJECTS.map(s => selected[`syllabus_${s}`] ? (
                    <div key={s} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)' }}>{SUBJECT_LABELS[s]}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{selected[`syllabus_${s}`]}</div>
                    </div>
                  ) : null)}
                </div>
              )}
              <AnswerGrid subjects={subjectRanges(selected)} values={responses} onChange={(q, letter) => setResponses(prev => { const next = { ...prev }; if (letter) next[q] = letter; else delete next[q]; return next })} />
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Scoring…' : `Submit & Score (${Object.keys(responses).length}/${total} answered)`}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>{user.name} ({user.roll_number})</span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <div className="page-content">
        <div className="page-header">
          <h2>Practice Papers</h2>
          <Link to="/student/dashboard" className="btn btn-ghost btn-sm">Back to Syllabus</Link>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : papers.length === 0 ? (
          <div className="empty-state">No practice papers available yet — check back soon.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {papers.map(paper => {
              const attempt = attempts[paper.id]
              const total = totalQuestions(paper)
              return (
                <div key={paper.id} className="card perf-clickable-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }}
                  onClick={() => openPaper(paper)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{paper.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{total} questions</div>
                  </div>
                  {attempt ? (
                    <span className="badge badge-easy">Scored: {attempt.score} — tap to review</span>
                  ) : (
                    <span className="badge badge-medium">Not attempted — tap to start</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
