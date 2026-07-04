import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { UNIT_LEVELS, QUESTIONS_PER_ATTEMPT, MARKS_CORRECT } from '../../lib/constants'
import toast from 'react-hot-toast'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TestPage() {
  const { unitId, level } = useParams()
  const unitNum = Number(unitId)
  const levelNum = Number(level)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [questions, setQuestions] = useState([])  // shuffled question objects with shuffled options
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})       // questionId -> selected option text
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [attemptId, setAttemptId] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    loadQuestions()
    return () => clearInterval(timerRef.current)
  }, [])

  async function loadQuestions() {
    try {
      // Get already-used question IDs for this student at this level (within this unit)
      const { data: used } = await supabase
        .from('used_questions')
        .select('question_id, status')
        .eq('student_id', user.id)
        .eq('level', levelNum)
        .eq('unit_id', unitNum)

      const usedIds = new Set((used || []).map(u => u.question_id))
      const wrongOrSkipped = (used || []).filter(u => u.status === 'wrong' || u.status === 'skipped').map(u => u.question_id)

      // Last level of this unit = Complete Chapter Test: draw from ALL levels of this unit
      const unitLevelDefs = UNIT_LEVELS[unitNum] || []
      const lastLevelId = unitLevelDefs.length > 0 ? unitLevelDefs[unitLevelDefs.length - 1].id : null
      const isChapterTest = levelNum === lastLevelId

      // Build unit filter: unit column stored as "Unit 1 - Some Basic Concepts in Chemistry"
      const unitPrefix = `Unit ${unitNum} -`

      // Get fresh (unused) questions — always filtered to this unit
      let allQQuery = supabase.from('questions').select('*')
        .ilike('unit', `${unitPrefix}%`)
        .eq('is_active', true)
      if (!isChapterTest) allQQuery = allQQuery.eq('level', levelNum)
      const { data: allQ } = await allQQuery

      const fresh = (allQ || []).filter(q => !usedIds.has(q.id))
      let pool = shuffle(fresh)

      // If not enough fresh, pad with wrong/skipped from this unit
      if (pool.length < QUESTIONS_PER_ATTEMPT && wrongOrSkipped.length > 0) {
        let fbQuery = supabase.from('questions').select('*')
          .in('id', wrongOrSkipped)
          .ilike('unit', `${unitPrefix}%`)
          .eq('is_active', true)
        if (!isChapterTest) fbQuery = fbQuery.eq('level', levelNum)
        const { data: fallback } = await fbQuery
        pool = [...pool, ...shuffle(fallback || [])]
      }

      // Defensive strip — ensure no questions from other units slip through
      pool = pool.filter(q => (q.unit || '').startsWith(unitPrefix))

      if (pool.length === 0) {
        toast.error('No questions available for this level yet.')
        navigate('/student/dashboard')
        return
      }

      const selected = pool.slice(0, QUESTIONS_PER_ATTEMPT)

      // Shuffle options for each question, keeping track of correct answer
      const prepared = selected.map(q => {
        const opts = shuffle([q.option1, q.option2, q.option3, q.option4])
        return { ...q, shuffledOptions: opts }
      })

      setQuestions(prepared)

      // Count existing attempts for this level
      const { count } = await supabase
        .from('test_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('level', levelNum)

      // Create attempt record
      const { data: attempt, error } = await supabase.from('test_attempts').insert({
        student_id: user.id,
        unit_id: unitNum,
        level: levelNum,
        attempt_number: (count || 0) + 1,
        question_ids: prepared.map(q => q.id),
        answers: {},
        submitted: false,
      }).select().single()

      if (error) throw error
      setAttemptId(attempt.id)

      // Start timer
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
      setLoading(false)
    } catch (err) {
      toast.error(err.message)
      navigate('/student/dashboard')
    }
  }

  function selectOption(option) {
    const qId = questions[currentIdx].id
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)
    try {
      let correct = 0, wrong = 0, skipped = 0
      const correctIds = []
      const wrongIds = []
      const skippedIds = []
      const usedRecords = []

      for (const q of questions) {
        const selected = answers[q.id]
        if (!selected) {
          skipped++
          skippedIds.push(q.id)
          usedRecords.push({ student_id: user.id, unit_id: unitNum, level: levelNum, question_id: q.id, status: 'skipped' })
        } else if (selected === q.correct_option) {
          correct++
          correctIds.push(q.id)
          usedRecords.push({ student_id: user.id, unit_id: unitNum, level: levelNum, question_id: q.id, status: 'correct' })
        } else {
          wrong++
          wrongIds.push(q.id)
          usedRecords.push({ student_id: user.id, unit_id: unitNum, level: levelNum, question_id: q.id, status: 'wrong' })
        }
      }

      const score = correct * 4 - wrong * 1

      // Store responses + pre-classified ID lists together so ResultPage can read
      // them directly without re-deriving from questions fetch
      const answersPayload = {
        responses: answers,      // { [questionId]: selectedText }
        correct_ids: correctIds,
        wrong_ids:   wrongIds,
        skipped_ids: skippedIds,
      }

      // Update attempt
      await supabase.from('test_attempts').update({
        answers: answersPayload,
        score,
        correct_count: correct,
        wrong_count: wrong,
        skipped_count: skipped,
        time_taken: elapsed,
        submitted: true,
        submitted_at: new Date().toISOString(),
      }).eq('id', attemptId)

      // Record used questions (upsert to handle re-attempts)
      await supabase.from('used_questions').upsert(usedRecords, { onConflict: 'student_id,question_id' })

      // Check unlock logic — based on score as a % of max possible marks (not raw accuracy)
      const totalQ = questions.length
      const maxScore = totalQ * MARKS_CORRECT
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0

      const { count: attemptCount } = await supabase
        .from('test_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('unit_id', unitNum)
        .eq('level', levelNum)
        .eq('submitted', true)

      const thresholds = [
        { attempt: 1, pct: 60 },
        { attempt: 2, pct: 50 },
        { attempt: 3, pct: 40 },
      ]

      const threshold = thresholds.find(t => t.attempt === attemptCount)
      const { data: prog } = await supabase.from('student_progress').select('*').eq('student_id', user.id).single()
      const totalQuestionsAttempted = (prog?.total_questions_attempted || 0) + correct + wrong + skipped

      if (threshold && pct >= threshold.pct && levelNum < 9) {
        const byUnit = prog?.unlocked_levels_by_unit || {}
        const current = byUnit[unitNum] || [1]
        const nextLevel = levelNum + 1
        if (!current.includes(nextLevel)) {
          await supabase.from('student_progress').update({
            unlocked_levels_by_unit: { ...byUnit, [unitNum]: [...current, nextLevel] },
            total_questions_attempted: totalQuestionsAttempted,
          }).eq('student_id', user.id)
        } else {
          await supabase.from('student_progress').update({ total_questions_attempted: totalQuestionsAttempted }).eq('student_id', user.id)
        }
      } else {
        await supabase.from('student_progress').update({ total_questions_attempted: totalQuestionsAttempted }).eq('student_id', user.id)
      }

      navigate(`/student/result/${attemptId}`)
    } catch (err) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }, [answers, questions, elapsed, attemptId, levelNum, user.id, submitting])

  // Auto-submit on last question if all answered
  function goNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      // On last question, show submit
    }
  }

  function goPrev() {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const current = questions[currentIdx]
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')
  const levelInfo = (UNIT_LEVELS[unitNum] || []).find(l => l.id === levelNum)
  const isLastQ = currentIdx === questions.length - 1
  const answeredCount = Object.keys(answers).length

  return (
    <div className="test-layout">
      <div className="test-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Level {levelNum}: {levelInfo?.name}
            <span title={levelInfo?.name || 'No topic mapped to this level'}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>
              i
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }} className="q-counter">
            Question {currentIdx + 1} of {questions.length} · {answeredCount} answered
          </div>
        </div>
        <div className="stopwatch">⏱ {mins}:{secs}</div>
      </div>

      <div className="test-body">
        {/* Question navigator */}
        <div className="q-navigator">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`q-nav-btn ${answers[questions[i].id] ? 'answered' : ''} ${i === currentIdx ? 'current' : ''}`}
              onClick={() => setCurrentIdx(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="question-card">
          <div className="question-text">
            <span style={{ color: 'var(--gray-400)', marginRight: '0.5rem', fontSize: '0.875rem' }}>Q{currentIdx + 1}.</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{current.question}</span>
          </div>

          <ul className="options-list">
            {current.shuffledOptions.map((opt, i) => (
              <li
                key={i}
                className={`option-item ${answers[current.id] === opt ? 'selected' : ''}`}
                onClick={() => selectOption(opt)}
              >
                <div className="option-circle">{String.fromCharCode(65 + i)}</div>
                <span style={{ whiteSpace: 'pre-wrap' }}>{opt}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={goPrev} disabled={currentIdx === 0}>
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {answers[current.id] && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const a = { ...answers }
                delete a[current.id]
                setAnswers(a)
              }}>
                Clear
              </button>
            )}
            {!isLastQ ? (
              <button className="btn btn-primary" onClick={goNext}>
                Next →
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : '✓ Submit Test'}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--gray-400)', textAlign: 'center' }}>
          +4 for correct · −1 for wrong · 0 for skipped
        </div>
      </div>
    </div>
  )
}
