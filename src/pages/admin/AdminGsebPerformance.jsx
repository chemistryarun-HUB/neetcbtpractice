import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { GSEB_SUBJECTS, GSEB_SUBJECT_LABELS, paperTitle, chapterName } from '../../lib/gseb'
import { fmtDuration, fmtWhen } from '../../lib/performanceMetrics'

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

const pctOf = a => a.total ? Math.round((a.score / a.total) * 100) : 0
const avg = list => list.length ? Math.round(list.reduce((t, x) => t + x, 0) / list.length) : null
const pctColor = p => p == null ? 'var(--gray-400)' : p >= 70 ? '#15803d' : p >= 40 ? '#b45309' : '#b91c1c'

function Pct({ value }) {
  return <strong style={{ color: pctColor(value) }}>{value == null ? '—' : `${value}%`}</strong>
}

function Bar({ value }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: 'var(--gray-100)', overflow: 'hidden', minWidth: 120 }}>
      <div style={{ width: `${value}%`, height: '100%', background: pctColor(value) }} />
    </div>
  )
}

// How students are doing in GSEB board papers and chapter-wise tests: one
// row per student (open it for every test they took), one per paper, and
// chapter accuracy across all their answers so weak chapters stand out.
export default function AdminGsebPerformance() {
  const [data, setData] = useState(null)
  const [subject, setSubject] = useState('all')
  const [cls, setCls] = useState('all')
  const [view, setView] = useState('students') // 'students' | 'papers' | 'chapters'
  const [open, setOpen] = useState(null)        // student id whose tests are expanded

  useEffect(() => {
    async function load() {
      try {
        const [students, papers, attempts, questions] = await Promise.all([
          fetchAll(() => supabase.from('students').select('id, name, class, roll_number').order('name')),
          fetchAll(() => supabase.from('gseb_papers').select('id, subject, year, session, set_no, medium, paper_code').order('year', { ascending: false })),
          fetchAll(() => supabase.from('gseb_attempts')
            .select('id, student_id, paper_id, mode, subject, title, question_ids, answers, correct_count, wrong_count, skipped_count, score, time_taken, submitted_at')
            .eq('submitted', true).order('submitted_at', { ascending: false })),
          fetchAll(() => supabase.from('gseb_questions').select('id, chapter_no').order('id')),
        ])
        setData({ students, papers, attempts, questions })
      } catch (err) {
        toast.error(err.message)
        setData({ students: [], papers: [], attempts: [], questions: [] })
      }
    }
    load()
  }, [])

  const all = useMemo(() => {
    if (!data) return []
    const paperById = Object.fromEntries(data.papers.map(p => [p.id, p]))
    const studentById = Object.fromEntries(data.students.map(s => [s.id, s]))
    return data.attempts.map(a => {
      const paper = paperById[a.paper_id] || null
      const total = (a.question_ids || []).length
      const row = { ...a, paper, student: studentById[a.student_id], subject: paper?.subject || a.subject, total }
      return { ...row, pct: pctOf(row), name: paper ? paperTitle(paper) : (a.title || 'Chapter-wise test') }
    }).filter(a => a.student)
  }, [data])

  const classes = useMemo(() => [...new Set((data?.students || []).map(s => s.class).filter(Boolean))].sort(), [data])
  const rows = all.filter(a => (subject === 'all' || a.subject === subject) && (cls === 'all' || a.student.class === cls))

  const byStudent = useMemo(() => {
    const map = new Map()
    for (const a of rows) {
      if (!map.has(a.student_id)) map.set(a.student_id, { student: a.student, tests: [] })
      map.get(a.student_id).tests.push(a)
    }
    return [...map.values()].map(s => ({
      ...s,
      full: s.tests.filter(t => t.paper_id).length,
      avg: avg(s.tests.map(t => t.pct)),
      best: Math.max(...s.tests.map(t => t.pct)),
      last: s.tests[0].submitted_at,
    })).sort((a, b) => b.avg - a.avg)
  }, [rows])

  const byPaper = useMemo(() => {
    const map = new Map()
    for (const a of rows.filter(r => r.paper)) {
      if (!map.has(a.paper_id)) map.set(a.paper_id, { paper: a.paper, name: a.name, tests: [] })
      map.get(a.paper_id).tests.push(a)
    }
    return [...map.values()].map(p => {
      const pcts = p.tests.map(t => t.pct)
      // A student's first go at a paper is the fair board-style score.
      const firsts = new Map()
      for (const t of [...p.tests].reverse()) if (!firsts.has(t.student_id)) firsts.set(t.student_id, t)
      const top = [...firsts.values()].sort((a, b) => b.pct - a.pct)[0]
      return { ...p, students: firsts.size, avg: avg(pcts), best: Math.max(...pcts), low: Math.min(...pcts), top }
    }).sort((a, b) => (b.paper.year - a.paper.year) || a.name.localeCompare(b.name))
  }, [rows])

  // Accuracy per chapter over every answered MCQ in the filtered tests.
  const byChapter = useMemo(() => {
    if (!data) return []
    const chapterOf = Object.fromEntries(data.questions.map(q => [q.id, q.chapter_no]))
    const map = new Map()
    for (const a of rows) {
      const ans = a.answers || {}
      const mark = (ids, field) => (ids || []).forEach(id => {
        const ch = chapterOf[id]
        if (!ch) return
        const k = `${a.subject}:${ch}`
        if (!map.has(k)) map.set(k, { subject: a.subject, chapter: ch, correct: 0, wrong: 0, skipped: 0, students: new Set() })
        const c = map.get(k)
        c[field]++
        c.students.add(a.student_id)
      })
      mark(ans.correct_ids, 'correct'); mark(ans.wrong_ids, 'wrong'); mark(ans.skipped_ids, 'skipped')
    }
    return [...map.values()].map(c => {
      const total = c.correct + c.wrong + c.skipped
      return { ...c, total, pct: total ? Math.round((c.correct / total) * 100) : 0 }
    }).sort((a, b) => a.pct - b.pct)
  }, [rows, data])

  if (!data) return <div className="loading-screen"><div className="spinner" /></div>

  const cell = { fontSize: '0.8125rem', color: 'var(--gray-500)' }
  const muted = { color: 'var(--gray-400)', fontSize: '0.75rem' }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <Link to="/admin/gseb" className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> All GSEB papers
        </Link>
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Board Papers · Student Performance</h2>
          {classes.length > 1 && (
            <select className="form-control" style={{ width: 'auto' }} value={cls} onChange={e => setCls(e.target.value)}>
              <option value="all">All classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <div className="tabs" style={{ marginBottom: '1rem' }}>
          <button className={`tab-btn ${subject === 'all' ? 'active' : ''}`} onClick={() => setSubject('all')}>All subjects</button>
          {GSEB_SUBJECTS.map(s => (
            <button key={s.id} className={`tab-btn ${subject === s.id ? 'active' : ''}`} onClick={() => setSubject(s.id)}>{s.label}</button>
          ))}
        </div>

        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card"><div className="stat-value">{byStudent.length}</div><div className="stat-label">Students who took a test</div></div>
          <div className="stat-card"><div className="stat-value">{rows.length}</div><div className="stat-label">Tests submitted</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: pctColor(avg(rows.map(r => r.pct))) }}>{rows.length ? `${avg(rows.map(r => r.pct))}%` : '—'}</div><div className="stat-label">Average score</div></div>
          <div className="stat-card"><div className="stat-value">{rows.filter(r => r.paper_id).length} / {rows.filter(r => !r.paper_id).length}</div><div className="stat-label">Full papers / chapter tests</div></div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">No tests submitted yet{subject !== 'all' ? ` in ${GSEB_SUBJECT_LABELS[subject]}` : ''}. Scores show here as soon as students finish a board paper or chapter test.</div>
        ) : (
          <div className="card">
            <div className="card-header" style={{ padding: '0.4rem 0.75rem' }}>
              <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
                <button className={`tab-btn ${view === 'students' ? 'active' : ''}`} onClick={() => setView('students')}>Students ({byStudent.length})</button>
                <button className={`tab-btn ${view === 'papers' ? 'active' : ''}`} onClick={() => setView('papers')}>Papers ({byPaper.length})</button>
                <button className={`tab-btn ${view === 'chapters' ? 'active' : ''}`} onClick={() => setView('chapters')}>Weak chapters</button>
              </div>
            </div>

            {view === 'students' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th><th>Student</th><th>Class</th>
                      <th style={{ textAlign: 'center' }}>Tests</th><th style={{ textAlign: 'center' }}>Full papers</th>
                      <th style={{ textAlign: 'center' }}>Average</th><th style={{ textAlign: 'center' }}>Best</th><th>Last test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStudent.map(s => {
                      const isOpen = open === s.student.id
                      const when = fmtWhen(s.last)
                      return (
                        <Fragment key={s.student.id}>
                          <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--primary-light)' : undefined }} onClick={() => setOpen(isOpen ? null : s.student.id)}>
                            <td style={{ color: 'var(--gray-400)' }}>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                            <td style={{ fontWeight: 600 }}>{s.student.name}</td>
                            <td style={cell}>{s.student.class || '—'}</td>
                            <td style={{ textAlign: 'center' }}>{s.tests.length}</td>
                            <td style={{ textAlign: 'center' }}>{s.full}</td>
                            <td style={{ textAlign: 'center' }}><Pct value={s.avg} /></td>
                            <td style={{ textAlign: 'center' }}><Pct value={s.best} /></td>
                            <td style={cell}>{when.day} <span style={muted}>{when.time}</span></td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td></td>
                              <td colSpan={7} style={{ padding: '0.25rem 0 0.75rem' }}>
                                <table style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                                  <thead>
                                    <tr><th>Test</th><th style={{ textAlign: 'center' }}>Score</th><th style={{ textAlign: 'center' }}>Correct / Wrong / Skipped</th><th>Time</th><th>Date</th></tr>
                                  </thead>
                                  <tbody>
                                    {s.tests.map(t => {
                                      const w = fmtWhen(t.submitted_at)
                                      return (
                                        <tr key={t.id}>
                                          <td style={{ fontSize: '0.8125rem' }}>
                                            {t.name}{' '}
                                            <span className="badge" style={{ fontSize: '0.65rem', background: t.paper_id ? '#e0e7ff' : '#f3f4f6', color: t.paper_id ? '#3730a3' : 'var(--gray-600)' }}>
                                              {t.paper_id ? 'Board paper' : `Chapter test · ${GSEB_SUBJECT_LABELS[t.subject] || ''}`}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{t.score ?? 0}/{t.total} · <Pct value={t.pct} /></td>
                                          <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>
                                            <span style={{ color: '#15803d' }}>{t.correct_count}</span> / <span style={{ color: '#b91c1c' }}>{t.wrong_count}</span> / <span style={{ color: '#b45309' }}>{t.skipped_count}</span>
                                          </td>
                                          <td style={cell}>{fmtDuration(t.time_taken)}</td>
                                          <td style={cell}>{w.day} <span style={muted}>{w.time}</span></td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'papers' && (byPaper.length === 0 ? (
              <div className="empty-state">Only chapter tests so far. Full board papers show here once a student submits one.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Attempts</th>
                      <th style={{ textAlign: 'center' }}>Average</th><th style={{ textAlign: 'center' }}>Highest</th><th style={{ textAlign: 'center' }}>Lowest</th><th>Topper (first attempt)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPaper.map(p => (
                      <tr key={p.paper.id}>
                        <td style={{ fontWeight: 600, fontSize: '0.875rem' }}><Link to={`/admin/gseb/${p.paper.id}`}>{p.name}</Link></td>
                        <td style={{ textAlign: 'center' }}>{p.students}</td>
                        <td style={{ textAlign: 'center' }}>{p.tests.length}</td>
                        <td style={{ textAlign: 'center' }}><Pct value={p.avg} /></td>
                        <td style={{ textAlign: 'center' }}><Pct value={p.best} /></td>
                        <td style={{ textAlign: 'center' }}><Pct value={p.low} /></td>
                        <td style={cell}>{p.top ? <>{p.top.student.name} · {p.top.score ?? 0}/{p.top.total}</> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {view === 'chapters' && (byChapter.length === 0 ? (
              <div className="empty-state">No chapter data yet. Questions need a chapter set for this to fill in.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Chapter</th>{subject === 'all' && <th>Subject</th>}<th style={{ width: '30%' }}>Accuracy</th>
                      <th style={{ textAlign: 'center' }}>Correct / Wrong / Skipped</th><th style={{ textAlign: 'center' }}>Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byChapter.map(c => (
                      <tr key={`${c.subject}:${c.chapter}`}>
                        <td style={{ fontSize: '0.875rem' }}>{c.chapter}. {chapterName(c.subject, c.chapter) || ''}</td>
                        {subject === 'all' && <td style={cell}>{GSEB_SUBJECT_LABELS[c.subject]}</td>}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}><Bar value={c.pct} /></div>
                            <span style={{ width: 40, textAlign: 'right' }}><Pct value={c.pct} /></span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>
                          <span style={{ color: '#15803d' }}>{c.correct}</span> / <span style={{ color: '#b91c1c' }}>{c.wrong}</span> / <span style={{ color: '#b45309' }}>{c.skipped}</span>
                          <span style={muted}> of {c.total}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{c.students.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
