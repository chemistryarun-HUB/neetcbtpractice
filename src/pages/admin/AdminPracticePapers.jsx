import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, ChevronDown, ChevronUp, Pencil, Upload } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import AnswerGrid from '../../components/shared/AnswerGrid'
import { SUBJECTS, SUBJECT_LABELS, subjectRanges, totalQuestions } from '../../lib/practicePapers'

const Q_HEADER_KEYS = ['q no', 'q.no', 'qno', 'question no', 'question number', 'q']
const A_HEADER_KEYS = ['answer', 'ans', 'correct answer', 'key', 'correct option']

// Reads an uploaded workbook. Tolerant of header-name variations ("Q No" /
// "Q.No" / "Question No" / "Q", "Answer" / "Ans" / "Correct Answer" / "Key")
// and of answers written as "1", "(1)", "Option 1", etc — extracts the first
// digit 1-4 out of whatever's in the cell. A blank Answer cell just means
// that question hasn't been keyed yet, not an error — only a genuinely
// unparseable non-blank value or an out-of-range Q No gets flagged.
function parseKeyFile(arrayBuffer, totalQ) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })

  // Prefer the first sheet, but fall back to any other sheet that actually
  // has recognizable "Q No"/"Answer" headers with data — handles workbooks
  // with a leading instructions/title sheet (like our own sample template).
  let rows = []
  for (const name of wb.SheetNames) {
    const candidateRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
    const hasHeaders = candidateRows.some(r => {
      const keys = Object.keys(r).map(k => k.trim().toLowerCase())
      return Q_HEADER_KEYS.some(qk => keys.includes(qk)) && A_HEADER_KEYS.some(ak => keys.includes(ak))
    })
    if (hasHeaders) { rows = candidateRows; break }
    if (rows.length === 0) rows = candidateRows // keep first sheet as fallback for error reporting
  }

  const key = {}
  const skipped = []
  for (const row of rows) {
    const norm = {}
    for (const [k, v] of Object.entries(row)) norm[k.trim().toLowerCase()] = v
    const qRaw = Q_HEADER_KEYS.map(k => norm[k]).find(v => v !== undefined && v !== '')
    const aRaw = A_HEADER_KEYS.map(k => norm[k]).find(v => v !== undefined && v !== '')
    if (qRaw === undefined) continue // blank/header-only row
    const qNum = parseInt(String(qRaw).trim(), 10)
    if (!qNum || qNum < 1 || qNum > totalQ) { skipped.push(`Q${qRaw} (out of range 1-${totalQ})`); continue }
    if (aRaw === undefined) continue // no answer keyed for this question yet — not an error
    const digitMatch = String(aRaw).match(/[1-4]/)
    if (!digitMatch) { skipped.push(`Q${qNum} (no valid 1-4 answer found in "${aRaw}")`); continue }
    key[qNum] = digitMatch[0]
  }
  return { key, skipped, rowCount: rows.length }
}

