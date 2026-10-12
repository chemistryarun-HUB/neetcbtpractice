import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, Download, Pencil, Images } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import ImageButton from '../../components/shared/ImageButton'
import AdminGsebPartB from './AdminGsebPartB'
import { supabase } from '../../lib/supabase'
import { uploadQuestionImage } from '../../lib/storage'
import { correctOptionKey, resolveCorrectOptionValue } from '../../lib/questionOptions'
import { chaptersOf, paperTitle, parseGsebQuestionsFile, publishProblems } from '../../lib/gseb'

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

const LETTERS = ['A', 'B', 'C', 'D']
const TEXT_FIELDS = ['question', 'option1', 'option2', 'option3', 'option4', 'explanation']

// Blank workbook with the exact headers parseGsebQuestionsFile() looks for,
// pre-numbered 1..mcqCount so the typist only fills cells.
function downloadTemplate(paper) {
  const rows = Array.from({ length: paper.mcq_count }, (_, i) => ({
    'Q No': i + 1, 'Question': '', 'Option A': '', 'Option B': '', 'Option C': '', 'Option D': '',
    'Answer': '', 'Chapter No': '', 'Explanation': '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const chapters = chaptersOf(paper.subject).map(c => ({ 'Chapter No': c.id, 'Chapter': c.name }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questions')
  // Part B: one row per printed question. "Choice rule" only needs filling on
  // one row per section, e.g. "Any 8 of Q1-12".
  const partB = [{ 'Section': 'A', 'Q No': 1, 'Question': '', 'Marks': 2, 'Chapter No': '', 'Model Answer': '', 'Choice rule': 'Any 8 of Q1-12' }]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partB), 'Part B')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chapters), 'Chapters')
  XLSX.writeFile(wb, `GSEB_${paper.subject}_${paper.year}_${paper.medium}${paper.set_no ? `_set${paper.set_no}` : ''}.xlsx`)
}

