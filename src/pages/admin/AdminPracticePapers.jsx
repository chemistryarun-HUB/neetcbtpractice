import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import AnswerGrid from '../../components/shared/AnswerGrid'
import { SUBJECTS, SUBJECT_LABELS, subjectRanges, totalQuestions } from '../../lib/practicePapers'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
]

const BLANK_FORM = {
  name: '',
  physics_count: 45, chemistry_count: 45, botany_count: 45, zoology_count: 45,
  syllabus_physics: '', syllabus_chemistry: '', syllabus_botany: '', syllabus_zoology: '',
}

export default function AdminPracticePapers() {
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [submissions, setSubmissions] = useState({}) // paperId -> rows
  const [savingKey, setSavingKey] = useState(false)
  const saveTimers = useRef({})  // paperId -> setTimeout handle, for debounced key autosave
  const pendingKeys = useRef({}) // paperId -> latest answer_key not yet confirmed saved

  useEffect(() => { loadPapers() }, [])
  // Flush anything still pending if the admin navigates away entirely — the
  // debounce timer alone can't survive a full page unload.
  useEffect(() => () => { for (const paperId of Object.keys(pendingKeys.current)) flushSave(paperId) }, [])

  async function flushSave(paperId) {
    clearTimeout(saveTimers.current[paperId])
    const newKey = pendingKeys.current[paperId]
    if (newKey === undefined) return
    delete pendingKeys.current[paperId]
    setSavingKey(true)
    const { error } = await supabase.from('practice_papers').update({ answer_key: newKey }).eq('id', paperId)
    setSavingKey(false)
    if (error) toast.error(error.message)
  }

  // Debounced per-paper autosave for answer-key taps. Reading/writing the key
  // only inside setPapers' updater (never off a closure-captured `paper` prop)
  // means rapid taps always compose onto the truly latest key instead of a
  // stale snapshot racing another tap's in-flight Supabase write. The debounce
  // alone would still lose the very last tap if the admin collapses the panel
  // or navigates away within the debounce window, so callers also flush
  // explicitly on those transitions (see openPaper below).
  function tapKey(paperId, q, letter) {
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p
      const newKey = { ...(p.answer_key || {}) }
      if (letter) newKey[q] = letter; else delete newKey[q]
      pendingKeys.current[paperId] = newKey
      clearTimeout(saveTimers.current[paperId])
      saveTimers.current[paperId] = setTimeout(() => flushSave(paperId), 400)
      return { ...p, answer_key: newKey }
    }))
  }

  async function loadPapers() {
    setLoading(true)
    const { data, error } = await supabase.from('practice_papers').select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setPapers(data || [])
    setLoading(false)
  }

  async function loadSubmissions(paperId) {
    const { data, error } = await supabase
      .from('practice_paper_attempts')
      .select('id, student_id, score, correct_count, wrong_count, skipped_count, submitted_at, students(name, roll_number)')
      .eq('paper_id', paperId)
      .order('score', { ascending: false })
    if (error) { toast.error(error.message); return }
    setSubmissions(prev => ({ ...prev, [paperId]: data || [] }))
  }

  async function handleAddPaper(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Paper name is required'); return }
    setSaving(true)
    try {
      const record = {
        name: form.name.trim(),
        physics_count: Number(form.physics_count) || 0,
        chemistry_count: Number(form.chemistry_count) || 0,
        botany_count: Number(form.botany_count) || 0,
        zoology_count: Number(form.zoology_count) || 0,
        syllabus_physics: form.syllabus_physics,
        syllabus_chemistry: form.syllabus_chemistry,
        syllabus_botany: form.syllabus_botany,
        syllabus_zoology: form.syllabus_zoology,
      }
      const { error } = await supabase.from('practice_papers').insert([record])
      if (error) throw error
      toast.success('Paper created!')
      setForm(BLANK_FORM)
      setShowAddForm(false)
      loadPapers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(paper) {
    await flushSave(paper.id) // don't let a reload clobber an unsaved key edit
    const { error } = await supabase.from('practice_papers').update({ is_active: !paper.is_active }).eq('id', paper.id)
    if (error) { toast.error(error.message); return }
    toast.success(paper.is_active ? 'Paper deactivated' : 'Paper activated — visible to students now')
    loadPapers()
  }

  async function openPaper(paper) {
    if (expandedId) await flushSave(expandedId) // leaving a paper's key-entry panel
    if (expandedId === paper.id) { setExpandedId(null); return }
    setExpandedId(paper.id)
    if (!submissions[paper.id]) loadSubmissions(paper.id)
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Practice Papers</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={15} /> Add Paper
          </button>
        </div>

        {showAddForm && (
          <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleAddPaper}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Paper Name *</label>
                <input className="form-control" placeholder="e.g. PPP-1201_A" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {SUBJECTS.map(s => (
                  <div key={s} className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600 }}>{SUBJECT_LABELS[s]}</label>
                    <input type="number" min={0} className="form-control" style={{ marginBottom: '0.5rem' }}
                      value={form[`${s}_count`]}
                      onChange={e => setForm(f => ({ ...f, [`${s}_count`]: e.target.value }))} placeholder="Question count" />
                    <textarea className="form-control" rows={3} placeholder={`${SUBJECT_LABELS[s]} syllabus`}
                      value={form[`syllabus_${s}`]}
                      onChange={e => setForm(f => ({ ...f, [`syllabus_${s}`]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Create Paper'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setForm(BLANK_FORM) }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : papers.length === 0 ? (
          <div className="empty-state">No practice papers yet — click "Add Paper" to create one.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {papers.map(paper => {
              const isOpen = expandedId === paper.id
              const keyFilled = Object.keys(paper.answer_key || {}).length
              const total = totalQuestions(paper)
              const rows = submissions[paper.id] || []
              return (
                <div key={paper.id} className="card">
                  <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }}
                    onClick={() => openPaper(paper)}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{paper.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                        {total} questions · key {keyFilled}/{total} filled · {rows.length || (submissions[paper.id] ? 0 : '—')} submissions
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <span className={`badge ${paper.is_active ? 'badge-easy' : 'badge-locked'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(paper)}>
                        {paper.is_active ? 'Active' : 'Inactive — click to activate'}
                      </span>
                      <button className="btn btn-outline btn-sm" onClick={() => openPaper(paper)}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--gray-100)' }}>
                      <h3 style={{ fontSize: '0.9rem', margin: '1rem 0 0.5rem' }}>Answer Key {savingKey && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(saving…)</span>}</h3>
                      <AnswerGrid
                        subjects={subjectRanges(paper)}
                        values={paper.answer_key || {}}
                        onChange={(q, letter) => tapKey(paper.id, q, letter)}
                      />

                      <h3 style={{ fontSize: '0.9rem', margin: '1.5rem 0 0.5rem' }}>Submissions</h3>
                      {rows.length === 0 ? (
                        <div className="empty-state">No student submissions yet</div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Roll No.</th>
                                <th style={{ textAlign: 'right' }}>Score</th>
                                <th style={{ textAlign: 'right' }}>Correct</th>
                                <th style={{ textAlign: 'right' }}>Wrong</th>
                                <th style={{ textAlign: 'right' }}>Skipped</th>
                                <th>Submitted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => (
                                <tr key={row.id}>
                                  <td>{row.students?.name}</td>
                                  <td><code>{row.students?.roll_number}</code></td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.score}</td>
                                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{row.correct_count}</td>
                                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>{row.wrong_count}</td>
                                  <td style={{ textAlign: 'right', color: 'var(--gray-400)' }}>{row.skipped_count}</td>
                                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(row.submitted_at).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
