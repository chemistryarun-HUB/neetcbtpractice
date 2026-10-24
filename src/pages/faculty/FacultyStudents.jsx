import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BarChart3 } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { FACULTY_NAV } from '../../lib/faculty'

// Every student, read-only. Faculty never see phone numbers or passwords, and
// students are added only by the admin — so only safe columns are fetched.
export default function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [lastActive, setLastActive] = useState({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cls, setCls] = useState('all')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('id, name, roll_number, class, neet_year, created_at').order('name')
      setStudents(data || [])
      const last = {}
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabase.from('test_attempts').select('student_id, submitted_at')
          .eq('submitted', true).order('submitted_at', { ascending: false }).range(from, from + 999)
        for (const a of page || []) if (!last[a.student_id]) last[a.student_id] = a.submitted_at
        if (!page || page.length < 1000) break
      }
      setLastActive(last)
      setLoading(false)
    })()
  }, [])

  const classes = useMemo(() => [...new Set(students.map(s => s.class).filter(Boolean))].sort(), [students])
  const shown = students.filter(s => {
    if (cls !== 'all' && s.class !== cls) return false
    const q = query.trim().toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || (s.roll_number || '').toLowerCase().includes(q)
  })

  const ago = iso => {
    if (!iso) return 'Not started'
    const d = Math.floor((Date.now() - new Date(iso)) / 864e5)
    return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`
  }

  return (
    <div className="dashboard">
      <Topbar links={FACULTY_NAV} />
      <div className="page-content">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ marginBottom: 0 }}>Students</h2>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>{students.length} students</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto' }} value={cls} onChange={e => setCls(e.target.value)}>
              <option value="all">All classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-control" style={{ paddingLeft: 32, width: 220 }} placeholder="Search name or roll no." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div> : (
              <table>
                <thead><tr><th>Roll No.</th><th>Name</th><th>Class</th><th>NEET Year</th><th>Last practice</th><th></th></tr></thead>
                <tbody>
                  {shown.map(s => (
                    <tr key={s.id}>
                      <td><code>{s.roll_number}</code></td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.class || '—'}</td>
                      <td>{s.neet_year || '—'}</td>
                      <td style={{ color: lastActive[s.id] ? 'var(--gray-700)' : 'var(--gray-400)' }}>{ago(lastActive[s.id])}</td>
                      <td>
                        <Link to={`/faculty/performance?student=${s.id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <BarChart3 size={14} /> Performance
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && shown.length === 0 && <div className="empty-state">No students match.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
