import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { GraduationCap, BookOpen, Shield, Eye, EyeOff } from 'lucide-react'
import { facultyLogin, FACULTY_CODE_RE } from '../lib/faculty'

// One login for everyone. Who is signing in is read from what they type:
//   an email address          → admin
//   a Faculty ID (FC261045)   → faculty
//   anything else             → student roll number
export function accountTypeOf(identifier) {
  const id = (identifier || '').trim()
  if (!id) return null
  if (id.includes('@')) return 'admin'
  if (FACULTY_CODE_RE.test(id)) return 'faculty'
  return 'student'
}

const TYPE_HINT = {
  student: { icon: GraduationCap, label: 'Student', color: '#1d4ed8', bg: '#eff6ff' },
  faculty: { icon: BookOpen, label: 'Faculty', color: '#7c3aed', bg: '#f5f3ff' },
  admin:   { icon: Shield, label: 'Admin', color: '#334155', bg: '#f1f5f9' },
}

export default function StudentLoginPage() {
  const { adminLogin, studentLogin, facultySignIn, role, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  // A signed-in visitor goes straight on, so Back from a dashboard can never
  // strand anyone on a login form that looks like they were logged out.
  if (role === 'student') return <Navigate to="/student/dashboard" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'faculty') return <Navigate to={user?.must_change_password ? '/faculty/change-password' : '/faculty/dashboard'} replace />

  const type = accountTypeOf(form.identifier)
  const hint = type && TYPE_HINT[type]

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (type === 'admin') {
        const ok = await adminLogin(form.identifier, form.password)
        if (!ok) throw new Error('Incorrect email or password')
        navigate('/admin', { replace: true })
      } else if (type === 'faculty') {
        const result = await facultyLogin(form.identifier, form.password)
        facultySignIn(result, remember)
        navigate(result.faculty.must_change_password ? '/faculty/change-password' : '/faculty/dashboard', { replace: true })
      } else {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('roll_number', form.identifier.trim())
          .single()
        if (error || !data) throw new Error('Roll number not found')
        if (data.password_hash !== form.password) throw new Error('Incorrect password')
        studentLogin(data, remember)
        navigate(data.is_first_login ? '/student/change-password' : '/student/dashboard', { replace: true })
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
          <p>A Practice Platform for NEET &amp; Board Exam</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Roll No. / Faculty ID / Admin Email</label>
            <input
              className="form-control"
              placeholder="Enter your login ID"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={form.identifier}
              onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              required
            />
            {/* Live confirmation of who the app thinks is signing in. */}
            <div style={{ minHeight: 24, marginTop: 6 }}>
              {hint && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: hint.color, background: hint.bg, padding: '0.15rem 0.6rem', borderRadius: 999 }}>
                  <hint.icon size={13} /> {hint.label} login
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 40 }}
                required
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4 }}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Admin sessions are Supabase's own and last until Logout. */}
          {type !== 'admin' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem', cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--gray-700)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width: '1.05rem', height: '1.05rem', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }} />
              Keep me signed in
            </label>
          )}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {type !== 'admin' && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
              {remember
                ? 'You’ll stay signed in on this device for 30 days. Use Logout on a shared phone.'
                : 'You’ll be signed out as soon as you close this tab.'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
