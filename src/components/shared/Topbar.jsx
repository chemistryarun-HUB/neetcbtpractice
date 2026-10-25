import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LogOut, Menu, X } from 'lucide-react'

export default function Topbar({ links }) {
  const { logout, user, role } = useAuth()
  const navigate = useNavigate()
  // On a phone the links don't fit in one row: they fold behind a menu button.
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const displayName = role === 'admin' ? 'Admin' : (user?.name || user?.email || 'Faculty')
  const homePath = role === 'admin' ? '/admin' : '/faculty/dashboard'

  return (
    <header className="topbar">
      <div className="topbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate(homePath)}>NEETCBT</div>
      <button className="topbar-menu" onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={`topbar-nav${open ? ' open' : ''}`}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', padding: '0 0.5rem' }}>
          {displayName}
        </span>
        <button onClick={handleLogout} title="Logout">
          <LogOut size={16} /><span className="topbar-only-menu"> Logout</span>
        </button>
      </nav>
    </header>
  )
}
