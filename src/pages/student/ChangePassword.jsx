import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { facultyChangePassword } from '../../lib/faculty'

export default function ChangePassword() {
  // Shared by students and faculty: both start on a password the admin knows
  // and set their own here.
  const { user, role, facultyToken, updateStudentUser, updateFacultyUser } = useAuth()
  const isFaculty = role === 'faculty'
  const firstLogin = isFaculty ? user?.must_change_password : user?.is_first_login
  const navigate = useNavigate()
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      if (isFaculty) {
        const fresh = await facultyChangePassword(facultyToken, form.newPassword)
        updateFacultyUser(fresh)
        toast.success('Password changed successfully!')
        navigate('/faculty/dashboard', { replace: true })
        return
      }
      const { error } = await supabase.from('students')
        .update({ password_hash: form.newPassword, is_first_login: false })
        .eq('id', user.id)
      if (error) throw error

      updateStudentUser({ password_hash: form.newPassword, is_first_login: false })
      toast.success('Password changed successfully!')

      // Ensure progress row exists
      await supabase.from('student_progress').upsert({ student_id: user.id }, { onConflict: 'student_id' })

      navigate('/student/dashboard')
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
          <p>{firstLogin ? 'First Login — Change Password' : 'Change Password'}</p>
        </div>

        {firstLogin && <div style={{ background: '#fef9c3', border: '1.5px solid #d97706', borderRadius: 'var(--radius)', padding: '0.875rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
          This is your first login. Please set a new password to continue.
        </div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="At least 6 characters"
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.75rem' }}>
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
