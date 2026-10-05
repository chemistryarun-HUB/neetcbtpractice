import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { UNIT_LEVELS, QUESTIONS_PER_ATTEMPT, MARKS_CORRECT, thresholdPctFor, nextLevelIdFor, levelBadge, isChapterTestLevel } from '../../lib/constants'
import { correctOptionKey } from '../../lib/questionOptions'
import { orderOptionsForAttempt } from '../../lib/optionShuffle'
import InfoTooltip from '../../components/shared/InfoTooltip'
import QuestionView from '../../components/shared/QuestionView'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

// Question ORDER still shuffles unconditionally — only option order needs the
// position-dependence rules in lib/optionShuffle.js.
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
  const contentRef = useRef(null)
  const paletteRef = useRef(null)

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
      // Fallback priority when fresh questions run out: wrong answers first, then
      // skipped, then — only as a last resort, once both of those are exhausted —
      // previously-correct questions. Without the "correct" tier, a student who
      // clears most of a small pool ends up with a test that shrinks to just the
      // one or two questions still marked wrong, repeating every single attempt.
      const wrongIds = (used || []).filter(u => u.status === 'wrong').map(u => u.question_id)
      const skippedIds = (used || []).filter(u => u.status === 'skipped').map(u => u.question_id)
      const correctIds = (used || []).filter(u => u.status === 'correct').map(u => u.question_id)

      // Last level of this unit = Complete Chapter Test: draw from ALL levels of this unit.
      // Only when there's more than one level — same guard as isChapterTestLevel()
      // in constants.js — else a single-level unit's (units 24-36) only level
      // would equal "the last level" and be mistaken for a CCT here.
      const unitLevelDefs = UNIT_LEVELS[unitNum] || []
      const lastLevelId = unitLevelDefs.length > 1 ? unitLevelDefs[unitLevelDefs.length - 1].id : null
      const isChapterTest = levelNum === lastLevelId

      // Build unit filter: unit column stored as "Unit 1 - Some Basic Concepts in Chemistry"
      const unitPrefix = `Unit ${unitNum} -`

      // Get fresh (unused) questions — always filtered to this unit.
      // is_published gates questions the admin has uploaded but not reviewed
      // yet; is_active gates ones taken out of service. Both must hold, and
      // both have to be repeated on the fallback fetch below.
      let allQQuery = supabase.from('questions').select('*')
        .ilike('unit', `${unitPrefix}%`)
        .eq('is_active', true)
        .eq('is_published', true)
      if (!isChapterTest) allQQuery = allQQuery.eq('level', levelNum)
      const { data: allQ } = await allQQuery

      const fresh = (allQ || []).filter(q => !usedIds.has(q.id))
      let pool = shuffle(fresh)

      async function fetchByIds(ids) {
        if (ids.length === 0) return []
        let fbQuery = supabase.from('questions').select('*')
          .in('id', ids)
          .ilike('unit', `${unitPrefix}%`)
          .eq('is_active', true)
          .eq('is_published', true)
        if (!isChapterTest) fbQuery = fbQuery.eq('level', levelNum)
        const { data } = await fbQuery
        return shuffle(data || [])
      }

      // Tier 2: wrong, then skipped
      if (pool.length < QUESTIONS_PER_ATTEMPT) pool = [...pool, ...await fetchByIds(wrongIds)]
      if (pool.length < QUESTIONS_PER_ATTEMPT) pool = [...pool, ...await fetchByIds(skippedIds)]
      // Tier 3: last resort, re-serve already-correct questions
      if (pool.length < QUESTIONS_PER_ATTEMPT) pool = [...pool, ...await fetchByIds(correctIds)]

      // Defensive strip — ensure no questions from other units slip through
      pool = pool.filter(q => (q.unit || '').startsWith(unitPrefix))

      if (pool.length === 0) {
        toast.error('No questions available for this level yet.')
        navigate('/student/dashboard')
        return
      }

      const selected = pool.slice(0, QUESTIONS_PER_ATTEMPT)

      // Order options per question. Tracked by key ('option1'..'option4'), not
      // text — image-only options have no text to key off, and identical/blank
      // text must not be treated as the same answer.
      //
      // orderOptionsForAttempt() decides whether to shuffle at all: a question
      // saying "All of the above" keeps that option last, and one saying "Both
      // (b) and (c)" is left in its authored order, because shuffling either
      // makes the option text point at the wrong things.
      const prepared = selected.map(q => ({ ...q, shuffledOptions: orderOptionsForAttempt(q) }))

      setQuestions(prepared)

      // next_attempt_number() is a Postgres function (migration_attempt_numbering.sql)
      // that atomically increments a per-(student, unit, level) counter row —
      // replaces a count-existing-rows-then-insert that raced whenever two
      // test-starts landed close together (two tabs, a double-click, or a
      // student on a stale cached bundle racing one on a fresh deploy), which
      // is how attempt_number ended up with real duplicates and gaps in
      // production. See that migration's header for the full story and
      // lib/performanceMetrics.js's attemptsInOrder() for how the UI stayed
      // correct regardless (it derives an attempt's displayed position from
      // submission order, not from this column) while this was still broken.
      const { data: nextNumber, error: numErr } = await supabase.rpc('next_attempt_number', {
        p_student_id: user.id, p_unit_id: unitNum, p_level: levelNum,
      })
      if (numErr) throw numErr

      // Create attempt record
      const { data: attempt, error } = await supabase.from('test_attempts').insert({
        student_id: user.id,
        unit_id: unitNum,
        level: levelNum,
        attempt_number: nextNumber,
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

  function selectOption(optionKey) {
    const qId = questions[currentIdx].id
    setAnswers(prev => ({ ...prev, [qId]: optionKey }))
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
        } else if (selected === correctOptionKey(q)) {
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
        // The option order this student actually saw. Without it the review
        // screen re-rendered the authored order, so a student's remembered
        // "I picked C" pointed at a different option than the one they chose.
        option_order: Object.fromEntries(questions.map(q => [q.id, q.shuffledOptions.map(o => o.key)])),
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

      const requiredPct = thresholdPctFor(attemptCount)
      const { data: prog } = await supabase.from('student_progress').select('*').eq('student_id', user.id).single()
      const totalQuestionsAttempted = (prog?.total_questions_attempted || 0) + correct + wrong + skipped

      // Derived from this unit's own level list — a hardcoded `levelNum < 9` used
      // to refuse every unlock past level 9, stranding students on longer units.
      const nextLevel = nextLevelIdFor(unitNum, levelNum)
      if (requiredPct != null && pct >= requiredPct && nextLevel != null) {
        const byUnit = prog?.unlocked_levels_by_unit || {}
        const current = byUnit[unitNum] || [1]
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

  // Fresh question, fresh scroll; keep the current chip in view in the palette.
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
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'Backspace') { setAnswers(a => { const n = { ...a }; delete n[q.id]; return n }) }
      else if (/^[1-4]$/.test(e.key)) {
        const opt = q.shuffledOptions[Number(e.key) - 1]
        if (opt) setAnswers(a => ({ ...a, [q.id]: opt.key }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const current = questions[currentIdx]
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')
  const levelInfo = (UNIT_LEVELS[unitNum] || []).find(l => l.id === levelNum)
  const isLastQ = currentIdx === questions.length - 1
  const answeredCount = Object.keys(answers).length

  const unanswered = questions.length - answeredCount

  function confirmSubmit() {
    if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered (they score 0). Submit anyway?`)) return
    handleSubmit()
  }

  // Same shell as the post-test review (AttemptReviewer): slim blue bar,
  // one question card, palette + prev/next footer. Keeps the test and its
  // review looking like one product.
  return (
    <div className="attempt-reviewer test-run" role="main">
      <div className="ar-header">
        <div className="ar-title">
          <span>{isChapterTestLevel(unitNum, levelNum) ? 'CCT' : `${levelBadge(unitNum, levelNum)}: ${levelInfo?.name}`}</span>
          <InfoTooltip text={levelInfo?.topic || levelInfo?.name} align="left" />
        </div>
        <div className="ar-stats tp-progress">
          <span><small>Answered</small> {answeredCount}<em>/{questions.length}</em></span>
        </div>
        <div className="stopwatch tp-timer">⏱ {mins}:{secs}</div>
      </div>

      <div ref={contentRef} className="ar-content">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="ar-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--gray-500)' }}>Q{currentIdx + 1}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>of {questions.length}</span>
              <span className="badge" style={{
                marginLeft: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.75rem',
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
              options={current.shuffledOptions}
              selectedKey={answers[current.id]}
              onSelect={selectOption}
            />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>
            +4 for correct · −1 for wrong · 0 for skipped
          </div>
        </div>
      </div>

      <div className="ar-footer">
        <button className="btn btn-ghost btn-sm" onClick={goPrev} disabled={currentIdx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Previous question">
          <ChevronLeft size={16} /> <span className="ar-nav-label">Previous</span>
        </button>

        <div ref={paletteRef} className="ar-palette">
          {questions.map((qq, i) => {
            const isCur = i === currentIdx
            const done = !!answers[qq.id]
            return (
              <button key={qq.id} data-current={isCur} onClick={() => setCurrentIdx(i)}
                title={`Q${i + 1} · ${done ? 'answered' : 'not answered'}`}
                className="ar-chip"
                style={{
                  background: isCur ? 'var(--primary)' : done ? 'var(--primary-light)' : '#fff',
                  color: isCur ? '#fff' : done ? 'var(--primary-dark)' : 'var(--gray-600)',
                  borderColor: isCur || done ? 'var(--primary)' : 'var(--gray-300)',
                  boxShadow: isCur ? '0 0 0 2px #fff, 0 0 0 4px var(--primary)' : 'none',
                }}>
                {i + 1}
              </button>
            )
          })}
        </div>

        {answers[current.id] && (
          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => {
            const a = { ...answers }
            delete a[current.id]
            setAnswers(a)
          }}>
            Clear
          </button>
        )}
        <div className="ar-count">{currentIdx + 1} of {questions.length}</div>

        {!isLastQ ? (
          <button className="btn btn-primary btn-sm" onClick={goNext}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} aria-label="Next question">
            <span className="ar-nav-label">Next</span> <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn btn-success btn-sm" onClick={confirmSubmit} disabled={submitting} style={{ flexShrink: 0 }}>
            {submitting ? 'Submitting...' : '✓ Submit'}
          </button>
        )}
      </div>

      <div className="ar-hints">
        <span><kbd>←</kbd> <kbd>→</kbd> prev / next</span>
        <span><kbd>1</kbd>–<kbd>4</kbd> choose option</span>
        <span><kbd>Backspace</kbd> clear</span>
      </div>
    </div>
  )
}
