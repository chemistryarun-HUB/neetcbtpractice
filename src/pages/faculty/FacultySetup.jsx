import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function FacultySetup() {
  const { role, user, updateFacultyUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', city: '', state: '', subject: 'Chemistry', experience: '', qualification: '' })
  const [loading, setLoading] = useState(false)
  const [supaUser, setSupaUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { navigate('/faculty/login'); return }
      setSupaUser(u)
      // Check if faculty row already exists
      supabase.from('faculty').select('*').eq('user_id', u.id).single().then(({ data }) => {
        if (data) { navigate('/faculty/dashboard') }
      })
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supaUser) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('faculty').insert([{
        user_id: supaUser.id,
        email: supaUser.email,
        ...form,
      }]).select().single()
      if (error) throw error
      updateFacultyUser(data)
      toast.success('Profile created!')
      navigate('/faculty/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-logo">
          <h1>NEETCBT</h1>
          <p>Complete your faculty profile</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>City</label>
              <input className="form-control" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-control" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input className="form-control" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Experience</label>
              <input className="form-control" placeholder="e.g. 5 years" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Qualification</label>
            <input className="form-control" placeholder="e.g. M.Sc Chemistry" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
