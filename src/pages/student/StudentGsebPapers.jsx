import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, ArrowLeft, PlayCircle, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GSEB_SUBJECTS, GSEB_SESSION_LABELS, GSEB_MEDIUM_LABELS } from '../../lib/gseb'
import { GsebChapterList } from './GsebBankViews'

const VIEWS = [
  { id: 'years', label: 'Year-wise papers' },
  { id: 'chapters', label: 'Chapter-wise' },
]

export default function StudentGsebPapers() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const view = VIEWS.some(v => v.id === params.get('view')) ? params.get('view') : 'years'
  const subject = GSEB_SUBJECTS.some(s => s.id === params.get('subject')) ? params.get('subject') : null
  // View and subject live in the URL so "back" from a test lands on the same tab.
  function setParam(key, value) {
    setParams(p => { const n = new URLSearchParams(p); n.set(key, value); return n }, { replace: true })
  }

  useEffect(() => {
    async function load() {
      const [papersRes, attemptsRes] = await Promise.all([
        supabase.from('gseb_papers').select('*, gseb_subjective(count)').eq('is_published', true)
          .order('year', { ascending: false }).order('session').order('set_no'),
        supabase.from('gseb_attempts').select('id, paper_id, score, submitted_at')
          .eq('student_id', user.id).eq('submitted', true).order('submitted_at', { ascending: false }),
      ])
      if (papersRes.error) toast.error(papersRes.error.message)
      const list = papersRes.data || []
      setPapers(list)
      setAttempts(attemptsRes.data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  // Open on the first subject that actually has a paper.
  const shownSubject = subject || GSEB_SUBJECTS.find(s => papers.some(p => p.subject === s.id))?.id || 'physics'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const shown = papers.filter(p => p.subject === shownSubject)
  const attemptsByPaper = {}
  for (const a of attempts) (attemptsByPaper[a.paper_id] ||= []).push(a)

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>{user.name} ({user.roll_number})</span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="page-content">
        <Link to="/student/dashboard" className="back-btn">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
        <div className="page-header">
          <h2>GSEB Std 12 Board Papers</h2>
        </div>
        <p className="text-muted" style={{ marginTop: '-0.5rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          Past Gujarat board papers. MCQ tests are timed like the real exam: 1 mark each, no negative marking.
        </p>

        <div className="tabs">
          {VIEWS.map(v => (
            <button key={v.id} className={`tab-btn ${view === v.id ? 'active' : ''}`} onClick={() => setParam('view', v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="tabs">
          {GSEB_SUBJECTS.map(s => (
            <button key={s.id} className={`tab-btn ${shownSubject === s.id ? 'active' : ''}`} onClick={() => setParam('subject', s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {view === 'chapters' ? (
          <GsebChapterList subject={shownSubject} />
        ) : shown.length === 0 ? (
          <div className="empty-state">No papers for this subject yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {shown.map(p => {
              const mine = attemptsByPaper[p.id] || []
              const best = mine.length ? Math.max(...mine.map(a => a.score || 0)) : null
              return (
                <div key={p.id} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>
                      {GSEB_SESSION_LABELS[p.session]?.split(' ')[0]} {p.year}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                      {GSEB_MEDIUM_LABELS[p.medium]}{p.set_no ? ` · Set ${p.set_no}` : ''}{p.paper_code ? ` · Code ${p.paper_code}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                    {p.mcq_count} MCQs · {p.duration_min} min
                    {p.key_status === 'provisional' && <span title="GSEB's final answer key is not out yet"> · provisional key</span>}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                    {best === null ? 'Not attempted yet' : `Best: ${best}/${p.mcq_count} · ${mine.length} attempt${mine.length === 1 ? '' : 's'}`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => navigate(`/student/gseb/test/${p.id}`)}>
                      <PlayCircle size={15} /> {mine.length ? 'Attempt again' : 'Start test'}
                    </button>
                    {mine[0] && (
                      <Link to={`/student/gseb/result/${mine[0].id}`} className="btn btn-ghost btn-sm">Last result</Link>
                    )}
                    {p.gseb_subjective?.[0]?.count > 0 && (
                      <Link to={`/student/gseb/paper/${p.id}/part-b`} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileText size={14} /> Part B
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
