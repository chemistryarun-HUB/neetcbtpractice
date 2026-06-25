import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { Search, UserPlus, Upload, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
]

const BLANK = {
  name: '', roll_number: '', password: '', class: '',
  phone_student: '', phone_father: '', phone_mother: '',
}

const EXCEL_COLS = ['Class', 'Student Name', 'Roll No', 'Password', 'Phone (Student)', 'Phone (Father)', 'Phone (Mother)']

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  async function loadStudents() {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [])

  async function handleAddStudent(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.roll_number.trim() || !form.password.trim()) {
      toast.error('Name, Roll Number, and Password are required')
      return
    }
    setSubmitting(true)
    try {
      const { data: existing } = await supabase
        .from('students').select('id').eq('roll_number', form.roll_number.trim()).single()
      if (existing) { toast.error('Roll number already exists'); return }

      const { error } = await supabase.from('students').insert({
        name: form.name.trim(),
        roll_number: form.roll_number.trim(),
        password_hash: form.password.trim(),
        class: form.class.trim() || null,
        phone_student: form.phone_student.trim() || null,
        phone_father: form.phone_father.trim() || null,
        phone_mother: form.phone_mother.trim() || null,
        is_first_login: true,
        added_by: null,
      })
      if (error) throw error
      toast.success(`Student "${form.name}" added`)
      setForm(BLANK)
      setShowForm(false)
      loadStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExcelImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      // Normalize column header keys
      const rows = rawRows.map(r => {
        const n = {}
        for (const [k, v] of Object.entries(r)) n[k.trim()] = v
        return n
      })

      const records = []
      const skipped = []
      for (const r of rows) {
        const name    = String(r['Student Name'] || '').trim()
        const rollNo  = String(r['Roll No'] || '').trim()
        const password = String(r['Password'] || '').trim()
        if (!name || !rollNo || !password) { skipped.push(rollNo || name || '(empty)'); continue }
        records.push({
          name,
          roll_number:   rollNo,
          password_hash: password,
          class:         String(r['Class'] || '').trim() || null,
          phone_student: String(r['Phone (Student)'] || '').trim() || null,
          phone_father:  String(r['Phone (Father)'] || '').trim() || null,
          phone_mother:  String(r['Phone (Mother)'] || '').trim() || null,
          is_first_login: true,
          added_by: null,
        })
      }

      if (records.length === 0) {
        toast.error('No valid rows found. Check column headers match the sample.')
        return
      }

      // Upsert on roll_number so re-importing updates existing students
      const { error } = await supabase
        .from('students')
        .upsert(records, { onConflict: 'roll_number' })
      if (error) throw error

      const msg = skipped.length
        ? `${records.length} imported, ${skipped.length} skipped (missing Name/Roll No/Password).`
        : `${records.length} students imported successfully!`
      toast.success(msg)
      loadStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  function downloadSample() {
    const sampleRows = [
      { Class: '12th', 'Student Name': 'Amit Sharma', 'Roll No': 'AHM001', Password: 'Pass@123', 'Phone (Student)': '9876543210', 'Phone (Father)': '9876543211', 'Phone (Mother)': '9876543212' },
      { Class: '11th', 'Student Name': 'Priya Singh', 'Roll No': 'AHM002', Password: 'Pass@456', 'Phone (Student)': '9123456780', 'Phone (Father)': '', 'Phone (Mother)': '' },
    ]
    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: EXCEL_COLS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'students_sample.xlsx')
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
          <div>
            <h2>All Students</h2>
            <span className="text-muted">{students.length} total</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={downloadSample} title="Download sample Excel">
              <Download size={15} /> Sample Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcelImport} />
            <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload size={15} /> {importing ? 'Importing...' : 'Import Excel'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
              <UserPlus size={15} /> Add Student
            </button>
          </div>
        </div>

        {/* Add Student Form */}
        {showForm && (
          <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, margin: 0 }}>Add New Student</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setForm(BLANK) }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Roll Number *</label>
                  <input className="form-control" value={form.roll_number} onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input className="form-control" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Student changes on first login" />
                </div>
                <div className="form-group">
                  <label>Class</label>
                  <input className="form-control" value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} placeholder="e.g. 12th" />
                </div>
                <div className="form-group">
                  <label>Phone (Student)</label>
                  <input className="form-control" value={form.phone_student} onChange={e => setForm(f => ({ ...f, phone_student: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone (Father)</label>
                  <input className="form-control" value={form.phone_father} onChange={e => setForm(f => ({ ...f, phone_father: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone (Mother)</label>
                  <input className="form-control" value={form.phone_mother} onChange={e => setForm(f => ({ ...f, phone_mother: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Student'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(BLANK) }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Search size={16} />
            <input
              className="form-control"
              style={{ border: 'none', boxShadow: 'none', padding: '0', fontSize: '0.875rem' }}
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Phone (Student)</th>
                    <th>Phone (Father)</th>
                    <th>Phone (Mother)</th>
                    <th>First Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.roll_number}</strong></td>
                      <td>{s.name}</td>
                      <td>{s.class || '-'}</td>
                      <td>{s.phone_student || '-'}</td>
                      <td>{s.phone_father || '-'}</td>
                      <td>{s.phone_mother || '-'}</td>
                      <td>
                        <span className={`badge ${s.is_first_login ? 'badge-medium' : 'badge-easy'}`}>
                          {s.is_first_login ? 'Pending' : 'Done'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && (
              <div className="empty-state">No students found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
