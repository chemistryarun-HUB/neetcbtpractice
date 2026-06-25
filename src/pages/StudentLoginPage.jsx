import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

export default function StudentLoginPage() {
  const [params] = useSearchParams()
  const isAdmin = params.get('admin') === '1'
  const { adminLogin, studentLogin } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isAdmin) {
        const ok = adminLogin(form.identifier, form.password)
        if (!ok) throw new Error('Invalid admin credentials')
        navigate('/admin')
      } else {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('roll_number', form.identifier.trim())
          .single()

        if (error || !data) throw new Error('Roll number not found')
        if (data.password_hash !== form.password) throw new Error('Incorrect password')

        studentLogin(data)

        if (data.is_first_login) {
          navigate('/student/change-password')
        } else {
          navigate('/student/dashboard')
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

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
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