// Per-subject question count + syllabus, with an include/exclude toggle so
// a Physics+Chemistry-only paper (or a Biology-only one) doesn't need the
// admin to know that typing "0" into a count field is how you'd do that —
// unchecking a subject visibly greys it out and zeroes its count, and
// re-checking restores a sensible default. Shared between the Add and Edit
// forms, which are otherwise identical, so the two can't drift apart.
function SubjectCountFields({ form, setForm }) {
  const [quickFill, setQuickFill] = useState('')

  function toggleSubject(s, include) {
    setForm(f => ({ ...f, [`${s}_count`]: include ? 45 : 0 }))
  }

  function applyQuickFill() {
    const n = Number(quickFill)
    if (!n || n < 1) { toast.error('Enter a valid question count first'); return }
    setForm(f => {
      const next = { ...f }
      for (const s of SUBJECTS) if (Number(f[`${s}_count`]) > 0) next[`${s}_count`] = n
      return next
    })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Quick fill</label>
          <input type="number" min={1} className="form-control" style={{ width: '110px' }} placeholder="e.g. 40"
            value={quickFill} onChange={e => setQuickFill(e.target.value)} />
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={applyQuickFill}>Apply to all included sections</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {SUBJECTS.map(s => {
          const included = Number(form[`${s}_count`]) > 0
          return (
            <div key={s} className="form-group" style={{ margin: 0, opacity: included ? 1 : 0.55, transition: 'opacity 0.15s' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={included} onChange={e => toggleSubject(s, e.target.checked)} />
                {SUBJECT_LABELS[s]}
              </label>
              <input type="number" min={1} className="form-control" style={{ marginBottom: '0.5rem', marginTop: '0.4rem' }}
                value={form[`${s}_count`]} disabled={!included}
                onChange={e => setForm(f => ({ ...f, [`${s}_count`]: e.target.value }))} placeholder="Question count" />
              <textarea className="form-control" rows={3} placeholder={`${SUBJECT_LABELS[s]} syllabus`}
                value={form[`syllabus_${s}`]} disabled={!included}
                onChange={e => setForm(f => ({ ...f, [`syllabus_${s}`]: e.target.value }))} />
            </div>
          )
        })}
      </div>
    </>
  )
}

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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_FORM)
  const [editSaving, setEditSaving] = useState(false)
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

  async function handleKeyFileUpload(paper, e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const buf = await file.arrayBuffer()
    let parsed
    try {
      parsed = parseKeyFile(buf, totalQuestions(paper))
    } catch (err) {
      toast.error('Could not read that file: ' + err.message)
      return
    }
    if (Object.keys(parsed.key).length === 0) {
      toast.error(`No valid answers found. Expected columns "Q No" and "Answer" — found: ${parsed.rowCount ? 'unrecognized headers' : 'empty sheet'}`, { duration: 8000 })
      return
    }
    clearTimeout(saveTimers.current[paper.id]) // an upload supersedes any pending tap-entry save
    const mergedKey = { ...(paper.answer_key || {}), ...parsed.key }
    setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, answer_key: mergedKey } : p))
    setSavingKey(true)
    const { error } = await supabase.from('practice_papers').update({ answer_key: mergedKey }).eq('id', paper.id)
    setSavingKey(false)
    if (error) { toast.error(error.message); return }
    const parts = [`Uploaded ${Object.keys(parsed.key).length} answers.`]
    if (parsed.skipped.length) parts.push(`Skipped ${parsed.skipped.length} invalid row(s): ${parsed.skipped.slice(0, 5).join(', ')}${parsed.skipped.length > 5 ? '…' : ''}`)
    toast.success(parts.join(' '), { duration: 8000 })
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

  function openEdit(paper) {
    setEditForm({
      name: paper.name,
      physics_count: paper.physics_count, chemistry_count: paper.chemistry_count,
      botany_count: paper.botany_count, zoology_count: paper.zoology_count,
      syllabus_physics: paper.syllabus_physics || '', syllabus_chemistry: paper.syllabus_chemistry || '',
      syllabus_botany: paper.syllabus_botany || '', syllabus_zoology: paper.syllabus_zoology || '',
    })
    setEditingId(paper.id)
    if (expandedId !== paper.id) { setExpandedId(paper.id); if (!submissions[paper.id]) loadSubmissions(paper.id) }
  }

  async function handleEditSave(paper) {
    if (!editForm.name.trim()) { toast.error('Paper name is required'); return }
    const countChanged = SUBJECTS.some(s => Number(editForm[`${s}_count`]) !== paper[`${s}_count`])
    if (countChanged && Object.keys(paper.answer_key || {}).length > 0) {
      const ok = window.confirm('Changing question counts shifts question numbering for later subjects, which would misalign the existing answer key. The answer key will be cleared — you\'ll need to re-enter it. Continue?')
      if (!ok) return
    }
    setEditSaving(true)
    try {
      const record = {
        name: editForm.name.trim(),
        physics_count: Number(editForm.physics_count) || 0,
        chemistry_count: Number(editForm.chemistry_count) || 0,
        botany_count: Number(editForm.botany_count) || 0,
        zoology_count: Number(editForm.zoology_count) || 0,
        syllabus_physics: editForm.syllabus_physics,
        syllabus_chemistry: editForm.syllabus_chemistry,
        syllabus_botany: editForm.syllabus_botany,
        syllabus_zoology: editForm.syllabus_zoology,
        ...(countChanged ? { answer_key: {} } : {}),
      }
      const { error } = await supabase.from('practice_papers').update(record).eq('id', paper.id)
      if (error) throw error
      toast.success('Paper updated!')
      setEditingId(null)
      loadPapers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditSaving(false)
    }
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
              <div style={{ marginTop: '1rem' }}>
                <SubjectCountFields form={form} setForm={setForm} />
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
                      <button className="btn btn-outline btn-sm" title="Edit paper" onClick={() => openEdit(paper)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => openPaper(paper)}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isOpen && editingId === paper.id && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--gray-100)', background: '#fffbeb' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600 }}>Paper Name *</label>
                        <input className="form-control" value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <SubjectCountFields form={editForm} setForm={setEditForm} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button className="btn btn-primary btn-sm" disabled={editSaving} onClick={() => handleEditSave(paper)}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {isOpen && editingId !== paper.id && (
                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0 0.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Answer Key {savingKey && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(saving…)</span>}</h3>
                        <label className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0 }}>
                          <Upload size={14} /> Upload Key (Excel)
                          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleKeyFileUpload(paper, e)} />
                        </label>
                      </div>
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
