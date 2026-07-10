import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Users, FileQuestion, User, BarChart3 } from 'lucide-react'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/performance', label: 'Performance' },
  { to: '/faculty/profile', label: 'Profile' },
]

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, questions: 0 })

  useEffect(() => {
    async function load() {
      const [s, q] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('added_by', user?.id),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
      ])
      setStats({ students: s.count || 0, questions: q.count || 0 })
    }
    if (user?.id) load()
  }, [user?.id])

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Welcome, {user?.name || 'Faculty'} 👋</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.students}</div>
            <div className="stat-label">My Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.questions}</div>
            <div className="stat-label">Questions in Bank</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link to="/faculty/students" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <Users size={32} color="var(--primary)" />
              <div><div style={{ fontWeight: 700 }}>Manage Students</div><div className="text-muted">Add & track students</div></div>
            </div>
          </Link>
          <Link to="/faculty/questions" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <FileQuestion size={32} color="var(--primary)" />
              <div><div style={{ fontWeight: 700 }}>Upload Questions</div><div className="text-muted">Add to question bank</div></div>
            </div>
          </Link>
          <Link to="/faculty/performance" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <BarChart3 size={32} color="var(--primary)" />
              <div><div style={{ fontWeight: 700 }}>Student Performance</div><div className="text-muted">Browse & review attempts</div></div>
            </div>
          </Link>
          <Link to="/faculty/profile" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <User size={32} color="var(--primary)" />
              <div><div style={{ fontWeight: 700 }}>My Profile</div><div className="text-muted">Update your info</div></div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
