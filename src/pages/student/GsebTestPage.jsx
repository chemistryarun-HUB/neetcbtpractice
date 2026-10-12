import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import QuestionView from '../../components/shared/QuestionView'
import { optionEntries } from '../../lib/questionOptions'
import { paperTitle, paperTag, gradeGsebAttempt } from '../../lib/gseb'

// Full Part A of one GSEB board paper, sat like the real exam: every question
// in board order, options in printed order (no shuffling, so a student can
// check against the paper and GSEB's key), a countdown that auto-submits at
// zero, and no negative marking. Same shell as the NEET TestPage.
// At /student/gseb/practice/:attemptId it runs a chapter-wise or custom test
// instead: the attempt was created beforehand with its questions and time,
// and each question shows which paper it came from.
export default function GsebTestPage() {
  const { paperId, attemptId: practiceId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [meta, setMeta] = useState(null) // { title, durationMin, practice }
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})   // questionId -> 'option1'..'option4'
  const [marked, setMarked] = useState({})     // questionId -> true (mark for review)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [remaining, setRemaining] = useState(null) // seconds
  const [attemptId, setAttemptId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const timerRef = useRef(null)
  const contentRef = useRef(null)
  const paletteRef = useRef(null)
  // The countdown's auto-submit fires from inside an interval, so it reads
  // the latest answers through refs rather than a stale closure.
  const answersRef = useRef(answers)
  const submittedRef = useRef(false)
  answersRef.current = answers

  useEffect(() => {
    async function resume() {
      const { data: att } = await supabase.from('gseb_attempts').select('*')
        .eq('id', practiceId).eq('student_id', user.id).single()
      if (!att) throw new Error('This test was not found')
      if (att.submitted) { navigate(`/student/gseb/result/${att.id}`, { replace: true }); return }
      const { data: qs, error } = await supabase.from('gseb_questions')
        .select('*, paper:gseb_papers(year, session)').in('id', att.question_ids)
      if (error) throw error
      const byId = Object.fromEntries(qs.map(q => [q.id, q]))
      const ordered = att.question_ids.map(id => byId[id]).filter(Boolean)
      if (!ordered.length) throw new Error('This test has no questions')
      setMeta({ title: att.title, durationMin: att.duration_min, practice: true })
      setQuestions(ordered)
      setAttemptId(att.id)
      setRemaining(att.duration_min * 60)
      setLoading(false)
    }

    async function start() {
      try {
        if (practiceId) return await resume()
        const [{ data: p, error: pErr }, { data: qs, error: qErr }] = await Promise.all([
          supabase.from('gseb_papers').select('*').eq('id', paperId).eq('is_published', true).single(),
          supabase.from('gseb_questions').select('*').eq('paper_id', paperId).order('q_no'),
        ])
        if (pErr || !p) throw new Error('This paper is not available')
        if (qErr) throw qErr
        if (!qs?.length) throw new Error('This paper has no questions yet')

        const { data: attempt, error } = await supabase.from('gseb_attempts').insert({
          student_id: user.id,
          paper_id: p.id,
          mode: 'full',
          question_ids: qs.map(q => q.id),
          answers: {},
          submitted: false,
        }).select().single()
        if (error) throw error

        setMeta({ title: paperTitle(p), durationMin: p.duration_min, practice: false })
        setQuestions(qs)
        setAttemptId(attempt.id)
        setRemaining(p.duration_min * 60)
        setLoading(false)
      } catch (err) {
        toast.error(err.message)
        navigate('/student/gseb', { replace: true })
      }
    }
    start()
    return () => clearInterval(timerRef.current)
  }, [paperId, practiceId, user.id, navigate])

  async function submit() {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    clearInterval(timerRef.current)
    try {
      const graded = gradeGsebAttempt(questions, answersRef.current)
      const timeTaken = meta.durationMin * 60 - Math.max(remainingRef.current ?? 0, 0)
      const { error } = await supabase.from('gseb_attempts').update({
        ...graded,
        time_taken: timeTaken,
        submitted: true,
        submitted_at: new Date().toISOString(),
      }).eq('id', attemptId)
      if (error) throw error
      navigate(`/student/gseb/result/${attemptId}`, { replace: true })
    } catch (err) {
      toast.error(err.message)
      submittedRef.current = false
      setSubmitting(false)
    }
  }

  // Countdown. Started once the paper is loaded; at zero it submits whatever
  // has been answered, like the invigilator collecting the OMR sheet.
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    if (loading) return
    timerRef.current = setInterval(() => setRemaining(s => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(timerRef.current)
  }, [loading])

  useEffect(() => {
    if (loading || remaining !== 0 || submittedRef.current) return
    toast('Time is up. Submitting your answers.')
    submitRef.current()
  }, [loading, remaining])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentIdx])

  useEffect(() => {
    function onKey(e) {
      if (loading || submitting || e.ctrlKey || e.metaKey || e.altKey) return
      const q = questions[currentIdx]
      if (!q) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentIdx(i => Math.min(i + 1, questions.length - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentIdx(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Backspace') { setAnswers(a => { const n = { ...a }; delete n[q.id]; return n }) }
      else if (/^[1-4]$/.test(e.key)) setAnswers(a => ({ ...a, [q.id]: `option${e.key}` }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const current = questions[currentIdx]
  const mins = Math.floor(remaining / 60).toString().padStart(2, '0')
  const secs = (remaining % 60).toString().padStart(2, '0')
  const answeredCount = Object.keys(answers).length
  const unanswered = questions.length - answeredCount
  const markedCount = Object.keys(marked).length
  const isLastQ = currentIdx === questions.length - 1

  function confirmSubmit() {
    const parts = []
    if (unanswered > 0) parts.push(`${unanswered} unanswered`)
    if (markedCount > 0) parts.push(`${markedCount} marked for review`)
    if (parts.length && !window.confirm(`${parts.join(' and ')}. Submit anyway?`)) return
    submit()
  }

  function toggleMark() {
    setMarked(m => {
      const n = { ...m }
      if (n[current.id]) delete n[current.id]; else n[current.id] = true
      return n
    })
  }

  return (
    <div className="attempt-reviewer test-run" role="main">
      <div className="ar-header">
        <div className="ar-title"><span>{meta.title}</span></div>
        <div className="ar-stats tp-progress">
          <span><small>Answered</small> {answeredCount}<em>/{questions.length}</em></span>
        </div>
        <div className="stopwatch tp-timer" style={remaining <= 300 ? { color: '#fecaca' } : undefined}>⏱ {mins}:{secs}</div>
      </div>

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--gray-500)' }}>Q{meta.practice ? currentIdx + 1 : current.q_no}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>of {questions.length}</span>
              {meta.practice && current.paper && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', background: 'var(--gray-100)', borderRadius: 999, padding: '0.1rem 0.5rem' }}>
                  GSEB {paperTag(current.paper)} · Q{current.q_no}
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={toggleMark}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: marked[current.id] ? '#b45309' : undefined }}>
                <Flag size={14} /> {marked[current.id] ? 'Marked' : 'Mark for review'}
              </button>
              <span className="badge" style={{
                fontSize: '0.8rem', padding: '0.25rem 0.75rem',
                background: answers[current.id] ? 'var(--primary-light)' : 'var(--gray-100)',
                color: answers[current.id] ? 'var(--primary-dark)' : 'var(--gray-500)',
              }}>
                {answers[current.id] ? '✓ Answered' : 'Not answered'}
              </span>
            </div>

            <QuestionView
              q={current}
              mode="attempt"
              size="full"
              options={optionEntries(current)}
              selectedKey={answers[current.id]}
              onSelect={key => setAnswers(prev => ({ ...prev, [current.id]: key }))}
            />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>
            +1 for correct · no negative marking
          </div>
        </div>
      </div>

      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentIdx(i => i - 1)} disabled={currentIdx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Previous question">
          <ChevronLeft size={16} /> <span className="ar-nav-label">Previous</span>
        </button>

        <div ref={paletteRef} className="ar-palette">
          {questions.map((qq, i) => {
            const isCur = i === currentIdx
            const done = !!answers[qq.id]
            const flagged = !!marked[qq.id]
            return (
              <button key={qq.id} data-current={isCur} onClick={() => setCurrentIdx(i)}
                title={`Q${meta.practice ? i + 1 : qq.q_no} · ${done ? 'answered' : 'not answered'}${flagged ? ' · marked' : ''}`}
                className="ar-chip"
                style={{
                  background: isCur ? 'var(--primary)' : flagged ? '#fffbeb' : done ? 'var(--primary-light)' : '#fff',
                  color: isCur ? '#fff' : flagged ? '#b45309' : done ? 'var(--primary-dark)' : 'var(--gray-600)',
                  borderColor: isCur || done ? 'var(--primary)' : flagged ? '#fcd34d' : 'var(--gray-300)',
                  boxShadow: isCur ? '0 0 0 2px #fff, 0 0 0 4px var(--primary)' : 'none',
                }}>
                {meta.practice ? i + 1 : qq.q_no}
              </button>
            )
          })}
        </div>

        {answers[current.id] && (
          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
            onClick={() => setAnswers(a => { const n = { ...a }; delete n[current.id]; return n })}>
            Clear
          </button>
        )}
        <div className="ar-count">{currentIdx + 1} of {questions.length}</div>

        {!isLastQ && (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrentIdx(i => i + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Next question">
            <span className="ar-nav-label">Next</span> <ChevronRight size={16} />
          </button>
        )}
        {/* Submit is always reachable, not only on the last question: in a
            timed board paper students jump around and finish early. */}
        <button className="btn btn-success btn-sm" onClick={confirmSubmit} disabled={submitting} style={{ flexShrink: 0 }}>
          {submitting ? 'Submitting...' : '✓ Submit'}
        </button>
      </div>

      <div className="ar-hints">
        <span><kbd>←</kbd> <kbd>→</kbd> prev / next</span>
        <span><kbd>1</kbd>–<kbd>4</kbd> choose option</span>
        <span><kbd>Backspace</kbd> clear</span>
      </div>
    </div>
  )
}
