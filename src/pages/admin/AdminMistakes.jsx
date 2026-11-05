import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import toast from 'react-hot-toast'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import StudentSidebar from '../../components/performance/StudentSidebar'
import MistakeCopyView from '../../components/mistakes/MistakeCopyView'

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

// Also the faculty Mistake Copy page: `nav`/`crumb` swap the chrome. Asks only
// for the columns it shows, so no phone number ever reaches the faculty view.
export default function AdminMistakes({ nav = NAV, crumb = 'Admin' }) {
  const { user, role } = useAuth()
  const [students, setStudents] = useState(null)
  const [params] = useSearchParams()
  const [selectedId, setSelectedId] = useState(params.get('student'))
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    supabase.from('students').select('id, name, roll_number, class').order('name').then(({ data, error }) => {
      if (error) toast.error(error.message)
      const rows = data || []
      setStudents(rows)
      setSelectedId(prev => prev || rows[0]?.id || null)
    })
  }, [])

  if (!students) return <div className="loading-screen"><div className="spinner" /></div>

  const selected = students.find(s => s.id === selectedId) || null

  return (
    <div className="dashboard">
      <Topbar links={nav} />
      <div className="perf-shell">
        <StudentSidebar
          students={students}
          selectedStudentId={selectedId}
          onSelectStudent={setSelectedId}
          view="profile"
          selectedClass="all"
          onSelectClass={() => {}}
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
                <strong style={{ color: 'var(--gray-600)' }}>{crumb}</strong> / Mistake Copy
                {selected && <> / <strong style={{ color: 'var(--gray-600)' }}>{selected.name}</strong></>}
              </p>
            </div>
            {selected
              ? <MistakeCopyView key={selected.id} student={selected} teacher={role === 'faculty' ? user?.name || 'Faculty' : 'Admin'} />
              : <div className="empty-state">Select a student from the sidebar</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
