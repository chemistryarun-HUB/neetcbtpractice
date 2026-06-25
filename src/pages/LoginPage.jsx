import { Link } from 'react-router-dom'
import { GraduationCap, Shield } from 'lucide-react'

export default function LoginPage() {
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
