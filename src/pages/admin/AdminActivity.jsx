import { useEffect, useMemo, useState, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Activity, Search, Users, ClipboardList, CheckCircle2, Clock, ChevronRight, ChevronDown, ArrowLeft, Eye, BarChart3 } from 'lucide-react'
import AttemptReviewModal from '../../components/performance/AttemptReviewModal'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { fromCourseUnitId } from '../../lib/constants'
import { practiceUnitName } from '../../lib/subjects'

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

const PERIODS = [['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days']]
const SUBJECTS = ['Chemistry', 'Physics', 'Biology']
const MEDIUM_NAME = { en: 'English', gu: 'Gujarati' }
const SUBJECT_TONE = {
  Chemistry: { bg: '#eff6ff', fg: '#1d4ed8' },
  Physics: { bg: '#eef2ff', fg: '#4338ca' },
  Biology: { bg: '#f0fdf4', fg: '#15803d' },
  'Practice Paper': { bg: '#fdf4ff', fg: '#a21caf' },
  GSEB: { bg: '#fff7ed', fg: '#c2410c' },
}
const KIND_LABEL = { practice: 'Level practice', paper: 'Practice paper', gseb: 'GSEB' }

function sinceIso(period) {
  const d = new Date()
  if (period === 'today') { d.setHours(0, 0, 0, 0); return d.toISOString() }
  return new Date(Date.now() - Number(period) * 864e5).toISOString()
}

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

const fmtTime = sec => (sec ? `${Math.floor(sec / 60)}m ${sec % 60}s` : '—')
const fullDate = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const ATTEMPT_COLUMNS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, time_taken, submitted, started_at, submitted_at, question_ids, answers'
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null)

// Every submitted page, a page at a time (Supabase returns at most 1000 rows).
async function allSince(build) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) return rows
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

const Chip = ({ label }) => {
  const t = SUBJECT_TONE[label] || { bg: 'var(--gray-100)', fg: 'var(--gray-600)' }
  return <span className="badge" style={{ background: t.bg, color: t.fg, marginRight: 4, marginBottom: 2 }}>{label}</span>
}

