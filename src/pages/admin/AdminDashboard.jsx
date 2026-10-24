import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { Users, BookOpen, FileQuestion, BarChart3, Inbox } from 'lucide-react'

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

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, faculty: 0, questions: 0, pending: 0 })
  const [facultyReview, setFacultyReview] = useState(0)

  useEffect(() => {
    async function load() {
      const [s, f, q, p] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('faculty').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        // Uploaded but not yet released to students. Surfaced on the landing
        // page because the failure mode of the review gate is silence — a batch
        // that never gets published is invisible from every other screen.
        supabase.from('questions').select('id', { count: 'exact', head: true })
          .eq('is_published', false).eq('is_active', true),
      ])
      setStats({ students: s.count || 0, faculty: f.count || 0, questions: q.count || 0, pending: p.count || 0 })
    }
    load()
    // Faculty drafts + suggested corrections waiting for the admin.
    Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      supabase.from('question_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]).then(([a, b]) => setFacultyReview((a.count || 0) + (b.count || 0)))
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
          {stats.pending > 0 && (
            <Link to="/admin/questions" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', cursor: 'pointer' }}
                title="Uploaded but not reviewed. Students cannot see these yet — click to review and publish them.">
                <div className="stat-value" style={{ color: '#92400e' }}>{stats.pending}</div>
                <div className="stat-label" style={{ color: '#92400e', fontWeight: 600 }}>Awaiting review</div>
              </div>
            </Link>
          )}
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
                <div className="text-muted">Add faculty · Faculty IDs</div>
              </div>
            </div>
          </Link>
          <Link to="/admin/faculty-review" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: facultyReview ? '1.5px solid #f59e0b' : undefined }}>
              <Inbox size={32} color={facultyReview ? '#d97706' : 'var(--primary)'} />
              <div>
                <div style={{ fontWeight: 700 }}>
                  Faculty Review
                  {facultyReview > 0 && <span className="badge" style={{ background: '#dc2626', color: '#fff', marginLeft: 6 }}>{facultyReview}</span>}
                </div>
                <div className="text-muted">New questions & corrections from faculty</div>
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
          <Link to="/admin/performance" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <BarChart3 size={32} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Student Performance</div>
                <div className="text-muted">Browse & review attempts</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
