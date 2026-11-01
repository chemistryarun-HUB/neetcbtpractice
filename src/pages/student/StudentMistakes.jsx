import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { neetT } from '../../lib/neetI18n'
import MistakeCopyView from '../../components/mistakes/MistakeCopyView'

export default function StudentMistakes() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [medium, setMedium] = useState(user.medium || 'en')
  const t = neetT(medium)

  useEffect(() => {
    supabase.from('students').select('medium').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.medium) setMedium(data.medium) })
  }, [user.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <Link to="/student/dashboard" className="topbar-brand" style={{ color: '#fff', textDecoration: 'none' }}>NEETCBT</Link>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            {user.name} ({user.roll_number})
          </span>
          <button onClick={handleLogout} title={t.logout} style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      </header>
      <div className="page-content">
        <Link to="/student/dashboard" className="back-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <ArrowLeft size={15} /> {t.backToSyllabus}
        </Link>
        <MistakeCopyView student={user} medium={medium} />
      </div>
    </div>
  )
}
