import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, LogOut } from 'lucide-react'
import StudentProfile from '../../components/performance/StudentProfile'
import AttemptReviewModal from '../../components/performance/AttemptReviewModal'

const ATTEMPT_COLUMNS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, time_taken, submitted, started_at, submitted_at, question_ids, answers'

// Same StudentProfile + AttemptReviewModal admin uses on the Performance
// dashboard — a student sees exactly the same view of their own data.
export default function StudentPerformance() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewAttempt, setReviewAttempt] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const allAttempts = []
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabase
          .from('test_attempts')
          .select(ATTEMPT_COLUMNS)
          .eq('student_id', user.id)
          .eq('submitted', true)
          .range(from, from + 999)
        allAttempts.push(...(page || []))
        if (!page || page.length < 1000) break
      }
      setAttempts(allAttempts)

      const { data: prog } = await supabase.from('student_progress').select('*').eq('student_id', user.id).single()
      setProgress(prog)
      setLoading(false)
    }
    if (user?.id) load()
  }, [user?.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            {user.name} ({user.roll_number})
          </span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <div className="page-content">
        <Link to="/student/dashboard" className="back-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <ArrowLeft size={15} /> Back to Syllabus
        </Link>

        {attempts.length === 0 ? (
          <div className="empty-state">No attempts yet — practice a level to see your performance here.</div>
        ) : (
          <StudentProfile
            student={user}
            progress={progress}
            attempts={attempts}
            onOpenReview={setReviewAttempt}
            showContactActions={false}
          />
        )}
      </div>

      {reviewAttempt && (
        <AttemptReviewModal
          attempt={reviewAttempt}
          studentName={user.name}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  )
}
