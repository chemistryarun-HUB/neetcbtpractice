import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { GSEB_SUBJECTS, GSEB_MEDIUM_LABELS, GSEB_SESSION_LABELS, GSEB_SUBJECT_LABELS } from '../../lib/gseb'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
  { to: '/admin/gseb', label: 'GSEB Papers' },
]

const BLANK_FORM = {
  subject: 'physics', paper_code: '054', year: new Date().getFullYear(),
  session: 'march', medium: 'en', set_no: '', duration_min: 60, mcq_count: 50,
}

export default function AdminGsebPapers() {
  const [papers, setPapers] = useState([])
  const [counts, setCounts] = useState({}) // paperId -> questions uploaded
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // Embedded count rather than fetching every question row: a plain select
    // is capped at 1,000 rows, which 20 papers of 50 MCQs already reach.
    const { data, error } = await supabase.from('gseb_papers').select('*, gseb_questions(count)')
      .order('year', { ascending: false }).order('subject').order('set_no')
    if (error) toast.error(error.message)
    const c = {}
    for (const p of data || []) c[p.id] = p.gseb_questions?.[0]?.count || 0
    setPapers(data || [])
    setCounts(c)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const year = Number(form.year)
    if (!year || year < 2000 || year > 2100) { toast.error('Enter a valid year'); return }
    setSaving(true)
    const { error } = await supabase.from('gseb_papers').insert({
      ...form,
      year,
      set_no: String(form.set_no).trim(),
      paper_code: form.paper_code.trim() || null,
      duration_min: Number(form.duration_min) || 60,
      mcq_count: Number(form.mcq_count) || 50,
    })
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? 'That paper (subject, year, session, medium, set) already exists' : error.message)
      return
    }
    toast.success('Paper created. Open it to upload questions.')
    setShowForm(false)
    setForm(BLANK_FORM)
    load()
  }

  const shown = subjectFilter === 'all' ? papers : papers.filter(p => p.subject === subjectFilter)

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>GSEB Std 12 Board Papers</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={15} /> Add Paper
          </button>
        </div>

        {showForm && (
          <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Subject</label>
                  <select className="form-control" value={form.subject}
                    onChange={e => {
                      const s = GSEB_SUBJECTS.find(x => x.id === e.target.value)
                      setForm(f => ({ ...f, subject: s.id, paper_code: s.paperCode }))
                    }}>
                    {GSEB_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Year</label>
                  <input className="form-control" type="number" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Session</label>
                  <select className="form-control" value={form.session}
                    onChange={e => setForm(f => ({ ...f, session: e.target.value }))}>
                    {Object.entries(GSEB_SESSION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Medium</label>
                  <select className="form-control" value={form.medium}
                    onChange={e => setForm(f => ({ ...f, medium: e.target.value }))}>
                    {Object.entries(GSEB_MEDIUM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Set No</label>
                  <input className="form-control" placeholder="e.g. 15" value={form.set_no}
                    onChange={e => setForm(f => ({ ...f, set_no: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Paper Code</label>
                  <input className="form-control" value={form.paper_code}
                    onChange={e => setForm(f => ({ ...f, paper_code: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>MCQs</label>
                  <input className="form-control" type="number" value={form.mcq_count}
                    onChange={e => setForm(f => ({ ...f, mcq_count: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Minutes</label>
                  <input className="form-control" type="number" value={form.duration_min}
                    onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Create Paper'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setForm(BLANK_FORM) }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="tabs" style={{ marginBottom: '1rem' }}>
          {[{ id: 'all', label: 'All' }, ...GSEB_SUBJECTS].map(s => (
            <button key={s.id} className={`tab-btn${subjectFilter === s.id ? ' active' : ''}`} onClick={() => setSubjectFilter(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : shown.length === 0 ? (
          <div className="empty-state">No GSEB papers yet. Click "Add Paper" to create one.</div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Subject</th><th>Year</th><th>Medium</th><th>Set</th><th>Questions</th><th>Key</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {shown.map(p => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/admin/gseb/${p.id}`} style={{ fontWeight: 600 }}>{GSEB_SUBJECT_LABELS[p.subject]}</Link>
                        {p.paper_code && <span style={{ color: 'var(--gray-500)' }}> ({p.paper_code})</span>}
                      </td>
                      <td>{GSEB_SESSION_LABELS[p.session]?.split(' ')[0]} {p.year}</td>
                      <td>{GSEB_MEDIUM_LABELS[p.medium]}</td>
                      <td>{p.set_no || '—'}</td>
                      <td>{counts[p.id] || 0}/{p.mcq_count}</td>
                      <td>{p.key_status === 'final' ? 'Final' : 'Provisional'}</td>
                      <td>
                        <span className={`badge ${p.is_published ? 'badge-green' : 'badge-locked'}`}>
                          {p.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
