import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Upload, Plus, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { UNIT_11_LEVELS } from '../../lib/constants'

const SHEET_NAME = 'd_f_Block_Elements'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(val) {
  return val && UUID_RE.test(val) ? val : null
}

const BLANK = {
  qid: '',
  question_type: 'MCQ',
  chapter_name: '',
  topic: '',
  level: 1,
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correct_option: '',   // stores actual answer text
  correct_option_label: 'Option 1',  // stores "Option 1"/"Option 2"/... for the form UI
  difficulty_level: 'Medium',
  question_tag: '',
  source: '',
}

// Maps exact Excel "Topic" column values to level numbers
function topicToLevel(topic) {
  const t = (topic || '').trim()
  if (t === 'Transition Elements: General Introduction, Electronic Configuration, Occurrence and Characteristics') return 1
  if (t === 'Transition Elements: General Trends in Properties') return 2
  if (t === 'Transition Elements: Oxides and Oxoanions of Metals') return 3
  if (t === 'Preparation, Properties and Uses of KMnO₄') return 4
  if (t === 'Preparation, Properties and Uses of K₂Cr₂O₇') return 5
  if (t === 'Lanthanoids: Electronic Configuration, Oxidation States and Lanthanoid Contraction') return 6
  if (t === 'Actinoids: Electronic Configuration and Oxidation States') return 7
  if (t === 'Miscellaneous') return 8
  // Fallback contains-based matching for slight variations
  const l = t.toLowerCase()
  if (l.includes('general introduction')) return 1
  if (l.includes('general trends')) return 2
  if (l.includes('oxides and oxoanions')) return 3
  if (l.includes('kmno') || l.includes('permanganate')) return 4
  if (l.includes('k2cr2o7') || l.includes('k₂cr₂o₇') || l.includes('dichromate')) return 5
  if (l.includes('lanthanoid')) return 6
  if (l.includes('actinoid')) return 7
  if (l.includes('miscellaneous')) return 8
  return 9 // unknown/mixed topics → level 9 (Complete Chapter Test)
}

// Resolve "Option 1"/"Option 2"/... to the actual option text
function resolveCorrectOption(label, option1, option2, option3, option4) {
  const map = {
    'option 1': option1,
    'option 2': option2,
    'option 3': option3,
    'option 4': option4,
  }
  return map[(label || '').trim().toLowerCase()] || label || ''
}

const PAGE_SIZE = 50

