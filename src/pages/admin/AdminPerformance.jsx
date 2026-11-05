import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Menu, NotebookPen } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import StudentSidebar from '../../components/performance/StudentSidebar'
import StudentProfile from '../../components/performance/StudentProfile'
import ClassLeaderboard from '../../components/performance/ClassLeaderboard'
import ClassReport from '../../components/performance/ClassReport'
import AttemptReviewModal from '../../components/performance/AttemptReviewModal'
import { ContactsHiddenContext } from '../../components/performance/contactsContext'
import SubjectTabs from '../../components/shared/SubjectTabs'
import { fromCourseUnitId } from '../../lib/constants'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
  { to: '/admin/gseb', label: 'GSEB Papers' },
]

const ATTEMPT_COLUMNS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, time_taken, submitted, started_at, submitted_at, question_ids, answers'

// Also the faculty Performance page: `nav`/`crumb` swap the chrome, and
// `hideContacts` strips every phone number before it reaches the components.
export default function AdminPerformance({ nav = NAV, crumb = 'Admin', hideContacts = false, mistakesPath = '/admin/mistakes' }) {
  const [students, setStudents] = useState([])
  const [attempts, setAttempts] = useState([])
  const [progressByStudent, setProgressByStudent] = useState({})
  const [loading, setLoading] = useState(true)

  // ?student=<id> opens that student straight away (linked from Students).
  const [params] = useSearchParams()
  const [selectedStudentId, setSelectedStudentId] = useState(params.get('student'))
  const [selectedClass, setSelectedClass] = useState('all')
  const [view, setView] = useState('profile')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [reviewAttempt, setReviewAttempt] = useState(null)
  const [classSubject, setClassSubject] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Admin manages every student directly (faculty accounts aren't in
      // active use yet), so this page isn't scoped by added_by — it shows
      // everyone.
      const { data: studentRows } = await supabase
        .from('students').select('*').order('name')
      const rows = (studentRows || []).map(s => {
        if (!hideContacts) return s
        const { phone_student: _a, phone_mother: _b, phone_father: _c, password_hash: _d, ...safe } = s
        return safe
      })
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

      const progress = []
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabase
          .from('student_progress').select('*').in('student_id', ids).range(from, from + 999)
        progress.push(...(page || []))
        if (!page || page.length < 1000) break
      }
      setProgressByStudent(Object.fromEntries(progress.map(p => [p.student_id, p])))

      setSelectedStudentId(prev => prev || rows[0]?.id || null)
      setLoading(false)
    }
    load()
  }, [])

  const attemptsByStudent = useMemo(() => {
    const map = {}
    for (const a of attempts) {
      if (!map[a.student_id]) map[a.student_id] = []
      map[a.student_id].push(a)
    }
    return map
  }, [attempts])

  // Class Report and Leaderboard read only this, so every number on them follows
  // the tab. A student's own profile has its own tabs.
  const classAttemptsByStudent = useMemo(() => {
    if (classSubject === 'all') return attemptsByStudent
    return Object.fromEntries(Object.entries(attemptsByStudent).map(([id, rows]) => [id, rows.filter(a => fromCourseUnitId(a.unit_id).subject === classSubject)]))
  }, [attemptsByStudent, classSubject])
  const classSubjectCounts = useMemo(() => {
    const counts = { all: attempts.length }
    for (const a of attempts) {
      const s = fromCourseUnitId(a.unit_id).subject
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [attempts])

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null

  function handleSelectStudent(id) {
    setSelectedStudentId(id)
    setView('profile')
  }

  function handleSelectClassFromSidebar(cls) {
    setSelectedClass(cls)
    setView('classReport')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <ContactsHiddenContext.Provider value={hideContacts}>
    <div className="dashboard">
      <Topbar links={nav} />
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
                <strong style={{ color: 'var(--gray-600)' }}>{crumb}</strong> / Students
                {view === 'profile' && selectedStudent && <> / <strong style={{ color: 'var(--gray-600)' }}>{selectedStudent.name}</strong></>}
                {view === 'leaderboard' && <> / <strong style={{ color: 'var(--gray-600)' }}>Leaderboard</strong></>}
                {view === 'classReport' && <> / <strong style={{ color: 'var(--gray-600)' }}>Class Report</strong></>}
              </p>
              {view === 'profile' && selectedStudent && (
                <Link to={`${mistakesPath}?student=${selectedStudent.id}`} className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                  <NotebookPen size={15} /> Mistake Copy
                </Link>
              )}
            </div>

            {students.length > 0 && view !== 'profile' && (
              <SubjectTabs value={classSubject} onChange={setClassSubject} counts={classSubjectCounts} />
            )}

            {students.length === 0 ? (
              <div className="empty-state">No students yet. Add students from the Students tab.</div>
            ) : view === 'leaderboard' ? (
              <ClassLeaderboard
                students={students}
                attemptsByStudent={classAttemptsByStudent}
                onlyWithAttempts={classSubject !== 'all'}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                selectedStudentId={selectedStudentId}
                onSelectStudent={handleSelectStudent}
                onBack={() => setView('profile')}
                onShowReport={() => setView('classReport')}
              />
            ) : view === 'classReport' ? (
              <ClassReport
                students={students}
                attemptsByStudent={classAttemptsByStudent}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                onSelectStudent={handleSelectStudent}
                onShowLeaderboard={() => setView('leaderboard')}
              />
            ) : selectedStudent ? (
              <StudentProfile
                student={selectedStudent}
                progress={progressByStudent[selectedStudent.id]}
                attempts={attemptsByStudent[selectedStudent.id] || []}
                onOpenReview={setReviewAttempt}
                showContactActions={!hideContacts}
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
    </ContactsHiddenContext.Provider>
  )
}
