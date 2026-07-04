import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Topbar from '../../components/shared/Topbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Upload, MessageCircle, Eye, Search, X } from 'lucide-react'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/profile', label: 'Profile' },
]

function whatsappLink(phone, message) {
  const cleaned = phone.replace(/\D/g, '')
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

export default function FacultyStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [passwords, setPasswords] = useState({}) // roll_number -> plain password (from import)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('students').select('*').eq('added_by', user?.id).order('created_at', { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => { if (user?.id) load() }, [user?.id])

  async function handleExcelImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        const records = rows.map(r => ({
          class: String(r['Class'] || r['class'] || ''),
          name: String(r['Student Name'] || r['name'] || ''),
          roll_number: String(r['Roll No'] || r['roll_number'] || ''),
          password_hash: String(r['Password'] || r['password'] || ''),
          phone_student: String(r['Phone no of student'] || r['phone_student'] || ''),
          phone_father: String(r['Phone no of father'] || r['phone_father'] || ''),
          phone_mother: String(r['Phone no of mother'] || r['phone_mother'] || ''),
          added_by: user?.id,
          is_first_login: true,
        })).filter(r => r.roll_number && r.name && r.password_hash)

        if (records.length === 0) { toast.error('No valid rows found'); return }

        // Store plain passwords for WhatsApp
        const pwMap = {}
        records.forEach(r => { pwMap[r.roll_number] = r.password_hash })
        setPasswords(prev => ({ ...prev, ...pwMap }))

        const { error } = await supabase.from('students').upsert(records, { onConflict: 'roll_number' })
        if (error) throw error

        // Init progress for new students
        const { data: newStudents } = await supabase.from('students')
          .select('id').in('roll_number', records.map(r => r.roll_number))
        for (const s of (newStudents || [])) {
          await supabase.from('student_progress').upsert({ student_id: s.id }, { onConflict: 'student_id' })
        }

        toast.success(`${records.length} students imported!`)
        load()
      } catch (err) {
        toast.error(err.message)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function sendWhatsApp(student, type) {
    const phone = type === 'student' ? student.phone_student : type === 'father' ? student.phone_father : student.phone_mother
    if (!phone) { toast.error('No phone number for ' + type); return }
    const pwd = passwords[student.roll_number] || '(see faculty)'
    const msg = `Welcome to NEETCBT!\n\nDear ${student.name},\nYour login credentials:\nRoll Number: ${student.roll_number}\nPassword: ${pwd}\n\nLogin at: ${window.location.origin}\n\nAll the best for your NEET preparation! 🎯`
    window.open(whatsappLink(phone, msg), '_blank')
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>My Students</h2>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelImport} />
          </label>
        </div>

        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--primary-light)', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--primary-dark)' }}>
          <strong>Excel columns required:</strong> Class, Student Name, Roll No, Password, Phone no of student, Phone no of father, Phone no of mother
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Search size={16} />
            <input className="form-control" style={{ border: 'none', boxShadow: 'none', padding: 0 }}
              placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-muted">{filtered.length} students</span>
          </div>
          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Phone (Student)</th>
                    <th>Phone (Father)</th>
                    <th>Phone (Mother)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.roll_number}</strong></td>
                      <td>{s.name}</td>
                      <td>{s.class || '-'}</td>
                      <td>
                        {s.phone_student ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {s.phone_student}
                            <button className="btn btn-whatsapp btn-sm" title="Send to student" onClick={() => sendWhatsApp(s, 'student')}>
                              <MessageCircle size={12} />
                            </button>
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {s.phone_father ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {s.phone_father}
                            <button className="btn btn-whatsapp btn-sm" title="Send to father" onClick={() => sendWhatsApp(s, 'father')}>
                              <MessageCircle size={12} />
                            </button>
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {s.phone_mother ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {s.phone_mother}
                            <button className="btn btn-whatsapp btn-sm" title="Send to mother" onClick={() => sendWhatsApp(s, 'mother')}>
                              <MessageCircle size={12} />
                            </button>
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${s.is_first_login ? 'badge-medium' : 'badge-easy'}`}>
                          {s.is_first_login ? 'Not logged in' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/faculty/student/${s.id}`} className="btn btn-outline btn-sm">
                          <Eye size={14} /> Progress
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <div>No students yet.</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Import students via Excel to get started.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
