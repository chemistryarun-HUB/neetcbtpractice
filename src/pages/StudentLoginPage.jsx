import { useState } from 'react'
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

export default function StudentLoginPage() {
  const [params] = useSearchParams()
  const isAdmin = params.get('admin') === '1'
  const { adminLogin, studentLogin, role } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  // Half of the "I have to log in every time" complaint was this: logging in
  // pushed the dashboard on top of the login page, so Back landed here — and
  // this page rendered its form regardless of already being signed in, which
  // looks exactly like being logged out. Sending an authenticated visitor
  // straight on means Back can no longer strand anyone on a login form.
  // (The other half was the session dying with the tab — see lib/session.js.)
  if (role === 'student') return <Navigate to="/student/dashboard" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'faculty') return <Navigate to="/faculty/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isAdmin) {
        const ok = adminLogin(form.identifier, form.password, remember)
        if (!ok) throw new Error('Invalid admin credentials')
        // replace, not push — see the redirect above; this keeps the login page
        // out of history entirely so Back skips over it.
        navigate('/admin', { replace: true })
      } else {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('roll_number', form.identifier.trim())
          .single()

        if (error || !data) throw new Error('Roll number not found')
        if (data.password_hash !== form.password) throw new Error('Incorrect password')

        studentLogin(data, remember)

        if (data.is_first_login) {
          navigate('/student/change-password', { replace: true })
        } else {
          navigate('/student/dashboard', { replace: true })
        }
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>NEETCBT</h1>
          <p>{isAdmin ? 'Admin Portal' : 'Student Portal'}</p>
        </div>

        <p className="auth-title">{isAdmin ? 'Admin Login' : 'Student Login'}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{isAdmin ? 'Email' : 'Roll Number'}</label>
            <input
              className="form-control"
              placeholder={isAdmin ? 'admin@neetcbt.in' : 'Enter Roll Number'}
              value={form.identifier}
              onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          {/* On by default: students reach this from a WhatsApp link, so almost
              every visit is a fresh tab, and staying signed in is what they
              expect. Unticking it keeps the session to this tab only — the
              right choice on a borrowed or shared phone. */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem', cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--gray-700)' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: '1.05rem', height: '1.05rem', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
            />
            Keep me signed in
          </label>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
            {remember
              ? 'You’ll stay signed in on this device for 30 days. Use Logout to sign out, especially on a shared phone.'
              : 'You’ll be signed out as soon as you close this tab.'}
          </p>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/" className="back-btn">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
