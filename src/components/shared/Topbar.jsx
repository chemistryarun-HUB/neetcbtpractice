import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LogOut } from 'lucide-react'

export default function Topbar({ links }) {
  const { logout, user, role } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const displayName = role === 'admin' ? 'Admin' : (user?.name || user?.email || 'Faculty')
  const homePath = role === 'admin' ? '/admin' : '/faculty/dashboard'

  return (
    <header className="topbar">
      <div className="topbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate(homePath)}>NEETCBT</div>
      <nav className="topbar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.label}
          </NavLink>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', padding: '0 0.5rem' }}>
          {displayName}
        </span>
        <button onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </nav>
    </header>
  )
}