// Who practised, when, in which subject and medium — newest first. Answers
// "somebody did something but I can't find who" without searching students
// one by one; every row opens that student's Performance page.
export default function AdminActivity() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('7')
  const [view, setView] = useState('students')     // 'students' | 'timeline'
  const [subject, setSubject] = useState('')
  const [medium, setMedium] = useState('')
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState([])
  const [studentsById, setStudentsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [openStudent, setOpenStudent] = useState(null)   // expanded row in "By student"
  const [review, setReview] = useState(null)             // practice attempt under review

  // A level-practice test opens the same answer-by-answer review as
  // Performance; papers and GSEB tests go to the student's Performance page.
  async function openReview(e) {
    if (e.kind !== 'practice') { navigate(`/admin/performance?student=${e.student_id}`); return }
    const { data, error } = await supabase.from('test_attempts').select(ATTEMPT_COLUMNS).eq('id', e.id).single()
    if (error) { toast.error(error.message); return }
    setReview(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const since = sinceIso(period)
      const [students, practice, papers, paperNames, gseb] = await Promise.all([
        allSince(() => supabase.from('students').select('id, name, roll_number, class, medium, exam')),
        allSince(() => supabase.from('test_attempts')
          .select('id, student_id, unit_id, level, score, correct_count, wrong_count, skipped_count, time_taken, submitted_at')
          .eq('submitted', true).gte('submitted_at', since).order('submitted_at', { ascending: false })),
        allSince(() => supabase.from('practice_paper_attempts')
          .select('id, student_id, paper_id, score, correct_count, wrong_count, skipped_count, submitted_at')
          .gte('submitted_at', since).order('submitted_at', { ascending: false })),
        allSince(() => supabase.from('practice_papers').select('id, name')),
        allSince(() => supabase.from('gseb_attempts')
          .select('id, student_id, mode, subject, title, score, correct_count, wrong_count, skipped_count, submitted_at')
          .eq('submitted', true).gte('submitted_at', since).order('submitted_at', { ascending: false })),
      ])
      if (cancelled) return
      const paperName = Object.fromEntries(paperNames.map(p => [p.id, p.name]))
      const ev = [
        ...practice.map(a => {
          const { subject: sub, unit } = fromCourseUnitId(a.unit_id)
          const total = (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
          return {
            id: a.id, kind: 'practice', student_id: a.student_id, at: a.submitted_at, subject: sub,
            what: `${practiceUnitName(a.unit_id)} · Level ${a.level}`,
            short: `Unit ${unit} · L${a.level}`,
            scorePct: pct(a.score, total * 4), correct: a.correct_count || 0, wrong: a.wrong_count || 0,
            answered: (a.correct_count || 0) + (a.wrong_count || 0), total, time: a.time_taken,
          }
        }),
        ...papers.map(a => {
          const answered = (a.correct_count || 0) + (a.wrong_count || 0)
          const total = answered + (a.skipped_count || 0)
          return {
            id: a.id, kind: 'paper', student_id: a.student_id, at: a.submitted_at, subject: 'Practice Paper',
            what: paperName[a.paper_id] || 'Practice paper',
            scorePct: pct(a.score, total * 4), correct: a.correct_count || 0, wrong: a.wrong_count || 0, answered, total,
          }
        }),
        ...gseb.map(a => {
          const answered = (a.correct_count || 0) + (a.wrong_count || 0)
          const total = answered + (a.skipped_count || 0)
          return {
            id: a.id, kind: 'gseb', student_id: a.student_id, at: a.submitted_at, subject: 'GSEB',
            what: `${a.title || (a.mode === 'chapter' ? 'Chapter practice' : 'Board paper')}${a.subject ? ` · ${a.subject}` : ''}`,
            scorePct: pct(a.correct_count || 0, total), correct: a.correct_count || 0, wrong: a.wrong_count || 0, answered, total,
          }
        }),
      ].filter(e => e.at).sort((x, y) => new Date(y.at) - new Date(x.at))
      setStudentsById(Object.fromEntries(students.map(s => [s.id, s])))
      setEvents(ev)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [period])

  // Filters apply to both views.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter(e => {
      const st = studentsById[e.student_id]
      if (subject && e.subject !== subject) return false
      if (medium && (st?.medium || 'en') !== medium) return false
      if (q && !((st?.name || '').toLowerCase().includes(q) || (st?.roll_number || '').toLowerCase().includes(q))) return false
      return true
    })
  }, [events, studentsById, subject, medium, query])

  const byStudent = useMemo(() => {
    const m = new Map()
    for (const e of shown) {
      if (!m.has(e.student_id)) m.set(e.student_id, { id: e.student_id, last: e.at, tests: 0, answered: 0, correct: 0, wrong: 0, subjects: new Set(), lastWhat: e.short || e.what })
      const r = m.get(e.student_id)
      r.tests++; r.answered += e.answered; r.correct += e.correct; r.wrong += e.wrong; r.subjects.add(e.subject)
    }
    return [...m.values()]
  }, [shown])

  const totals = {
    students: byStudent.length,
    tests: shown.length,
    answered: shown.reduce((n, e) => n + e.answered, 0),
    accuracy: pct(shown.reduce((n, e) => n + e.correct, 0), shown.reduce((n, e) => n + e.correct + e.wrong, 0)),
  }

  const open = id => navigate(`/admin/performance?student=${id}`)
  const name = id => studentsById[id]?.name || 'Unknown student'
  const roll = id => studentsById[id]?.roll_number || ''
  const med = id => MEDIUM_NAME[studentsById[id]?.medium || 'en']
  const shownLast = id => shown.find(e => e.student_id === id)?.what || ''
  const cls = id => [studentsById[id]?.class, studentsById[id]?.exam].filter(Boolean).join(' · ') || '—'

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <Link to="/admin" className="back-btn" style={{ fontSize: '0.8rem' }}><ArrowLeft size={14} /> Dashboard</Link>
            <h2 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={22} color="var(--primary)" /> Recent Activity</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {PERIODS.map(([k, label]) => (
              <button key={k} className={`btn btn-sm ${period === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod(k)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value"><Users size={18} style={{ verticalAlign: '-2px' }} /> {totals.students}</div><div className="stat-label">Students active</div></div>
          <div className="stat-card"><div className="stat-value"><ClipboardList size={18} style={{ verticalAlign: '-2px' }} /> {totals.tests}</div><div className="stat-label">Tests submitted</div></div>
          <div className="stat-card"><div className="stat-value">{totals.answered.toLocaleString('en-IN')}</div><div className="stat-label">Questions answered</div></div>
          <div className="stat-card"><div className="stat-value"><CheckCircle2 size={18} style={{ verticalAlign: '-2px' }} /> {totals.accuracy ?? '—'}{totals.accuracy != null && '%'}</div><div className="stat-label">Accuracy</div></div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--gray-100)', borderRadius: 999 }}>
              {[['students', 'By student'], ['timeline', 'Every test']].map(([k, label]) => (
                <button key={k} onClick={() => setView(k)} className="btn btn-sm"
                  style={{ borderRadius: 999, background: view === k ? '#fff' : 'transparent', boxShadow: view === k ? 'var(--shadow)' : 'none', fontWeight: view === k ? 700 : 500 }}>
                  {label}
                </button>
              ))}
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              <option value="Practice Paper">Practice Papers</option>
              <option value="GSEB">GSEB</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={medium} onChange={e => setMedium(e.target.value)}>
              <option value="">All mediums</option>
              <option value="en">English</option>
              <option value="gu">Gujarati</option>
            </select>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-control" style={{ paddingLeft: 32, width: 220 }} placeholder="Search name or roll no." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
              : shown.length === 0 ? <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>No activity in this period{subject || medium || query ? ' for these filters' : ''}.</div>
              : view === 'students' ? (
                <table>
                  <thead><tr><th>Student</th><th>Medium</th><th>Subjects</th><th style={{ textAlign: 'center' }} title="Tests submitted in this period (one level test = 25 questions)">Tests taken</th><th style={{ textAlign: 'center' }}>Answered</th><th style={{ textAlign: 'center' }}>Accuracy</th><th>Last active</th><th></th></tr></thead>
                  <tbody>
                    {byStudent.map(r => {
                      const isOpen = openStudent === r.id
                      const tests = isOpen ? shown.filter(e => e.student_id === r.id) : []
                      return (
                        <Fragment key={r.id}>
                          <tr onClick={() => setOpenStudent(isOpen ? null : r.id)} style={{ cursor: 'pointer', background: isOpen ? '#eff6ff' : undefined }} title="Show this student's tests">
                            <td><strong>{name(r.id)}</strong><div className="text-muted" style={{ fontSize: '0.75rem' }} title={roll(r.id)}>{cls(r.id)} · <span title={shownLast(r.id)}>{r.lastWhat}</span></div></td>
                            <td>{med(r.id)}</td>
                            <td>{[...r.subjects].map(s => <Chip key={s} label={s} />)}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.tests}</td>
                            <td style={{ textAlign: 'center' }}>{r.answered}</td>
                            <td style={{ textAlign: 'center' }}>{pct(r.correct, r.correct + r.wrong) ?? '—'}{pct(r.correct, r.correct + r.wrong) != null && '%'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}><Clock size={13} style={{ verticalAlign: '-2px', color: 'var(--gray-400)' }} /> {ago(r.last)}</td>
                            <td>{isOpen ? <ChevronDown size={16} color="var(--primary)" /> : <ChevronRight size={16} color="var(--primary)" />}</td>
                          </tr>
                          {/* This student's tests in the period, newest first, each
                              one-click to its answer-by-answer review. */}
                          {isOpen && (
                            <tr>
                              <td colSpan={8} style={{ background: '#f8fafc', padding: '0.75rem 1rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.85rem' }}>{tests.length} test{tests.length !== 1 ? 's' : ''} · newest first</strong>
                                  <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => open(r.id)}>
                                    <BarChart3 size={14} /> Full Performance
                                  </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {tests.map(e => (
                                    <div key={`${e.kind}-${e.id}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.9rem', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                                      <span style={{ width: 120, color: 'var(--gray-600)' }} title={ago(e.at)}>{fullDate(e.at)}</span>
                                      <Chip label={e.subject} />
                                      <span style={{ flex: '1 1 220px', minWidth: 0 }}>{e.what}<span className="text-muted" style={{ fontSize: '0.72rem' }}> · {KIND_LABEL[e.kind]}</span></span>
                                      <strong style={{ width: 48, textAlign: 'center', color: e.scorePct == null ? undefined : e.scorePct >= 60 ? '#15803d' : e.scorePct >= 35 ? '#b45309' : '#b91c1c' }}>{e.scorePct ?? '—'}{e.scorePct != null && '%'}</strong>
                                      <span style={{ width: 110, textAlign: 'center' }} title="correct · wrong · total">✓{e.correct} · ✗{e.wrong} · {e.total}</span>
                                      <span className="text-muted" style={{ width: 70, textAlign: 'center' }} title="Time taken">{fmtTime(e.time)}</span>
                                      {e.kind === 'practice'
                                        ? <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => openReview(e)}><Eye size={13} /> Review</button>
                                        : <span style={{ width: 78 }} />}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead><tr><th>When</th><th>Student</th><th>Medium</th><th>Subject</th><th>What</th><th style={{ textAlign: 'center' }}>Score</th><th style={{ textAlign: 'center' }}>✓ / ✗ / total</th><th></th></tr></thead>
                  <tbody>
                    {shown.map(e => (
                      <tr key={`${e.kind}-${e.id}`} onClick={() => openReview(e)} style={{ cursor: 'pointer' }} title={e.kind === 'practice' ? 'Review this test' : 'Open in Performance'}>
                        <td style={{ whiteSpace: 'nowrap' }} title={ago(e.at)}>{fullDate(e.at)}</td>
                        <td><strong>{name(e.student_id)}</strong><div className="text-muted" style={{ fontSize: '0.75rem' }} title={roll(e.student_id)}>{cls(e.student_id)}</div></td>
                        <td>{med(e.student_id)}</td>
                        <td><Chip label={e.subject} /></td>
                        <td style={{ maxWidth: 320 }}>{e.what}<div className="text-muted" style={{ fontSize: '0.72rem' }}>{KIND_LABEL[e.kind]}</div></td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: e.scorePct == null ? undefined : e.scorePct >= 60 ? '#15803d' : e.scorePct >= 35 ? '#b45309' : '#b91c1c' }}>{e.scorePct ?? '—'}{e.scorePct != null && '%'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{e.correct} / {e.wrong} / {e.total}</td>
                        <td><ChevronRight size={16} color="var(--primary)" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </div>
      {review && <AttemptReviewModal attempt={review} studentName={name(review.student_id)} onClose={() => setReview(null)} />}
    </div>
  )
}
