import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { Users, BookOpen, FileQuestion } from 'lucide-react'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, faculty: 0, questions: 0 })

  useEffect(() => {
    async function load() {
      const [s, f, q] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('faculty').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
      ])
      setStats({ students: s.count || 0, faculty: f.count || 0, questions: q.count || 0 })
    }
    load()
  }, [])

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Admin Dashboard</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.students}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.faculty}</div>
            <div className="stat-label">Total Faculty</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.questions}</div>
            <div className="stat-label">Questions in Bank</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link to="/admin/students" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <Users size={32} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Manage Students</div>
                <div className="text-muted">View all students</div>
              </div>
            </div>
          </Link>
          <Link to="/admin/faculty" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <BookOpen size={32} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Manage Faculty</div>
                <div className="text-muted">Add / remove faculty</div>
              </div>
            </div>
          </Link>
          <Link to="/admin/questions" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <FileQuestion size={32} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Question Bank</div>
                <div className="text-muted">Upload & manage questions</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
