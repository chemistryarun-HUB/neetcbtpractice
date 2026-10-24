import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { facultyUpdateProfile } from '../../lib/faculty'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/profile', label: 'Profile' },
]

const chip = { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, margin: '0 0.35rem 0.35rem 0' }

export default function FacultyProfile() {
  const { user, facultyToken, updateFacultyUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    city: user?.city || '',
    state: user?.state || '',
    experience: user?.experience || '',
    qualification: user?.qualification || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fresh = await facultyUpdateProfile(facultyToken, form)
      updateFacultyUser(fresh)
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
          <Link to="/faculty/change-password" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={14} /> Change Password
          </Link>
        </div>

        <div className="card card-body" style={{ maxWidth: 640 }}>
          {/* What the admin set up — read-only here; the admin edits it. */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div><div className="text-muted" style={{ fontSize: '0.72rem' }}>FACULTY ID</div><code style={{ fontSize: '1.05rem', fontWeight: 800 }}>{user?.faculty_code}</code></div>
              <div><div className="text-muted" style={{ fontSize: '0.72rem' }}>PHONE</div><strong>{user?.phone}</strong></div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: '0.3rem' }}>SUBJECTS</div>
            <div>{(user?.subjects || []).map(s => <span key={s} style={{ ...chip, background: '#eff6ff', color: '#1d4ed8' }}>{s}</span>)}</div>
            <div className="text-muted" style={{ fontSize: '0.72rem', margin: '0.4rem 0 0.3rem' }}>EXAMS</div>
            <div>{(user?.exams || []).map(s => <span key={s} style={{ ...chip, background: '#f0fdf4', color: '#15803d' }}>{s}</span>)}</div>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>To change your phone, subjects or exams, contact the admin.</div>
          </div>

          <form onSubmit={handleSave}>
            <div className="grid-2">
              {[
                { key: 'name', label: 'Full Name', required: true },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'experience', label: 'Experience' },
                { key: 'qualification', label: 'Qualification' },
              ].map(({ key, label, required, type }) => (
                <div className="form-group" key={key}>
                  <label>{label}{required && ' *'}</label>
                  <input className="form-control" type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} />
                </div>
              ))}
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
