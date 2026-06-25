import { useState, useEffect } from 'react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Plus, X } from 'lucide-react'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
]

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', state: '', subject: 'Chemistry', experience: '', qualification: '' })

  async function load() {
    const { data } = await supabase.from('faculty').select('*').order('created_at', { ascending: false })
    setFaculty(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addFaculty(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('faculty').insert([{ ...form }])
      if (error) throw error
      toast.success('Faculty added')
      setShowModal(false)
      setForm({ name: '', email: '', phone: '', city: '', state: '', subject: 'Chemistry', experience: '', qualification: '' })
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function removeFaculty(id) {
    if (!confirm('Remove this faculty?')) return
    const { error } = await supabase.from('faculty').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Faculty removed')
    load()
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Faculty Management</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Faculty
          </button>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Subject</th>
                    <th>Experience</th>
                    <th>Qualification</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td>
                      <td>{f.email}</td>
                      <td>{f.phone || '-'}</td>
                      <td>{f.city || '-'}</td>
                      <td>{f.subject}</td>
                      <td>{f.experience || '-'}</td>
                      <td>{f.qualification || '-'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => removeFaculty(f.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && faculty.length === 0 && <div className="empty-state">No faculty yet</div>}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Add Faculty
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addFaculty}>
              <div className="modal-body">
                <div className="grid-2">
                  {[
                    { key: 'name', label: 'Name', required: true },
                    { key: 'email', label: 'Email', required: true, type: 'email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'city', label: 'City' },
                    { key: 'state', label: 'State' },
                    { key: 'subject', label: 'Subject' },
                    { key: 'experience', label: 'Experience' },
                    { key: 'qualification', label: 'Qualification' },
                  ].map(({ key, label, required, type }) => (
                    <div className="form-group" key={key}>
                      <label>{label}{required && ' *'}</label>
                      <input
                        type={type || 'text'}
                        className="form-control"
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        required={required}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
