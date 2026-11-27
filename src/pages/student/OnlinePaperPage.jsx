import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Clock, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { neetT } from '../../lib/neetI18n'
import { orderOptionsForAttempt, orderOptionsForReview } from '../../lib/optionShuffle'
import {
  drawQuestions, fetchQuestionsByIds, gradePaper, maxMarks, paperIsFor, paperQuestionCount,
  bySubject, shuffleWithinSubjects, subjectSections,
} from '../../lib/onlinePapers'
import QuestionView from '../../components/shared/QuestionView'
import TestLegend from '../../components/shared/TestLegend'
import RetestResult from '../../components/mistakes/RetestResult'

const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * One online practice paper for a student: the start screen, the timed test
 * (resumable on any device, answers saved as they go) and, once submitted,
 * the result with a full answer review.
 */
export default function OnlinePaperPage() {
  const { paperId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [medium, setMedium] = useState(user.medium || 'en')
  const t = neetT(medium)

  const [paper, setPaper] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])   // with .shuffledOptions, in this student's order
  const [answers, setAnswers] = useState({})
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(null)           // seconds remaining
  const [phase, setPhase] = useState('loading')    // loading | intro | test | result
  const [busy, setBusy] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const contentRef = useRef(null)
  const paletteRef = useRef(null)
  const submittingRef = useRef(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [{ data: p, error }, { data: me }, { data: att }] = await Promise.all([
        supabase.from('online_papers').select('*').eq('id', paperId).maybeSingle(),
        supabase.from('students').select('medium, class, neet_year').eq('id', user.id).maybeSingle(),
        supabase.from('online_paper_attempts').select('*').eq('paper_id', paperId).eq('student_id', user.id).maybeSingle(),
      ])
      if (error) throw error
      const student = { ...user, ...(me || {}) }
      setMedium(student.medium || 'en')
      if (!p || (!att && (!p.is_published || !paperIsFor(p, student)))) {
        toast.error('This paper is not available.')
        navigate('/student/practice-papers')
        return
      }
      setPaper(p)
      if (att) await openAttempt(att, p)
      else setPhase('intro')
    } catch (err) {
      toast.error(err.message)
      navigate('/student/practice-papers')
    }
  }

  async function openAttempt(att, p) {
    // Always show subject blocks in the paper's order. Attempts started before
    // subject-wise papers (fully mixed order) are regrouped here; inside a
    // subject the student's own shuffled order is kept.
    const qs = bySubject(await fetchQuestionsByIds(att.question_ids || []), p.sources)
    const order = att.answers?.option_order || {}
    setQuestions(qs.map(q => ({ ...q, shuffledOptions: orderOptionsForReview(q, order[q.id]) })))
    setAnswers(att.answers?.responses || {})
    setAttempt(att)
    if (att.submitted) { setPhase('result'); return }
    const remaining = (p.duration_min || 60) * 60 - Math.floor((Date.now() - new Date(att.started_at).getTime()) / 1000)
    setLeft(Math.max(0, remaining))
    setPhase('test')
  }

  async function start() {
    setBusy(true)
    try {
      const picked = paper.mode === 'same'
        ? await fetchQuestionsByIds(paper.question_ids || [])
        : (await drawQuestions(paper.sources || [], paper.medium)).questions
      if (!picked.length) throw new Error('This paper has no questions yet.')
      // Subject blocks stay in the order the paper was made; only the questions
      // inside each subject are shuffled, so numbering runs on across subjects.
      const ordered = shuffleWithinSubjects(picked, paper.sources).map(q => ({ ...q, shuffledOptions: orderOptionsForAttempt(q) }))
      const { data, error } = await supabase.from('online_paper_attempts').insert({
        paper_id: paper.id, student_id: user.id,
        question_ids: ordered.map(q => q.id),
        answers: { responses: {}, option_order: Object.fromEntries(ordered.map(q => [q.id, q.shuffledOptions.map(o => o.key)])) },
        started_at: new Date().toISOString(),
      }).select().single()
      if (error) {
        // Started on another device a moment ago: carry on with that attempt.
        const { data: existing } = await supabase.from('online_paper_attempts').select('*').eq('paper_id', paper.id).eq('student_id', user.id).maybeSingle()
        if (!existing) throw error
        await openAttempt(existing, paper)
        return
      }
      await openAttempt(data, paper)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Answers are saved as they change, so a closed tab or another device resumes them.
  useEffect(() => {
    if (phase !== 'test' || !attempt) return
    const id = setTimeout(() => {
      supabase.from('online_paper_attempts')
        .update({ answers: { ...attempt.answers, responses: answers } })
        .eq('id', attempt.id).eq('submitted', false).then(() => {})
    }, 800)
    return () => clearTimeout(id)
  }, [answers, phase])

  const submit = useCallback(async () => {
    if (submittingRef.current || !attempt) return
    submittingRef.current = true
    setBusy(true)
    setShowConfirm(false)
    try {
      const g = gradePaper(questions, answers)
      const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
      const patch = {
        answers: {
          responses: answers, option_order: attempt.answers?.option_order || {},
          correct_ids: g.correct_ids, wrong_ids: g.wrong_ids, skipped_ids: g.skipped_ids,
        },
        score: g.score, correct_count: g.correct_count, wrong_count: g.wrong_count, skipped_count: g.skipped_count,
        time_taken: Math.min(timeTaken, (paper.duration_min || 60) * 60),
        submitted: true, submitted_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('online_paper_attempts').update(patch).eq('id', attempt.id)
      if (error) throw error
      setAttempt(a => ({ ...a, ...patch }))
      setPhase('result')
    } catch (err) {
      toast.error(`${t.submitFailed} (${err?.message || 'network'})`)
      submittingRef.current = false
    } finally {
      setBusy(false)
    }
  }, [attempt, questions, answers, paper])

  // Countdown; at 0 the paper submits itself.
  useEffect(() => {
    if (phase !== 'test' || left == null) return
    if (left <= 0) { submit(); return }
    const id = setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, left, submit])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    paletteRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [idx])

  useEffect(() => {
    if (phase !== 'test') return
    function onKey(e) {
      if (busy || e.ctrlKey || e.metaKey || e.altKey) return
      const q = questions[idx]
      if (!q) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setIdx(i => Math.min(i + 1, questions.length - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
      else if (/^[1-4]$/.test(e.key)) {
        const opt = q.shuffledOptions[Number(e.key) - 1]
        if (opt) setAnswers(a => ({ ...a, [q.id]: opt.key }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'loading') return <div className="loading-screen"><div className="spinner" /></div>

  if (phase === 'intro') {
    const n = paperQuestionCount(paper)
    return (
      <div className="dashboard">
        <div className="page-content op-intro">
          <div className="card card-body">
            <div className="op-intro-icon"><FileText size={28} /></div>
            <h2>{paper.title}</h2>
            <div className="op-intro-facts">
              <span><strong>{n}</strong> questions</span>
              <span><strong>{maxMarks(n)}</strong> marks</span>
              <span><strong>{paper.duration_min}</strong> minutes</span>
            </div>
            <ul className="op-intro-rules">
              <li>{t.marking}</li>
              <li>The timer starts when you press Start and keeps running even if you close the page. The paper submits itself when time is up.</li>
              <li>You can take this paper once.</li>
            </ul>
            <div className="op-intro-actions">
              <button className="btn btn-ghost" onClick={() => navigate('/student/practice-papers')}>Back</button>
              <button className="btn btn-primary" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start paper'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const rows = questions.map(q => ({
      q, options: q.shuffledOptions, selected: answers[q.id] || null, bucket: null, hasType: false,
      outcome: attempt.answers?.correct_ids?.includes(q.id) ? 'correct' : attempt.answers?.wrong_ids?.includes(q.id) ? 'wrong' : 'skipped',
    }))
    const mins = Math.round((attempt.time_taken || 0) / 60)
    return (
      <RetestResult rows={rows} medium={medium} studentId={user.id} editable
        title={paper.title}
        subtitle={`Score ${attempt.score} / ${maxMarks(questions.length)} · ${mins} min · ${new Date(attempt.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
        backLabel="Back to Practice Papers" onClose={() => navigate('/student/practice-papers')} />
    )
  }

  const current = questions[idx]
  const sections = subjectSections(questions)
  const section = sections.find(sec => idx >= sec.start && idx <= sec.end) || sections[0]
  const answered = Object.keys(answers).length
  const unanswered = questions.length - answered
  const isLast = idx === questions.length - 1
  return (
    <div className="attempt-reviewer test-run" role="main" lang={medium}>
      <div className="ar-header">
        <div className="ar-title"><span>{paper.title}</span></div>
        <div className="ar-stats tp-progress"><span><small>{t.answered}</small> {answered}<em>/{questions.length}</em></span></div>
        <div className={`stopwatch tp-timer${left <= 300 ? ' op-low' : ''}`}><Clock size={14} /> {clock(Math.max(0, left || 0))}</div>
      </div>

      {sections.length > 1 && (
        <div className="op-subject-tabs" role="tablist" aria-label="Subjects">
          {sections.map(sec => {
            const qs = questions.slice(sec.start, sec.end + 1)
            const done = qs.filter(q => answers[q.id]).length
            const active = sec === section
            return (
              <button key={sec.subject} role="tab" aria-selected={active} className={`op-subject-tab${active ? ' active' : ''}`}
                onClick={() => setIdx(sec.start)}>
                <span>{sec.subject}</span>
                <small>Q {sec.start + 1}–{sec.end + 1} · {done}/{qs.length}</small>
              </button>
            )
          })}
        </div>
      )}

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
            <QuestionView q={current} mode="attempt" size="full" options={current.shuffledOptions}
              selectedKey={answers[current.id]} onSelect={key => setAnswers(a => ({ ...a, [current.id]: key }))} />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>{t.marking}</div>
        </div>
      </div>

      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Previous question">
          <ChevronLeft size={16} /> <span className="ar-nav-label">{t.previous}</span>
        </button>
        <div ref={paletteRef} className="ar-palette">
          {questions.map((qq, i) => {
            if (section && (i < section.start || i > section.end)) return null
            const cur = i === idx, done = !!answers[qq.id]
            return (
              <button key={qq.id} data-current={cur} onClick={() => setIdx(i)} className="ar-chip"
                style={{
                  background: cur ? 'var(--primary)' : done ? 'var(--primary-light)' : '#fff',
                  color: cur ? '#fff' : done ? 'var(--primary-dark)' : 'var(--gray-600)',
                  borderColor: cur || done ? 'var(--primary)' : 'var(--gray-300)',
                  boxShadow: cur ? '0 0 0 2px #fff, 0 0 0 4px var(--primary)' : 'none',
                }}>{i + 1}</button>
            )
          })}
        </div>
        {answers[current.id] && (
          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
            onClick={() => setAnswers(a => { const n = { ...a }; delete n[current.id]; return n })}>{t.clear}</button>
        )}
        <div className="ar-count">{idx + 1} {t.of(questions.length)}</div>
        {!isLast ? (
          <button className="btn btn-primary btn-sm" onClick={() => setIdx(i => i + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Next question">
            <span className="ar-nav-label">{t.next}</span> <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn btn-success btn-sm" disabled={busy} style={{ flexShrink: 0 }}
            onClick={() => (unanswered > 0 ? setShowConfirm(true) : submit())}>{busy ? t.submitting : t.submit}</button>
        )}
      </div>

      <TestLegend t={t} submitOnLast />

      {showConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowConfirm(false)}>
          <div className="modal" style={{ maxWidth: 420, padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <p style={{ margin: '0 0 1rem', fontSize: '1rem', lineHeight: 1.5 }}>{t.confirmSubmit(unanswered)}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>{t.goBack}</button>
              <button className="btn btn-success" onClick={submit} disabled={busy}>{t.submitAnyway}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
