import { useState, useEffect, useMemo } from 'react'
import { Menu } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import StudentSidebar from './performance/StudentSidebar'
import StudentProfile from './performance/StudentProfile'
import ClassLeaderboard from './performance/ClassLeaderboard'
import AttemptReviewModal from './performance/AttemptReviewModal'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/performance', label: 'Performance' },
  { to: '/faculty/profile', label: 'Profile' },
]

const ATTEMPT_COLUMNS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, time_taken, submitted, started_at, submitted_at, question_ids, answers'

export default function FacultyPerformance() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [attempts, setAttempts] = useState([])
  const [progressByStudent, setProgressByStudent] = useState({})
  const [loading, setLoading] = useState(true)

  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedClass, setSelectedClass] = useState('all')
  const [view, setView] = useState('profile')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [reviewAttempt, setReviewAttempt] = useState(null)

  useEffect(() => {
    async function load() {
      if (!user?.id) return
      setLoading(true)
      const { data: studentRows } = await supabase
        .from('students').select('*').eq('added_by', user.id).order('name')
      const rows = studentRows || []
      setStudents(rows)

      const ids = rows.map(s => s.id)
      if (ids.length === 0) { setLoading(false); return }

      // Paginated — a single Supabase request caps at 1000 rows.
      const allAttempts = []
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabase
          .from('test_attempts')
          .select(ATTEMPT_COLUMNS)
          .in('student_id', ids)
          .eq('submitted', true)
          .range(from, from + 999)
        allAttempts.push(...(page || []))
        if (!page || page.length < 1000) break
      }
      setAttempts(allAttempts)

      const { data: progressRows } = await supabase.from('student_progress').select('*').in('student_id', ids)
      setProgressByStudent(Object.fromEntries((progressRows || []).map(p => [p.student_id, p])))

      setSelectedStudentId(prev => prev || rows[0]?.id || null)
      setLoading(false)
    }
    load()
  }, [user?.id])

  const attemptsByStudent = useMemo(() => {
    const map = {}
    for (const a of attempts) {
      if (!map[a.student_id]) map[a.student_id] = []
      map[a.student_id].push(a)
    }
    return map
  }, [attempts])

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null

  function handleSelectStudent(id) {
    setSelectedStudentId(id)
    setView('profile')
  }

  function handleSelectClassFromSidebar(cls) {
    setSelectedClass(cls)
    setView('leaderboard')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="perf-shell">
        <StudentSidebar
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={handleSelectStudent}
          view={view}
          selectedClass={selectedClass}
          onSelectClass={handleSelectClassFromSidebar}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        <div className="perf-main">
          <div className="page-content" style={{ maxWidth: 1180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle class list" style={{ padding: '0.5rem' }}>
                <Menu size={18} />
              </button>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', margin: 0 }}>
                <strong style={{ color: 'var(--gray-600)' }}>Faculty</strong> / Students
                {view === 'profile' && selectedStudent && <> / <strong style={{ color: 'var(--gray-600)' }}>{selectedStudent.name}</strong></>}
                {view === 'leaderboard' && <> / <strong style={{ color: 'var(--gray-600)' }}>Leaderboard</strong></>}
              </p>
            </div>

            {students.length === 0 ? (
              <div className="empty-state">No students yet. Add students from the Students tab.</div>
            ) : view === 'leaderboard' ? (
              <ClassLeaderboard
                students={students}
                attemptsByStudent={attemptsByStudent}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                selectedStudentId={selectedStudentId}
                onSelectStudent={handleSelectStudent}
                onBack={() => setView('profile')}
              />
            ) : selectedStudent ? (
              <StudentProfile
                student={selectedStudent}
                progress={progressByStudent[selectedStudent.id]}
                attempts={attemptsByStudent[selectedStudent.id] || []}
                onOpenReview={setReviewAttempt}
              />
            ) : (
              <div className="empty-state">Select a student from the sidebar</div>
            )}
          </div>
        </div>
      </div>

      {reviewAttempt && (
        <AttemptReviewModal
          attempt={reviewAttempt}
          studentName={students.find(s => s.id === reviewAttempt.student_id)?.name || ''}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  )
}
