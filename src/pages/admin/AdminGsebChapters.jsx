import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, Maximize2, Image as ImageIcon } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import MathText from '../../components/shared/MathText'
import QuestionReviewer from '../../components/shared/QuestionReviewer'
import { GsebMcqEditPanel, GsebSubjectiveEditPanel } from '../../components/shared/GsebEditPanels'
import { supabase } from '../../lib/supabase'
import { correctOptionKey } from '../../lib/questionOptions'
import { GSEB_SUBJECTS, chaptersOf, gsebQid, paperExam } from '../../lib/gseb'

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
const PAGE = 1000 // PostgREST's default row cap per request

async function fetchAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < PAGE) return out
  }
}

// Newest paper first, then printed order.
const byPaper = (a, b) => b.paper.year - a.paper.year || a.paper.session.localeCompare(b.paper.session) || a.q_no - b.q_no

// Every board question of one subject, all papers and years together, sorted
// by chapter: the table counts each chapter, and opening a chapter lists its
// questions with the same full-screen review and edit as a paper page.
export default function AdminGsebChapters() {
  const [params, setParams] = useSearchParams()
  const subject = GSEB_SUBJECTS.some(s => s.id === params.get('subject')) ? params.get('subject') : GSEB_SUBJECTS[0].id
  const chapterNo = Number(params.get('ch')) || null
  const part = params.get('part') === 'B' ? 'B' : 'A'
  const marks = Number(params.get('marks')) || null // Part B: only questions of this many marks
  const [bank, setBank] = useState(null)
  const [search, setSearch] = useState('')
  const [reviewIndex, setReviewIndex] = useState(null)

  // Subject, chapter and part live in the URL so back/refresh keeps the place.
  function go(next) {
    setParams(p => {
      const n = new URLSearchParams(p)
      for (const [k, v] of Object.entries(next)) v == null ? n.delete(k) : n.set(k, v)
      return n
    })
    setSearch(''); setReviewIndex(null)
  }

  useEffect(() => {
    let live = true
    setBank(null)
    async function load() {
      try {
        const papers = await fetchAll(() => supabase.from('gseb_papers').select('*').eq('subject', subject).order('id'))
        const ids = papers.map(p => p.id)
        const byId = Object.fromEntries(papers.map(p => [p.id, p]))
        const [mcq, subjective] = ids.length ? await Promise.all([
          fetchAll(() => supabase.from('gseb_questions').select('*').in('paper_id', ids).order('id')),
          fetchAll(() => supabase.from('gseb_subjective').select('*').in('paper_id', ids).order('id')),
        ]) : [[], []]
        const tag = q => ({ ...q, paper: byId[q.paper_id] })
        if (live) setBank({ papers, mcq: mcq.map(tag), subjective: subjective.map(tag) })
      } catch (err) {
        toast.error(err.message)
        if (live) setBank({ papers: [], mcq: [], subjective: [] })
      }
    }
    load()
    return () => { live = false }
  }, [subject])

  const chapters = chaptersOf(subject)
  const chapter = chapters.find(c => c.id === chapterNo)

  function patchRow(row) {
    const key = part === 'B' ? 'subjective' : 'mcq'
    setBank(b => ({ ...b, [key]: b[key].map(x => x.id === row.id ? { ...x, ...row } : x) }))
  }

  const subjectTabs = (
    <div className="tabs" style={{ marginBottom: '1rem' }}>
      {GSEB_SUBJECTS.map(s => (
        <button key={s.id} className={`tab-btn${subject === s.id ? ' active' : ''}`} onClick={() => go({ subject: s.id, ch: null, part: null })}>
          {s.label}
        </button>
      ))}
    </div>
  )

  let body
  if (!bank) {
    body = <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
  } else if (!chapter) {
    const count = list => list.reduce((m, q) => { m[q.chapter_no] = (m[q.chapter_no] || 0) + 1; return m }, {})
    const mcqCount = count(bank.mcq)
    const subCount = count(bank.subjective)
    const noChapter = bank.mcq.filter(q => !q.chapter_no).length + bank.subjective.filter(q => !q.chapter_no).length
    const years = bank.papers.map(p => p.year)
    const drafts = bank.papers.filter(p => !p.is_published).length
    body = (
      <>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 0 }}>
          {bank.papers.length} papers{years.length ? ` (${Math.min(...years)}–${Math.max(...years)})` : ''} · {bank.mcq.length} MCQs · {bank.subjective.length} Part B
          {drafts > 0 && ` · includes ${drafts} draft paper${drafts === 1 ? '' : 's'}`}
          {noChapter > 0 && <span style={{ color: '#b45309' }}> · {noChapter} without a chapter</span>}
        </p>
        <div className="card">
          <div className="table-wrap" style={{ maxHeight: 'none' }}>
            <table>
              <thead><tr><th>Chapter</th><th style={{ textAlign: 'right', width: 100 }}>MCQs</th><th style={{ textAlign: 'right', width: 100 }}>Part B</th></tr></thead>
              <tbody>
                {chapters.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => go({ ch: c.id, part: 'A' })} title="Open this chapter's questions">
                    <td><strong>{c.id}.</strong> {c.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{mcqCount[c.id] || 0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{subCount[c.id] || 0}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td><strong>Total</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{bank.mcq.length}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{bank.subjective.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  } else {
    // Part B reads best grouped by marks (2, 3, 4…), newest paper first in each.
    const inChapter = (part === 'A' ? bank.mcq : bank.subjective).filter(q => q.chapter_no === chapter.id)
      .sort((a, b) => (part === 'B' ? a.marks - b.marks : 0) || byPaper(a, b))
    const marksCounts = part === 'B' ? inChapter.reduce((m, q) => { m[q.marks] = (m[q.marks] || 0) + 1; return m }, {}) : {}
    const all = marks ? inChapter.filter(q => q.marks === marks) : inChapter
    const qidOf = q => gsebQid(q.paper, part, q.q_no)
    const term = search.trim().toLowerCase()
    const visible = all.filter(q => !term || qidOf(q).toLowerCase() === term || (q.question || '').toLowerCase().includes(term))
    const mcqN = bank.mcq.filter(q => q.chapter_no === chapter.id).length
    const subN = bank.subjective.filter(q => q.chapter_no === chapter.id).length
    const tag = q => `${qidOf(q)} · ${paperExam(q.paper)} · ${part === 'A' ? 'Part A' : 'Part B'} Q${q.q_no}`
    const cell = { fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }
    const clip = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    body = (
      <>
        <button className="back-btn" style={{ marginBottom: '0.5rem', display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => go({ ch: null, part: null })}>
          <ArrowLeft size={16} /> All chapters
        </button>
        <h3 style={{ margin: '0 0 0.75rem' }}>Ch {chapter.id}. {chapter.name}</h3>
        <div className="tabs" style={{ marginBottom: '0.75rem' }}>
          <button className={`tab-btn ${part === 'A' ? 'active' : ''}`} onClick={() => go({ part: 'A', marks: null })}>Part A · MCQ ({mcqN})</button>
          <button className={`tab-btn ${part === 'B' ? 'active' : ''}`} onClick={() => go({ part: 'B', marks: null })}>Part B · Subjective ({subN})</button>
        </div>
        {part === 'B' && Object.keys(marksCounts).length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <button className={`btn btn-sm ${!marks ? 'btn-primary' : 'btn-outline'}`} onClick={() => go({ marks: null })}>All ({inChapter.length})</button>
            {Object.entries(marksCounts).map(([m, n]) => (
              <button key={m} className={`btn btn-sm ${marks === Number(m) ? 'btn-primary' : 'btn-outline'}`} onClick={() => go({ marks: m })}>{m} marks ({n})</button>
            ))}
          </div>
        )}

        {reviewIndex != null && visible[reviewIndex] && (
          <QuestionReviewer
            questions={visible}
            index={reviewIndex}
            onIndexChange={setReviewIndex}
            onClose={() => setReviewIndex(null)}
            onSaved={patchRow}
            idOf={tag}
            renderMeta={q => (
              <div style={{ fontSize: '0.8125rem', opacity: 0.9, ...clip }}>
                {part === 'B' && `Section ${q.section} · ${q.marks} marks · `}{q.chapter_no ? `Ch ${q.chapter_no} ${chapters.find(c => c.id === q.chapter_no)?.name || ''}` : 'Chapter not set'}
              </div>
            )}
            renderBody={(q, mode) => (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '2rem 2.25rem' }}>
                {part === 'A' ? (
                  <>
                    <QuestionView q={q} mode={mode} size="full" />
                    {mode === 'admin' && q.explanation && (
                      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}><strong>Explanation:</strong> <MathText text={q.explanation} /></div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontWeight: 600, marginBottom: '0.75rem' }}>{q.marks} marks</div>
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
              </div>
            )}
            renderEdit={props => part === 'A'
              ? <GsebMcqEditPanel {...props} subject={subject} title={tag(props.q)} />
              : <GsebSubjectiveEditPanel {...props} subject={subject} title={tag(props.q)} />}
          />
        )}

        <div className="card">
          <div className="card-header" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.6rem 0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
              <Search size={16} />
              <input className="form-control" style={{ border: 'none', boxShadow: 'none', padding: 0, fontSize: '1rem' }}
                placeholder="Search by Q ID or question text…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{visible.length} questions</span>
            {visible.length > 0 && (
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', padding: '0.3rem 0.7rem' }}
                onClick={() => setReviewIndex(0)} title="Open the first question full screen, then walk the list with ← / →">
                <Maximize2 size={14} /> Review {visible.length} full screen
              </button>
            )}
          </div>
          <div className="table-wrap" style={{ maxHeight: 'max(360px, calc(100vh - 300px))' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>#</th>
                  <th style={{ width: '120px' }}>Q ID</th>
                  <th style={{ width: '200px' }}>Paper</th>
                  {part === 'B' && <th style={{ width: '64px' }}>Marks</th>}
                  <th>Question</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>{part === 'A' ? 'Answer' : 'Model ans.'}</th>
                  <th style={{ width: '64px', textAlign: 'center' }}>Diagram</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((q, i) => {
                  const key = correctOptionKey(q)
                  return (
                    <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => setReviewIndex(i)} title="Click to review full screen">
                      <td style={cell}>{i + 1}</td>
                      <td title={`Board Q${q.q_no}`}><code style={{ fontSize: '0.8rem', fontWeight: 700 }}>{qidOf(q)}</code></td>
                      <td style={cell}>
                        <Link to={`/admin/gseb/${q.paper_id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit' }}>{paperExam(q.paper)}</Link>
                        {!q.paper.is_published && <span className="badge badge-locked" style={{ marginLeft: '0.35rem' }}>Draft</span>}
                      </td>
                      {part === 'B' && <td style={cell}>{q.marks}</td>}
                      <td style={{ ...clip, maxWidth: '460px', fontSize: '0.875rem' }}>{q.question}</td>
                      <td style={{ textAlign: 'center' }}>
                        {part === 'A'
                          ? (key ? <span className="badge badge-green">{LETTERS[Number(key.slice(-1)) - 1]}</span> : <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>none</span>)
                          : (q.answer || q.answer_image ? <span className="badge badge-green">✓</span> : <span style={cell}>—</span>)}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--gray-400)' }}>{q.question_image ? <ImageIcon size={15} /> : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visible.length === 0 && <div className="empty-state">No questions{term ? ' match this search' : ' in this chapter yet'}</div>}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <Link to="/admin/gseb" className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> All GSEB papers
        </Link>
        <div className="page-header" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Chapter-wise · All papers</h2>
        </div>
        {subjectTabs}
        {body}
      </div>
    </div>
  )
}
