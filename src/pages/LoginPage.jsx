import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Shield, ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const DASHBOARD_FOR = {
  student: '/student/dashboard',
  admin: '/admin',
  faculty: '/faculty',
}

export default function LoginPage() {
  const { role, user, logout } = useAuth()
  const navigate = useNavigate()
  const dashboard = DASHBOARD_FOR[role]

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  // Pressing Back from a dashboard lands here, and showing a signed-in student
  // two "Login" buttons is what made them think they had been logged out — so
  // they typed their roll number again. Greeting them by name instead makes the
  // state obvious, and keeps switching accounts one tap away, which a plain
  // redirect to the dashboard would have buried.
  if (role && dashboard) {
    return (
      <div className="home-page">
        <div className="home-card">
          <h1>NEETCBT</h1>
          <p className="tagline">
            Signed in as <strong>{user?.name || user?.email}</strong>
            {user?.roll_number ? ` (${user.roll_number})` : ''}
          </p>

          <div className="role-buttons">
            <Link to={dashboard} className="role-btn student">
              <ArrowRight size={24} />
              <div style={{ textAlign: 'left' }}>
                <div>Continue</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.85 }}>Back to where you were</div>
              </div>
            </Link>

            <button onClick={handleLogout} className="role-btn admin" style={{ font: 'inherit', cursor: 'pointer', width: '100%' }}>
              <LogOut size={24} />
              <div style={{ textAlign: 'left' }}>
                <div>Not you? Log out</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.75 }}>Sign in as someone else</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-card">
        <h1>NEETCBT</h1>
        <p className="tagline">Chemistry Practice Platform for NEET</p>

        <div className="role-buttons">
          <Link to="/student/login" className="role-btn student">
            <GraduationCap size={24} />
            <div style={{ textAlign: 'left' }}>
              <div>Student Login</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.85 }}>Login with Roll Number</div>
            </div>
          </Link>

          <Link to="/student/login?admin=1" className="role-btn admin">
            <Shield size={24} />
            <div style={{ textAlign: 'left' }}>
              <div>Admin Login</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.75 }}>Admin access only</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
