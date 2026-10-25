import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, BarChart3, FileQuestion, ClipboardList, User, FileDown } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { FACULTY_NAV, facultyMySuggestions } from '../../lib/faculty'

export default function FacultyDashboard() {
  const { user, facultyToken } = useAuth()
  const [stats, setStats] = useState({ students: '—', active: '—', drafts: '—', suggestions: '—', papers: '—' })

  useEffect(() => {
    if (!user?.id) return
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
      const [s, a, d, p] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('test_attempts').select('student_id').eq('submitted', true).gte('submitted_at', weekAgo).limit(5000),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('uploaded_by', user.id).eq('is_published', false).eq('review_status', 'pending'),
        supabase.from('practice_papers').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      ])
      let open = '—'
      try { open = (await facultyMySuggestions(facultyToken)).filter(x => x.status === 'open').length } catch { /* not migrated yet */ }
      setStats({
        students: s.count ?? '—',
        active: a.data ? new Set(a.data.map(r => r.student_id)).size : '—',
        drafts: d.error ? '—' : d.count ?? 0,
        suggestions: open,
        papers: p.error ? '—' : p.count ?? 0,
      })
    })()
  }, [user?.id])

  const cards = [
    { to: '/faculty/performance', icon: BarChart3, title: 'Student Performance', sub: 'Scores, weak units, leaderboard' },
    { to: '/faculty/students', icon: Users, title: 'Students', sub: 'All students and their last practice' },
    { to: '/faculty/questions', icon: FileQuestion, title: 'Questions', sub: 'Browse, suggest corrections, add drafts' },
    { to: '/faculty/practice-papers', icon: ClipboardList, title: 'Practice Papers', sub: 'Make papers and see submissions' },
    { to: '/faculty/gseb', icon: FileDown, title: 'GSEB Board Papers', sub: 'Download papers as PDF, with answer key' },
    { to: '/faculty/profile', icon: User, title: 'My Profile', sub: 'Details and password' },
  ]

  return (
    <div className="dashboard">
      <Topbar links={FACULTY_NAV} />
      <div className="page-content">
        <div className="page-header" style={{ alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>Welcome, {user?.name || 'Faculty'} 👋</h2>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              <code>{user?.faculty_code}</code>{(user?.subjects || []).length ? ` · ${user.subjects.join(', ')}` : ''}{(user?.exams || []).length ? ` · ${user.exams.join(', ')}` : ''}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.students}</div><div className="stat-label">Students</div></div>
          <div className="stat-card"><div className="stat-value">{stats.active}</div><div className="stat-label">Practised this week</div></div>
          <div className="stat-card"><div className="stat-value">{stats.drafts}</div><div className="stat-label">My drafts awaiting review</div></div>
          <div className="stat-card"><div className="stat-value">{stats.suggestions}</div><div className="stat-label">My open corrections</div></div>
          <div className="stat-card"><div className="stat-value">{stats.papers}</div><div className="stat-label">My practice papers</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
          {cards.map(({ to, icon: Icon, title, sub }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', height: '100%' }}>
                <Icon size={30} color="var(--primary)" />
                <div><div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{title}</div><div className="text-muted">{sub}</div></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