export default function AdminGsebPaper() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [subjective, setSubjective] = useState([])
  const [part, setPart] = useState('A')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { load() }, [paperId])

  async function load() {
    setLoading(true)
    const [{ data: p, error }, { data: qs }, { data: sub }] = await Promise.all([
      supabase.from('gseb_papers').select('*').eq('id', paperId).single(),
      supabase.from('gseb_questions').select('*').eq('paper_id', paperId).order('q_no'),
      supabase.from('gseb_subjective').select('*').eq('paper_id', paperId).order('q_no'),
    ])
    if (error) toast.error(error.message)
    setPaper(p || null)
    setQuestions(qs || [])
    setSubjective(sub || [])
    setLoading(false)
  }

  async function updatePaper(fields) {
    const { error } = await supabase.from('gseb_papers').update(fields).eq('id', paper.id)
    if (error) { toast.error(error.message); return false }
    setPaper(p => ({ ...p, ...fields }))
    return true
  }

  async function updateQuestion(q, fields) {
    const { error } = await supabase.from('gseb_questions').update(fields).eq('id', q.id)
    if (error) { toast.error(error.message); return false }
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...fields } : x))
    return true
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    let parsed
    try {
      parsed = parseGsebQuestionsFile(await file.arrayBuffer(), paper.mcq_count)
    } catch (err) {
      toast.error('Could not read that file: ' + err.message)
      return
    }
    const partB = parsed.partB
    if (parsed.questions.length === 0 && partB.questions.length === 0) {
      toast.error('No questions found. Part A needs "Q No", "Question" and "Option A" columns, Part B needs "Q No", "Question" and "Marks". Use Download Template.', { duration: 8000 })
      return
    }
    const existing = (parsed.questions.length && questions.length) || (partB.questions.length && subjective.length)
    if (existing && !window.confirm(`Overwrite ${parsed.questions.length} MCQ(s) and ${partB.questions.length} Part B question(s) with this file? Images already attached are kept.`)) return
    setUploading(true)
    // Upsert on (paper_id, q_no): image columns are not in the payload, so a
    // re-upload to fix a typo never wipes images attached in this screen.
    const results = await Promise.all([
      parsed.questions.length && supabase.from('gseb_questions')
        .upsert(parsed.questions.map(q => ({ ...q, paper_id: paper.id })), { onConflict: 'paper_id,q_no' }),
      partB.questions.length && supabase.from('gseb_subjective')
        .upsert(partB.questions.map(q => ({ ...q, paper_id: paper.id })), { onConflict: 'paper_id,q_no' }),
      partB.questions.length && supabase.from('gseb_papers').update({ part_b_rules: partB.rules }).eq('id', paper.id),
    ])
    setUploading(false)
    const failed = results.find(r => r && r.error)
    if (failed) { toast.error(failed.error.message); return }
    const parts = [`Saved ${parsed.questions.length} MCQ(s) and ${partB.questions.length} Part B question(s).`]
    const skipped = [...parsed.skipped, ...partB.skipped]
    if (skipped.length) parts.push(`Skipped ${skipped.length}: ${skipped.slice(0, 4).join('; ')}${skipped.length > 4 ? '…' : ''}`)
    toast.success(parts.join(' '), { duration: 8000 })
    load()
  }

  async function setAnswer(q, n) {
    const texts = [q.option1, q.option2, q.option3, q.option4]
    await updateQuestion(q, { correct_option: resolveCorrectOptionValue(`option${n}`, texts) })
  }

  // Many diagrams at once, matched to questions by file name: a name ending
  // in A7 / _A7 goes on Part A Q7, B14 on Part B Q14 (e.g. p4_A19.png).
  async function handleImages(e) {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    let done = 0
    const unmatched = []
    for (const file of files) {
      const m = file.name.match(/([AB])\s*(\d+)\.(png|jpe?g|webp|gif)$/i)
      const part = m?.[1].toUpperCase()
      const qNo = m ? Number(m[2]) : null
      const target = part === 'A' ? questions.find(q => q.q_no === qNo) : part === 'B' ? subjective.find(q => q.q_no === qNo) : null
      if (!target) { unmatched.push(file.name); continue }
      try {
        const url = await uploadQuestionImage(file)
        const table = part === 'A' ? 'gseb_questions' : 'gseb_subjective'
        const { error } = await supabase.from(table).update({ question_image: url }).eq('id', target.id)
        if (error) throw error
        done++
      } catch (err) {
        unmatched.push(`${file.name} (${err.message})`)
      }
    }
    setUploading(false)
    const parts = [`Attached ${done} image(s).`]
    if (unmatched.length) parts.push(`Not attached: ${unmatched.slice(0, 5).join(', ')}${unmatched.length > 5 ? '…' : ''}. Name files like A7.png or B14.png.`)
    toast[unmatched.length ? 'error' : 'success'](parts.join(' '), { duration: 10000 })
    load()
  }

  async function attachImage(q, field, file) {
    try {
      const url = await uploadQuestionImage(file)
      if (await updateQuestion(q, { [field]: url })) toast.success('Image attached')
    } catch (err) {
      toast.error(err.message)
    }
  }

  function startEdit(q) {
    setEditingId(q.id)
    setEditForm(Object.fromEntries(TEXT_FIELDS.map(f => [f, q[f] || ''])))
  }

  async function saveEdit(q) {
    // Keep the same option marked correct even if its text was just edited.
    const key = correctOptionKey(q)
    const texts = [editForm.option1, editForm.option2, editForm.option3, editForm.option4]
    const fields = {
      ...editForm,
      explanation: editForm.explanation || null,
      correct_option: key ? resolveCorrectOptionValue(key, texts) : '',
    }
    if (await updateQuestion(q, fields)) setEditingId(null)
  }

  async function togglePublish() {
    if (!paper.is_published) {
      const problems = publishProblems(paper, questions)
      if (problems.length) { toast.error(`Can't publish yet. ${problems.join('. ')}`, { duration: 10000 }); return }
    }
    if (await updatePaper({ is_published: !paper.is_published })) {
      toast.success(paper.is_published ? 'Hidden from students' : 'Published to students')
    }
  }

  async function deletePaper() {
    if (!window.confirm('Delete this paper and all its questions? This cannot be undone.')) return
    const { error } = await supabase.from('gseb_papers').delete().eq('id', paper.id)
    if (error) { toast.error(error.message); return }
    toast.success('Paper deleted')
    navigate('/admin/gseb', { replace: true })
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!paper) return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content"><div className="empty-state">Paper not found. <Link to="/admin/gseb">Back to GSEB papers</Link></div></div>
    </div>
  )

  const chapters = chaptersOf(paper.subject)
  const keyed = questions.filter(q => q.correct_option).length
  const problems = publishProblems(paper, questions)

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <Link to="/admin/gseb" className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> All GSEB papers
        </Link>

        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>{paperTitle(paper)}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              {questions.length}/{paper.mcq_count} MCQs · {keyed} keyed · {subjective.length} Part B · {paper.duration_min} min ·{' '}
              <span className={`badge ${paper.is_published ? 'badge-green' : 'badge-locked'}`}>{paper.is_published ? 'Published' : 'Draft'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate(paper)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Download size={15} /> Download Template
            </button>
            <label className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Excel'}
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
            </label>
            <label className="btn btn-ghost btn-sm" title="Select many images; A7.png goes on MCQ 7, B14.png on Part B Q14"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <Images size={15} /> Upload Diagrams
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} disabled={uploading} />
            </label>
            <select className="form-control" style={{ width: 'auto' }} value={paper.key_status}
              onChange={e => updatePaper({ key_status: e.target.value })}>
              <option value="provisional">Key: Provisional</option>
              <option value="final">Key: Final</option>
            </select>
            <button className={`btn btn-sm ${paper.is_published ? 'btn-ghost' : 'btn-primary'}`} onClick={togglePublish}>
              {paper.is_published ? 'Unpublish' : 'Publish'}
            </button>
            {!paper.is_published && <button className="btn btn-danger btn-sm" onClick={deletePaper}>Delete</button>}
          </div>
        </div>

        {!paper.is_published && questions.length > 0 && problems.length > 0 && (
          <div className="card card-body" style={{ marginBottom: '1rem', background: '#fffbeb', borderColor: '#fde68a', fontSize: '0.875rem' }}>
            <strong>Before publishing:</strong> {problems.join('. ')}.
          </div>
        )}

        <div className="tabs">
          <button className={`tab-btn ${part === 'A' ? 'active' : ''}`} onClick={() => setPart('A')}>Part A · MCQ ({questions.length})</button>
          <button className={`tab-btn ${part === 'B' ? 'active' : ''}`} onClick={() => setPart('B')}>Part B · Subjective ({subjective.length})</button>
        </div>

        {part === 'B' ? (
          <AdminGsebPartB paper={paper} questions={subjective} setQuestions={setSubjective} />
        ) : questions.length === 0 ? (
          <div className="empty-state">
            No questions yet. Download the template, fill in the {paper.mcq_count} questions, then Upload Excel.
            Formulas and diagrams can be attached as images per question after uploading.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map(q => {
              const key = correctOptionKey(q)
              const editing = editingId === q.id
              return (
                <div key={q.id} className="card card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <strong>Q{q.q_no}</strong>
                    <div style={{ display: 'inline-flex', gap: '0.25rem' }} title="Correct answer">
                      {LETTERS.map((l, i) => (
                        <button key={l} className={`btn btn-sm ${key === `option${i + 1}` ? 'btn-success' : 'btn-ghost'}`}
                          style={{ minWidth: '2.25rem' }} onClick={() => setAnswer(q, i + 1)}>{l}</button>
                      ))}
                    </div>
                    <select className="form-control" style={{ width: 'auto', maxWidth: '100%' }} value={q.chapter_no || ''}
                      onChange={e => updateQuestion(q, { chapter_no: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">Chapter: not set</option>
                      {chapters.map(c => <option key={c.id} value={c.id}>{c.id}. {c.name}</option>)}
                    </select>
                    {!editing && (
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(q)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Pencil size={14} /> Edit text
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {TEXT_FIELDS.map(f => (
                        <div key={f} className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {f === 'question' ? 'Question' : f === 'explanation' ? 'Explanation (optional)' : `Option ${LETTERS[Number(f.slice(-1)) - 1]}`}
                          </label>
                          <textarea className="form-control" rows={f === 'question' || f === 'explanation' ? 3 : 1}
                            value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(q)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <QuestionView q={q} mode="admin" size="compact" />
                      {q.explanation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    <ImageButton label="Question image" onFile={f => attachImage(q, 'question_image', f)} />
                    {LETTERS.map((l, i) => (
                      <ImageButton key={l} label={`Option ${l}`} onFile={f => attachImage(q, `option${i + 1}_image`, f)} />
                    ))}
                    {q.question_image && (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuestion(q, { question_image: null })}>Remove question image</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
