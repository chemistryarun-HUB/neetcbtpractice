import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, Download, Images, Search, Maximize2, Image as ImageIcon, FileDown, Printer, X } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import MathText from '../../components/shared/MathText'
import QuestionReviewer from '../../components/shared/QuestionReviewer'
import { GsebMcqEditPanel, GsebSubjectiveEditPanel } from '../../components/shared/GsebEditPanels'
import GsebPrintSheet from '../../components/shared/GsebPrintSheet'
import { supabase } from '../../lib/supabase'
import { uploadQuestionImage } from '../../lib/storage'
import { correctOptionKey } from '../../lib/questionOptions'
import { chaptersOf, paperTitle, parseGsebQuestionsFile, publishProblems, ruleLabel, gsebQid, GSEB_SUBJECT_LABELS } from '../../lib/gseb'

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

// Rows that still need the teacher: no answer key, or no chapter (which keeps
// the question out of chapter-wise practice and the paper generator).
const needsCheck = (q, part) => !q.chapter_no || (part === 'A' ? !correctOptionKey(q) : false)

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
  const [tab, setTab] = useState('A')            // 'A' | 'B' | 'upload'
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'check' | 'image'
  // Same full-screen reviewer as the NEET question bank, walking whatever
  // the list is currently showing.
  const [reviewIndex, setReviewIndex] = useState(null)
  // Ticked rows (Part A and Part B together) for "Download PDF", and the
  // printable sheet built from them.
  const [selected, setSelected] = useState(() => new Set())
  const [sheet, setSheet] = useState(null) // { mcq, subjective } while the PDF view is open
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetKey, setSheetKey] = useState(true)
  const [sheetQNo, setSheetQNo] = useState(true)

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

  // The reviewer hands back the saved row; patch it into the list in place
  // so the admin keeps their place.
  function patchRow(row) {
    const set = tab === 'B' ? setSubjective : setQuestions
    set(prev => prev.map(x => x.id === row.id ? row : x))
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
  const chapterName = n => chapters.find(c => c.id === n)?.name
  const keyed = questions.filter(q => q.correct_option).length
  const problems = publishProblems(paper, questions)

  const part = tab === 'B' ? 'B' : 'A'
  const rows = part === 'A' ? questions : subjective
  const qidOf = q => gsebQid(paper, part, q.q_no)
  const term = search.trim().toLowerCase()
  const visible = rows.filter(q =>
    (!chapterFilter || String(q.chapter_no || '') === chapterFilter) &&
    (statusFilter === 'all' || (statusFilter === 'check' ? needsCheck(q, part) : !!q.question_image)) &&
    (!term || String(q.q_no) === term || qidOf(q).toLowerCase() === term || (q.question || '').toLowerCase().includes(term)))
  const checkCount = rows.filter(q => needsCheck(q, part)).length
  const tag = q => `${qidOf(q)} · ${part === 'A' ? 'Part A' : 'Part B'} Q${q.q_no}`

  const allVisibleTicked = visible.length > 0 && visible.every(q => selected.has(q.id))
  function toggleRow(id) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }
  function toggleVisible() {
    setSelected(prev => {
      const s = new Set(prev)
      visible.forEach(q => allVisibleTicked ? s.delete(q.id) : s.add(q.id))
      return s
    })
  }
  const pickedA = questions.filter(q => selected.has(q.id))
  const pickedB = subjective.filter(q => selected.has(q.id))

  // With nothing ticked, the PDF holds whatever the list is showing.
  function openSheet() {
    const mcq = selected.size ? pickedA : part === 'A' ? visible : []
    const sub = selected.size ? pickedB : part === 'B' ? visible : []
    setSheetTitle(`${GSEB_SUBJECT_LABELS[paper.subject]} · Selected questions`)
    setSheet({ mcq, subjective: sub })
    setReviewIndex(null)
    window.scrollTo(0, 0)
  }

  function changeTab(t) {
    setTab(t); setSearch(''); setChapterFilter(''); setStatusFilter('all'); setReviewIndex(null)
  }

  const cell = { fontSize: '0.8rem', color: 'var(--gray-500)' }
  const clip = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  if (sheet) {
    // Part B keeps the paper's own sections (A, B, C, D of Part B).
    const sections = [...new Set(sheet.subjective.map(q => q.section || '-'))].sort()
    const groups = sections.map(sec => {
      const items = sheet.subjective.filter(q => (q.section || '-') === sec)
      const marks = items.reduce((t, q) => t + (q.marks || 0), 0)
      return { key: sec, label: `Part B · Section ${sec}`, heading: `Part B · Section ${sec} · Answer the following (${items.length} question${items.length === 1 ? '' : 's'}, ${marks} marks)`, items }
    })
    const totalMarks = sheet.mcq.length + sheet.subjective.reduce((t, q) => t + (q.marks || 0), 0)
    const count = sheet.mcq.length + sheet.subjective.length
    return (
      <div className="dashboard">
        <div className="no-print"><Topbar links={NAV} /></div>
        <div className="page-content">
          <div className="no-print">
            <button className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSheet(null)}>
              <ArrowLeft size={16} /> Back to questions
            </button>
            <div className="card card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                Title on the PDF
                <input className="form-control" value={sheetTitle} onChange={e => setSheetTitle(e.target.value)} style={{ width: 300 }} />
              </label>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={sheetQNo} onChange={e => setSheetQNo(e.target.checked)} /> Show board Q no.
              </label>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={sheetKey} onChange={e => setSheetKey(e.target.checked)} /> Answer key at the end
              </label>
              <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                <Printer size={16} /> Download PDF
              </button>
              <div style={{ flexBasis: '100%', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                {count} question{count === 1 ? '' : 's'}. In the print window choose <strong>Save as PDF</strong> as the printer.
              </div>
            </div>
          </div>
          <GsebPrintSheet
            title={sheetTitle}
            subtitle={`From ${paperTitle(paper)}`}
            meta={[`Questions: ${count}`, `Total marks: ${totalMarks}`]}
            mcq={sheet.mcq}
            groups={groups}
            withKey={sheetKey}
            tag={q => sheetQNo ? <span className="gp-tag">[{sheet.mcq.includes(q) ? 'A' : 'B'}-Q{q.q_no}]</span> : null}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <Link to="/admin/gseb" className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> All GSEB papers
        </Link>

        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>{paperTitle(paper)}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              {questions.length}/{paper.mcq_count} MCQs · {keyed} keyed · {subjective.length} Part B · {paper.duration_min} min ·{' '}
              <span className={`badge ${paper.is_published ? 'badge-green' : 'badge-locked'}`}>{paper.is_published ? 'Published' : 'Draft'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '0.6rem 0.875rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#92400e' }}>
            <span><strong>Before publishing:</strong> {problems.join('. ')}.</span>
          </div>
        )}

        <div className="tabs" style={{ marginBottom: '0.75rem' }}>
          <button className={`tab-btn ${tab === 'A' ? 'active' : ''}`} onClick={() => changeTab('A')}>Part A · MCQ ({questions.length})</button>
          <button className={`tab-btn ${tab === 'B' ? 'active' : ''}`} onClick={() => changeTab('B')}>Part B · Subjective ({subjective.length})</button>
          <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => changeTab('upload')}>Upload Excel</button>
        </div>

        {tab !== 'upload' && reviewIndex != null && visible[reviewIndex] && (
          <QuestionReviewer
            questions={visible}
            index={reviewIndex}
            onIndexChange={setReviewIndex}
            onClose={() => setReviewIndex(null)}
            onSaved={patchRow}
            idOf={tag}
            numberOf={q => q.q_no}
            renderMeta={q => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', opacity: 0.9, minWidth: 0 }}>
                {part === 'B' && <span>Section {q.section} · {q.marks} marks ·</span>}
                <span style={clip}>{q.chapter_no ? `Ch ${q.chapter_no} ${chapterName(q.chapter_no) || ''}` : 'Chapter not set'}</span>
              </div>
            )}
            renderBody={(q, mode) => (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '2rem 2.25rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Q{q.q_no}.{part === 'B' && ` (${q.marks} marks)`} <code style={{ marginLeft: '0.35rem', color: 'var(--primary)' }}>{qidOf(q)}</code>
                </div>
                {part === 'A' ? (
                  <>
                    <QuestionView q={q} mode={mode} size="full" />
                    {mode === 'admin' && q.explanation && (
                      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}><strong>Explanation:</strong> <MathText text={q.explanation} /></div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '1.0625rem', lineHeight: 1.6 }}><MathText text={q.question} /></div>
                    {q.question_image && <img src={q.question_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.75rem' }} />}
                    {mode === 'admin' && (
                      <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                        <strong>Model answer:</strong> {(q.answer && <MathText text={q.answer} />) || <span style={{ color: 'var(--gray-400)' }}>not written yet. Press E to add one.</span>}
                        {q.answer_image && <img src={q.answer_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
                      </div>
                    )}
                  </>
                )}
                {mode === 'student' && (
                  <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                    How a student sees this question. Press <strong>V</strong> to show the {part === 'A' ? 'answer key' : 'model answer'}.
                  </div>
                )}
              </div>
            )}
            renderEdit={props => part === 'A'
              ? <GsebMcqEditPanel {...props} subject={paper.subject} title={tag(props.q)} />
              : <GsebSubjectiveEditPanel {...props} subject={paper.subject} title={tag(props.q)} />}
          />
        )}

        {tab === 'upload' ? (
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 760 }}>
            {[
              { n: 1, title: 'Download the template', text: 'Sheets "Questions" (50 MCQs), "Part B" and "Chapters". Skip this if you already have the filled Excel.',
                action: <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate(paper)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Download size={15} /> Download Template</button> },
              { n: 2, title: 'Upload the Excel', text: 'Saves Part A and Part B together. Uploading again updates the text and keeps images already attached.',
                action: (
                  <label className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Excel'}
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
                  </label>) },
              { n: 3, title: 'Upload diagrams', text: 'Select all images at once. A19.png (or p4_A19.png) goes on MCQ 19, B14.png on Part B Q14.',
                action: (
                  <label className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <Images size={15} /> Upload Diagrams
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} disabled={uploading} />
                  </label>) },
              { n: 4, title: 'Check, then publish', text: 'Open Part A and Part B, review each question full screen (← / → to move, E to edit), then press Publish at the top.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>{step.n}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{step.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: '0.15rem 0 0.5rem' }}>{step.text}</div>
                  {step.action}
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            No {part === 'A' ? 'MCQs' : 'Part B questions'} yet.{' '}
            <button className="btn btn-primary btn-sm" onClick={() => changeTab('upload')}>Upload Excel</button>
          </div>
        ) : (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem 0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                  <Search size={16} />
                  <input className="form-control" style={{ border: 'none', boxShadow: 'none', padding: 0, fontSize: '1rem' }}
                    placeholder="Search by Q ID, Q No or question text…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{visible.length} questions</span>
                {visible.length > 0 && (
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', padding: '0.3rem 0.7rem' }}
                    onClick={() => setReviewIndex(0)} title="Open the first question full screen, then walk the list with ← / →">
                    <Maximize2 size={14} /> Review {visible.length} full screen
                  </button>
                )}
                {visible.length > 0 && (
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', padding: '0.3rem 0.7rem' }}
                    onClick={openSheet} title={selected.size ? 'PDF of the ticked questions (Part A and Part B)' : 'Tick questions first, or get a PDF of everything listed'}>
                    <FileDown size={14} /> {selected.size ? `PDF of ${selected.size} selected` : `PDF of ${visible.length} listed`}
                  </button>
                )}
              </div>
              {selected.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', background: 'var(--primary-light)', borderRadius: 'var(--radius)', padding: '0.35rem 0.7rem', fontSize: '0.8125rem' }}>
                  <strong>{selected.size} selected</strong>
                  <span style={{ color: 'var(--gray-500)' }}>Part A: {pickedA.length} · Part B: {pickedB.length}. You can tick in both tabs, they go in one PDF.</span>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.15rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => setSelected(new Set())}>
                    <X size={12} /> Clear
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-control" style={{ width: '280px', flex: '1 1 240px', maxWidth: '340px' }} value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}>
                  <option value="">All Chapters</option>
                  {chapters.map(c => <option key={c.id} value={c.id}>Ch {c.id} - {c.name} ({rows.filter(q => q.chapter_no === c.id).length})</option>)}
                </select>
                {(chapterFilter || statusFilter !== 'all' || search) && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }} onClick={() => { setChapterFilter(''); setStatusFilter('all'); setSearch('') }}>✕ Reset filters</button>
                )}
                {part === 'B' && (paper.part_b_rules || []).length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {(paper.part_b_rules || []).map(r => `Sec ${r.section}: ${ruleLabel(r)}`).join(' · ')}
                  </span>
                )}
                <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: '190px', flex: '0 0 190px', marginLeft: 'auto', fontWeight: statusFilter !== 'all' ? 700 : 400, color: statusFilter === 'check' ? '#92400e' : undefined }}>
                  <option value="all">All questions</option>
                  <option value="check">Needs check ({checkCount})</option>
                  <option value="image">With diagram</option>
                </select>
              </div>
            </div>

            <div className="table-wrap" style={{ maxHeight: 'max(360px, calc(100vh - 300px))' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '36px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={allVisibleTicked} onChange={toggleVisible} title="Tick all listed" aria-label="Tick all listed" />
                    </th>
                    <th style={{ width: '120px' }}>Q ID</th>
                    {part === 'B' && <th style={{ width: '64px' }}>Section</th>}
                    {part === 'B' && <th style={{ width: '64px' }}>Marks</th>}
                    <th style={{ width: '220px' }}>Chapter</th>
                    <th>Question</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>{part === 'A' ? 'Answer' : 'Model ans.'}</th>
                    <th style={{ width: '64px', textAlign: 'center' }}>Diagram</th>
                    <th style={{ width: '96px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((q, i) => {
                    const key = correctOptionKey(q)
                    const flag = needsCheck(q, part)
                    return (
                      <tr key={q.id} style={{ cursor: 'pointer', background: selected.has(q.id) ? 'var(--primary-light)' : flag ? '#fffbeb' : undefined }}
                        onClick={() => setReviewIndex(i)} title="Click to review full screen">
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleRow(q.id)} aria-label={`Tick Q${q.q_no}`} />
                        </td>
                        <td title={`Q${q.q_no}`}><code style={{ fontSize: '0.8rem', fontWeight: 700 }}>{qidOf(q)}</code></td>
                        {part === 'B' && <td style={cell}>{q.section}</td>}
                        {part === 'B' && <td style={cell}>{q.marks}</td>}
                        <td style={{ ...cell, ...clip, maxWidth: '220px', color: q.chapter_no ? 'var(--gray-500)' : '#b45309' }} title={chapterName(q.chapter_no)}>
                          {q.chapter_no ? `${q.chapter_no}. ${chapterName(q.chapter_no) || ''}` : 'not set'}
                        </td>
                        <td style={{ ...clip, maxWidth: '420px', fontSize: '0.875rem' }}>{q.question}</td>
                        <td style={{ textAlign: 'center' }}>
                          {part === 'A'
                            ? (key ? <span className="badge badge-green">{LETTERS[Number(key.slice(-1)) - 1]}</span> : <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>none</span>)
                            : (q.answer || q.answer_image ? <span className="badge badge-green">✓</span> : <span style={cell}>—</span>)}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--gray-400)' }}>{q.question_image ? <ImageIcon size={15} /> : ''}</td>
                        <td onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => setReviewIndex(i)}>
                            <Maximize2 size={12} /> Review
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {visible.length === 0 && <div className="empty-state">No questions match these filters</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