export default function QuestionUploader({ uploadedBy }) {
  const [tab, setTab] = useState('list')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [page, setPage] = useState(1)

  async function loadQuestions() {
    setLoading(true)
    let q = supabase.from('questions').select('*').order('qid', { ascending: true })
    if (levelFilter) q = q.eq('level', levelFilter)
    const { data } = await q
    setQuestions(data || [])
    setLoading(false)
  }

  useEffect(() => { loadQuestions() }, [levelFilter])

  async function handleManualSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Resolve "Option 1"/"Option 2"/... label to actual text
      const resolvedCorrect = resolveCorrectOption(
        form.correct_option_label, form.option1, form.option2, form.option3, form.option4
      )
      const record = {
        qid:             form.qid,
        question_type:   form.question_type,
        subject:         'Chemistry',
        unit:            'Unit 11 - d and f Block Elements',
        chapter_name:    form.chapter_name,
        topic:           form.topic,
        level:           topicToLevel(form.topic),
        question:        form.question,
        option1:         form.option1,
        option2:         form.option2,
        option3:         form.option3,
        option4:         form.option4,
        correct_option:  resolvedCorrect,
        difficulty_level: form.difficulty_level,
        question_tag:    form.question_tag,
        source:          form.source,
        uploaded_by:     toUuidOrNull(uploadedBy),
      }
      const { error } = await supabase.from('questions').insert([record])
      if (error) throw error
      toast.success('Question added!')
      setForm(BLANK)
      loadQuestions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })

        // Try the exact sheet name first, fall back to first sheet
        const sheetName = wb.SheetNames.includes(SHEET_NAME)
          ? SHEET_NAME
          : wb.SheetNames[0]

        if (!wb.SheetNames.includes(SHEET_NAME)) {
          toast(`Sheet "${SHEET_NAME}" not found — reading "${sheetName}" instead`, { icon: '⚠️' })
        }

        const ws = wb.Sheets[sheetName]
        // Normalize headers: trim whitespace from all column names to handle extra spaces in Excel
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const rows = rawRows.map(r => {
          const norm = {}
          for (const [k, v] of Object.entries(r)) norm[k.trim()] = v
          return norm
        })

        const records = []
        const skipped = []

        for (const r of rows) {
          const qid      = String(r['Q ID']).trim()
          const question = String(r['Question']).trim()

          if (!qid || !question) { skipped.push(qid || '(no Q ID)'); continue }

          const option1  = String(r['Option 1']).trim()
          const option2  = String(r['Option 2']).trim()
          const option3  = String(r['Option 3']).trim()
          const option4  = String(r['Option 4']).trim()
          const topic    = String(r['Topic']).trim()

          // "Correct Option" value is "Option 1"/"Option 2"/etc — resolve to actual text
          const correctLabel  = String(r['Correct Option']).trim()
          const correct_option = resolveCorrectOption(correctLabel, option1, option2, option3, option4)

          records.push({
            qid,
            question_type:   String(r['Question Type']).trim() || 'MCQ',
            subject:         'Chemistry',
            unit:            'Unit 11 - d and f Block Elements',
            chapter_name:    String(r['Chapter Name']).trim(),
            topic,
            level:           topicToLevel(topic),
            question,
            option1,
            option2,
            option3,
            option4,
            correct_option,
            difficulty_level: String(r['Difficulty Level']).trim() || 'Medium',
            question_tag:    String(r['Question Tag']).trim(),
            source:          String(r['Source']).trim(),
            uploaded_by:     toUuidOrNull(uploadedBy),
          })
        }

        if (records.length === 0) {
          toast.error('No valid rows found. Make sure sheet is "d_f_Block_Elements" and column names match exactly.')
          return
        }

        // Upsert in batches of 500 to avoid payload limits
        const BATCH = 500
        for (let i = 0; i < records.length; i += BATCH) {
          const { error } = await supabase
            .from('questions')
            .upsert(records.slice(i, i + BATCH), { onConflict: 'qid' })
          if (error) throw error
        }

        const msg = skipped.length
          ? `${records.length} uploaded, ${skipped.length} skipped (missing Q ID or Question).`
          : `${records.length} questions uploaded successfully!`
        toast.success(msg)
        loadQuestions()
      } catch (err) {
        toast.error(err.message)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function handleExcelUpdate(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const sheetName = wb.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : wb.SheetNames[0]
        if (!wb.SheetNames.includes(SHEET_NAME)) {
          toast(`Sheet "${SHEET_NAME}" not found — reading "${sheetName}" instead`, { icon: '⚠️' })
        }
        const ws = wb.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const rows = rawRows.map(r => {
          const norm = {}
          for (const [k, v] of Object.entries(r)) norm[k.trim()] = v
          return norm
        })

        // Build list of {qid, patch} — only updatable fields, no insert-only fields
        const updates = []
        for (const r of rows) {
          const qid = String(r['Q ID'] || '').trim()
          if (!qid) continue
          const option1 = String(r['Option 1'] || '').trim()
          const option2 = String(r['Option 2'] || '').trim()
          const option3 = String(r['Option 3'] || '').trim()
          const option4 = String(r['Option 4'] || '').trim()
          const topic   = String(r['Topic'] || '').trim()
          const correctLabel = String(r['Correct Option'] || '').trim()
          const correct_option = resolveCorrectOption(correctLabel, option1, option2, option3, option4)

          const patch = {}
          const question = String(r['Question'] || '').trim()
          if (question)      patch.question       = question
          if (option1)       patch.option1        = option1
          if (option2)       patch.option2        = option2
          if (option3)       patch.option3        = option3
          if (option4)       patch.option4        = option4
          if (correct_option) patch.correct_option = correct_option
          if (topic)         { patch.topic = topic; patch.level = topicToLevel(topic) }
          const diff = String(r['Difficulty Level'] || '').trim()
          if (diff)          patch.difficulty_level = diff
          const tag = String(r['Question Tag'] || '').trim()
          if (tag !== undefined) patch.question_tag = tag || null
          const src = String(r['Source'] || '').trim()
          if (src)           patch.source = src

          if (Object.keys(patch).length > 0) updates.push({ qid, patch })
        }

        if (updates.length === 0) {
          toast.error('No updatable rows found.')
          return
        }

        let updated = 0
        let notFound = 0
        // Process in batches of 50 (each update is a separate DB call)
        for (const { qid, patch } of updates) {
          const { data, error } = await supabase
            .from('questions')
            .update(patch)
            .eq('qid', qid)
            .select('id')
          if (error) throw error
          if (data && data.length > 0) updated++
          else notFound++
        }

        toast.success(`${updated} questions updated, ${notFound} not found (QID mismatch).`)
        loadQuestions()
      } catch (err) {
        toast.error(err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted')
    loadQuestions()
  }

  async function clearAllQuestions() {
    if (!confirm('DELETE ALL questions from the database? This cannot be undone.')) return
    if (!confirm('Are you sure? This will remove every question permanently.')) return
    const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) { toast.error(error.message); return }
    toast.success('All questions deleted')
    loadQuestions()
  }

  const filtered = questions.filter(q =>
    (q.question || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.qid || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.question_tag || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.topic || '').toLowerCase().includes(search.toLowerCase())
  )

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1) }, [search, levelFilter])

  // Auto-expand when search narrows to exactly 1 result
  useEffect(() => {
    if (filtered.length === 1) setExpandedId(filtered[0].id)
    else setExpandedId(prev => (filtered.find(q => q.id === prev) ? prev : null))
  }, [filtered.length, search])

  // When searching, show all results; otherwise paginate
  const isSearching = search.trim() !== '' || levelFilter !== ''
  const visibleQuestions = isSearching ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Question List</button>
        <button className={`tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Add Manually</button>
        <button className={`tab-btn ${tab === 'excel' ? 'active' : ''}`} onClick={() => setTab('excel')}>Upload Excel</button>
        <button className={`tab-btn ${tab === 'update' ? 'active' : ''}`} onClick={() => setTab('update')}>Update Questions</button>
      </div>

      {/* ── LIST ── */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <Search size={16} />
              <input
                className="form-control"
                style={{ border: 'none', boxShadow: 'none', padding: '0' }}
                placeholder="Search by Q ID, question, tag or topic…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="">All Levels</option>
              {UNIT_11_LEVELS.map(l => <option key={l.id} value={l.id}>Level {l.id}: {l.name}</option>)}
            </select>
            <span className="text-muted">{filtered.length} questions</span>
            {questions.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={clearAllQuestions} style={{ whiteSpace: 'nowrap' }}>
                Clear All
              </button>
            )}
          </div>

          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Q ID</th>
                    <th>Topic</th>
                    <th style={{ width: '64px', textAlign: 'center' }}>Lvl</th>
                    <th>Question</th>
                    <th style={{ width: '80px' }}>Difficulty</th>
                    <th>Tag</th>
                    <th style={{ width: '96px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuestions.map(q => {
                    const isOpen = expandedId === q.id
                    const opts = [q.option1, q.option2, q.option3, q.option4]
                    return (
                      <>
                        <tr key={q.id} style={{ cursor: 'pointer', background: isOpen ? 'var(--primary-light, #eff6ff)' : undefined }}
                            onClick={() => setExpandedId(isOpen ? null : q.id)}>
                          <td><code style={{ fontSize: '0.75rem' }}>{q.qid}</code></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.topic}</td>
                          <td style={{ textAlign: 'center' }}>{q.level}</td>
                          <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{q.question}</td>
                          <td>
                            <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{q.question_tag}</td>
                          <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => setExpandedId(isOpen ? null : q.id)}
                            >
                              {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {isOpen ? 'Close' : 'View'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id)}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${q.id}-detail`}>
                            <td colSpan={7} style={{ padding: '0', borderTop: 'none' }}>
                              <div style={{ padding: '1rem 1.25rem', background: '#f8faff', borderTop: '2px solid var(--primary, #3b82f6)', borderBottom: '1px solid var(--gray-200)' }}>
                                {/* Meta */}
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                  <code style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{q.qid}</code>
                                  <span>{q.question_type}</span>
                                  <span>Level {q.level}</span>
                                  <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                                  {q.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{q.question_tag}</span>}
                                  {q.source && <span>Source: {q.source}</span>}
                                  <span style={{ color: 'var(--gray-400)' }}>{q.topic}</span>
                                </div>

                                {/* Question text */}
                                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--gray-800)', whiteSpace: 'pre-wrap', marginBottom: '0.875rem', lineHeight: 1.6 }}>
                                  {q.question}
                                </div>

                                {/* Options */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {opts.map((opt, i) => {
                                    const isCorrect = opt === q.correct_option
                                    return (
                                      <div key={i} style={{
                                        padding: '0.45rem 0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                        fontWeight: isCorrect ? 700 : 400,
                                        background: isCorrect ? '#dcfce7' : 'var(--gray-100)',
                                        color: isCorrect ? '#15803d' : 'var(--gray-700)',
                                        border: isCorrect ? '1.5px solid #86efac' : '1px solid transparent',
                                      }}>
                                        {String.fromCharCode(65 + i)}. {opt}{isCorrect ? ' ✓' : ''}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && <div className="empty-state">No questions found</div>}
            {!isSearching && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span style={{ color: 'var(--gray-500)' }}>Page {page} of {totalPages} · {filtered.length} total</span>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
            )}
            {isSearching && filtered.length > 0 && (
              <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} — all shown
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL ── */}
      {tab === 'manual' && (
        <div className="card card-body">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Add Question Manually</h3>
          <form onSubmit={handleManualSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Q ID *</label>
                <input className="form-control" value={form.qid} onChange={e => setForm(f => ({ ...f, qid: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Question Type</label>
                <input className="form-control" value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))} placeholder="MCQ" />
              </div>
              <div className="form-group">
                <label>Chapter Name</label>
                <input className="form-control" value={form.chapter_name} onChange={e => setForm(f => ({ ...f, chapter_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Topic *</label>
                <select className="form-control" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} required>
                  <option value="">Select topic</option>
                  {UNIT_11_LEVELS.filter(l => l.id < 9).map(l => (
                    <option key={l.id} value={l.name}>{l.name} (Level {l.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Question *</label>
              <textarea className="form-control" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required rows={3} />
            </div>

            <div className="grid-2">
              {['option1', 'option2', 'option3', 'option4'].map((opt, i) => (
                <div className="form-group" key={opt}>
                  <label>Option {i + 1} *</label>
                  <input className="form-control" value={form[opt]} onChange={e => setForm(f => ({ ...f, [opt]: e.target.value }))} required />
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Correct Option *</label>
                <select
                  className="form-control"
                  value={form.correct_option_label}
                  onChange={e => setForm(f => ({ ...f, correct_option_label: e.target.value }))}
                  required
                >
                  {['Option 1', 'Option 2', 'Option 3', 'Option 4'].map((label, i) => {
                    const opts = [form.option1, form.option2, form.option3, form.option4]
                    return (
                      <option key={label} value={label}>
                        {label}{opts[i] ? ` — ${opts[i]}` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty Level</label>
                <select className="form-control" value={form.difficulty_level} onChange={e => setForm(f => ({ ...f, difficulty_level: e.target.value }))}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Question Tag</label>
                <input className="form-control" value={form.question_tag} onChange={e => setForm(f => ({ ...f, question_tag: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Source</label>
                <input className="form-control" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Plus size={16} /> {submitting ? 'Adding...' : 'Add Question'}
            </button>
          </form>
        </div>
      )}

      {/* ── EXCEL ── */}
      {tab === 'excel' && (
        <div className="card card-body">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Upload Questions via Excel</h3>
          <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
            Column names must match exactly. <strong>Subject, Unit and Level are auto-filled</strong> — no need to include them.
          </p>

          <div style={{ background: 'var(--primary-light)', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--primary-dark)', lineHeight: 1.8 }}>
            <strong>Sheet name expected:</strong> <code>d_f_Block_Elements</code> (falls back to first sheet if not found)<br />
            <strong>"Correct Option" values:</strong> must be exactly <code>Option 1</code>, <code>Option 2</code>, <code>Option 3</code>, or <code>Option 4</code><br />
            <strong>Topic → Level (keyword match, case-insensitive):</strong><br />
            "General Introduction" → 1 &nbsp;·&nbsp; "General Trends" → 2 &nbsp;·&nbsp; "Oxides" → 3<br />
            "KMnO4" / "Potassium Permanganate" → 4 &nbsp;·&nbsp; "K2Cr2O7" / "Dichromate" → 5<br />
            "Lanthanoid" → 6 &nbsp;·&nbsp; "Actinoid" → 7 &nbsp;·&nbsp; "Miscellaneous" → 8 &nbsp;·&nbsp; anything else → 1
          </div>

          <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Choose Excel File (.xlsx / .xls / .csv)
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
          </label>

          <div className="card" style={{ marginTop: '1.5rem', background: 'var(--gray-50)' }}>
            <div className="card-header">Required Column Names (exact)</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {['Q ID', 'Question Type', 'Chapter Name', 'Topic', 'Question',
                      'Option 1', 'Option 2', 'Option 3', 'Option 4',
                      'Correct Option', 'Difficulty Level', 'Question Tag', 'Source'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Q001</td>
                    <td>MCQ</td>
                    <td>d and f Block Elements</td>
                    <td>General Introduction</td>
                    <td>Which element is a transition metal?</td>
                    <td>Fe</td>
                    <td>Na</td>
                    <td>Mg</td>
                    <td>Al</td>
                    <td>Option 1</td>
                    <td>Easy</td>
                    <td>Transition Elements</td>
                    <td>NCERT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE ── */}
      {tab === 'update' && (
        <div className="card card-body">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Update Existing Questions via Excel</h3>
          <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
            Matches rows by <strong>Q ID</strong>. Only updates the fields present in the file — does not delete or re-insert any question. Student attempt history is fully preserved.
          </p>

          <div style={{ background: '#fefce8', border: '1.5px solid #d97706', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.8 }}>
            <strong>Fields that will be updated</strong> (if present in the Excel):<br />
            Question text · Option 1–4 · Correct Option · Topic → Level · Difficulty Level · Question Tag · Source<br />
            <strong>Fields that will NOT be changed:</strong> Q ID · Subject · Unit · Chapter Name · uploaded_by
          </div>

          <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Choose Excel File (.xlsx / .xls)
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcelUpdate} />
          </label>

          <div style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
            Use the same Excel format as Upload. The <code>Q ID</code> column is used as the key to find each question. Rows whose Q ID doesn't exist in the database are counted as "not found" and skipped silently.
          </div>
        </div>
      )}
    </div>
  )
}
