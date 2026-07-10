import { useState } from 'react'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/performance', label: 'Performance' },
  { to: '/faculty/profile', label: 'Profile' },
]

export default function FacultyProfile() {
  const { user, updateFacultyUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    state: user?.state || '',
    subject: user?.subject || 'Chemistry',
    experience: user?.experience || '',
    qualification: user?.qualification || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('faculty').update(form).eq('id', user.id)
      if (error) throw error
      updateFacultyUser(form)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>My Profile</h2>
        </div>
        <div className="card card-body" style={{ maxWidth: '600px' }}>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            <strong>Email:</strong> {user?.email}
          </div>
          <form onSubmit={handleSave}>
            <div className="grid-2">
              {[
                { key: 'name', label: 'Full Name', required: true },
                { key: 'phone', label: 'Phone' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'subject', label: 'Subject' },
                { key: 'experience', label: 'Experience' },
              ].map(({ key, label, required }) => (
                <div className="form-group" key={key}>
                  <label>{label}{required && ' *'}</label>
                  <input className="form-control" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Qualification</label>
              <input className="form-control" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
