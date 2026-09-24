import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AttemptReviewer from './AttemptReviewer'

// The attempt review on both Performance pages (admin's and the student's own
// My Performance). Loads the attempt's questions, then hands them to the same
// full-screen AttemptReviewer the student's post-test result screen uses, so
// admin and student are looking at the same thing.
export default function AttemptReviewModal({ attempt, studentName, onClose }) {
  const [questions, setQuestions] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setQuestions(null)
      const { data } = await supabase
        .from('questions')
        .select('id, qid, question, question_type, question_image, option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image, correct_option, difficulty_level, question_tag, col_a1, col_a2, col_a3, col_a4, col_a5, col_a6, col_a7, col_a8, col_a9, col_a10, col_b1, col_b2, col_b3, col_b4, col_b5, col_b6, col_b7, col_b8, col_b9, col_b10, col_a1_image, col_a2_image, col_a3_image, col_a4_image, col_a5_image, col_a6_image, col_a7_image, col_a8_image, col_a9_image, col_a10_image, col_b1_image, col_b2_image, col_b3_image, col_b4_image, col_b5_image, col_b6_image, col_b7_image, col_b8_image, col_b9_image, col_b10_image, mtc_label_a, mtc_label_b')
        .in('id', attempt.question_ids || [])
      if (cancelled) return
      const byId = Object.fromEntries((data || []).map(q => [q.id, q]))
      // Preserve the order the student actually saw the questions in.
      setQuestions((attempt.question_ids || []).map(id => byId[id]).filter(Boolean))
    }
    load()
    return () => { cancelled = true }
  }, [attempt.id])

  return (
    <AttemptReviewer
      attempt={attempt}
      questions={questions}
      studentName={studentName}
      // attempt_position is the submission-order position the caller already
      // computed for its table; attempt_number is the stored value, kept only
      // as a fallback for callers without the level's other attempts to hand.
      attemptNo={attempt.attempt_position ?? attempt.attempt_number}
      onClose={onClose}
    />
  )
}
