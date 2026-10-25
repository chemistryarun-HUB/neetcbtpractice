import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, ArrowLeft, Play, RotateCcw, FileText, Atom, FlaskConical, Dna, Sigma, CalendarDays, BookOpen, ListChecks, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GSEB_SUBJECTS, GSEB_SUBJECT_LABELS, GSEB_MEDIUM_LABELS, GSEB_EXAM_LABELS, chaptersOf, minutesFor } from '../../lib/gseb'
import { fetchGsebBank, byYearThenNumber, startGsebPractice } from '../../lib/gsebBank'

const VIEWS = [
  { id: 'years', label: 'Year-wise papers', icon: CalendarDays },
  { id: 'chapters', label: 'Chapter-wise', icon: BookOpen },
]
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'Not attempted' },
  { id: 'done', label: 'Attempted' },
]

// Each subject has its own colour, carried by the hero, the tabs and every card.
const LOOK = {
  physics:   { icon: Atom,         c: '#4f46e5', deep: '#312e81', soft: '#eef2ff' },
  chemistry: { icon: FlaskConical, c: '#ea580c', deep: '#7c2d12', soft: '#fff7ed' },
  biology:   { icon: Dna,          c: '#059669', deep: '#064e3b', soft: '#ecfdf5' },
  maths:     { icon: Sigma,        c: '#1a56db', deep: '#1e3a8a', soft: '#e1effe' },
}
const lookOf = s => LOOK[s] || LOOK.maths
const lookVars = s => { const l = lookOf(s); return { '--c': l.c, '--c-deep': l.deep, '--c-soft': l.soft } }

// Only ids and chapter tags: the chapter cards count and pick, the test loads the rest.
const LIGHT = { mcqSelect: 'id, paper_id, q_no, chapter_no', subjectiveSelect: 'id, paper_id, q_no, chapter_no, marks' }

// Chapter practice attempts are titled "Physics · Ch 4 Moving Charges…".
const chapterOfAttempt = a => Number(a.title?.match(/· Ch (\d+)\b/)?.[1]) || null
const pctOf = (score, total) => total ? Math.round((score / total) * 100) : 0
const scoreColor = p => p >= 70 ? '#16a34a' : p >= 40 ? '#d97706' : '#dc2626'

function Ring({ pct }) {
  const r = 21, c = 2 * Math.PI * r
  return (
    <svg className="gx-ring" width="54" height="54" viewBox="0 0 54 54" aria-label={pct == null ? 'Not attempted' : `Best ${pct}%`}>
      <circle cx="27" cy="27" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="5" />
      {pct != null && (
        <circle cx="27" cy="27" r={r} fill="none" stroke={scoreColor(pct)} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 27 27)" />
      )}
      <text x="27" y="31" textAnchor="middle" fontSize={pct == null ? 10 : 12} fontWeight="800" fill={pct == null ? 'var(--gray-400)' : 'var(--gray-800)'}>
        {pct == null ? 'NEW' : `${pct}%`}
      </text>
    </svg>
  )
}

// One card shape for both views: a year paper and a chapter read the same way.
function PracticeCard({ badgeTop, badgeMain, title, sub, chips, best, status, lastResult, primary, partB }) {
  return (
    <div className={`gx-card${best != null ? ' done' : ''}`}>
      <div className="gx-card-head">
        <div className="gx-badge"><small>{badgeTop}</small><b>{badgeMain}</b></div>
        <div style={{ minWidth: 0 }}>
          <div className="gx-card-title" title={title}>{title}</div>
          <div className="gx-card-sub">{sub}</div>
        </div>
        <Ring pct={best} />
      </div>
      <div className="gx-chips">
        {chips.filter(Boolean).map(({ icon: Icon, text }) => (
          <span key={text} className="gx-chip"><Icon size={13} /> {text}</span>
        ))}
      </div>
      <div className={`gx-status${best != null ? ' done' : ''}`}>
        {best != null ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
        <span>{status}</span>
        {lastResult && <Link to={lastResult} className="gx-link">Last result →</Link>}
      </div>
      <div className="gx-actions">
        <button className="gx-go" onClick={primary.onClick} disabled={primary.disabled}>
          {primary.again ? <RotateCcw size={15} /> : <Play size={15} />} {primary.label}
        </button>
        {partB && <Link to={partB.to} className="gx-ghost"><FileText size={14} /> Part B{partB.count ? ` · ${partB.count}` : ''}</Link>}
      </div>
    </div>
  )
}

export default function StudentGsebPapers() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [attempts, setAttempts] = useState([])
  const [banks, setBanks] = useState({}) // subject -> light bank, loaded when Chapter-wise opens
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [params, setParams] = useSearchParams()
  const view = VIEWS.some(v => v.id === params.get('view')) ? params.get('view') : 'years'
  const filter = FILTERS.some(f => f.id === params.get('show')) ? params.get('show') : 'all'
  const subject = GSEB_SUBJECTS.some(s => s.id === params.get('subject')) ? params.get('subject') : null
  // View, subject and filter live in the URL so "back" from a test lands on the same place.
  function setParam(key, value) {
    setParams(p => { const n = new URLSearchParams(p); n.set(key, value); return n }, { replace: true })
  }

  useEffect(() => {
    async function load() {
      const [papersRes, attemptsRes] = await Promise.all([
        supabase.from('gseb_papers').select('*, gseb_subjective(count)').eq('is_published', true)
          .order('year', { ascending: false }).order('session').order('set_no'),
        supabase.from('gseb_attempts').select('id, paper_id, mode, subject, title, score, question_ids, submitted_at')
          .eq('student_id', user.id).eq('submitted', true).order('submitted_at', { ascending: false }),
      ])
      if (papersRes.error) toast.error(papersRes.error.message)
      setPapers(papersRes.data || [])
      setAttempts(attemptsRes.data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  // Open on the first subject that actually has a paper.
  const shownSubject = subject || GSEB_SUBJECTS.find(s => papers.some(p => p.subject === s.id))?.id || GSEB_SUBJECTS[0].id

  useEffect(() => {
    if (view !== 'chapters' || banks[shownSubject]) return
    let live = true
    fetchGsebBank(shownSubject, LIGHT)
      .then(b => { if (live) setBanks(prev => ({ ...prev, [shownSubject]: b })) })
      .catch(err => { toast.error(err.message); if (live) setBanks(prev => ({ ...prev, [shownSubject]: { papers: [], mcq: [], subjective: [] } })) })
    return () => { live = false }
  }, [view, shownSubject, banks])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  // Per-subject facts for the tiles and the hero.
  const paperAttempts = {}
  for (const a of attempts) if (a.paper_id) (paperAttempts[a.paper_id] ||= []).push(a)
  const chapterAttempts = {}
  for (const a of attempts) {
    const ch = a.mode === 'chapter' && chapterOfAttempt(a)
    if (ch) (chapterAttempts[`${a.subject}:${ch}`] ||= []).push(a)
  }
  const statsOf = s => {
    const ps = papers.filter(p => p.subject === s)
    const done = ps.filter(p => paperAttempts[p.id])
    const bests = done.map(p => Math.max(...paperAttempts[p.id].map(a => pctOf(a.score || 0, p.mcq_count))))
    return {
      papers: ps.length,
      mcq: ps.reduce((t, p) => t + (p.mcq_count || 0), 0),
      papersDone: done.length,
      chapters: chaptersOf(s).length,
      chaptersDone: chaptersOf(s).filter(c => chapterAttempts[`${s}:${c.id}`]).length,
      avgBest: bests.length ? Math.round(bests.reduce((t, x) => t + x, 0) / bests.length) : null,
    }
  }
  const st = statsOf(shownSubject)
  const SubjectIcon = lookOf(shownSubject).icon

  // Cards for the open view, in one shape.
  let cards = null
  if (view === 'years') {
    cards = papers.filter(p => p.subject === shownSubject).map(p => {
      const mine = paperAttempts[p.id] || []
      const best = mine.length ? Math.max(...mine.map(a => a.score || 0)) : null
      const partBCount = p.gseb_subjective?.[0]?.count || 0
      return {
        key: p.id, attempted: mine.length > 0,
        badgeTop: p.session === 'july' ? 'Supp.' : 'Main', badgeMain: p.year,
        title: GSEB_EXAM_LABELS[p.session] || p.session,
        sub: [GSEB_MEDIUM_LABELS[p.medium], p.set_no && `Set ${p.set_no}`, p.paper_code && `Code ${p.paper_code}`].filter(Boolean).join(' · '),
        chips: [
          { icon: ListChecks, text: `${p.mcq_count} MCQs` },
          { icon: Clock, text: `${p.duration_min} min` },
          p.key_status === 'provisional' && { icon: Sparkles, text: 'Provisional key' },
        ],
        best: best == null ? null : pctOf(best, p.mcq_count),
        status: best == null ? 'Not attempted yet' : `Best ${best}/${p.mcq_count} · ${mine.length} attempt${mine.length === 1 ? '' : 's'}`,
        lastResult: mine[0] && `/student/gseb/result/${mine[0].id}`,
        primary: { label: mine.length ? 'Attempt again' : 'Start test', again: mine.length > 0, onClick: () => navigate(`/student/gseb/test/${p.id}`) },
        partB: partBCount > 0 && { to: `/student/gseb/paper/${p.id}/part-b`, count: partBCount },
      }
    })
  } else if (banks[shownSubject]) {
    const bank = banks[shownSubject]
    const years = bank.papers.map(p => p.year)
    const span = years.length ? (Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`) : ''
    cards = chaptersOf(shownSubject).map(c => {
      const mcq = bank.mcq.filter(q => q.chapter_no === c.id)
      const partBCount = bank.subjective.filter(q => q.chapter_no === c.id).length
      const mine = chapterAttempts[`${shownSubject}:${c.id}`] || []
      const best = mine.length ? Math.max(...mine.map(a => pctOf(a.score || 0, a.question_ids?.length || 0))) : null
      async function practise() {
        setStarting(c.id)
        try {
          const attemptId = await startGsebPractice({
            studentId: user.id, subject: shownSubject, mode: 'chapter',
            questionIds: [...mcq].sort(byYearThenNumber).map(q => q.id),
            title: `${GSEB_SUBJECT_LABELS[shownSubject]} · Ch ${c.id} ${c.name}`,
          })
          navigate(`/student/gseb/practice/${attemptId}`)
        } catch (err) {
          toast.error(err.message)
          setStarting(null)
        }
      }
      return {
        key: c.id, attempted: mine.length > 0,
        badgeTop: 'Ch', badgeMain: c.id,
        title: c.name,
        sub: span ? `Board questions ${span}` : 'Board questions',
        chips: [
          { icon: ListChecks, text: `${mcq.length} MCQs` },
          mcq.length > 0 && { icon: Clock, text: `${minutesFor(mcq.length)} min` },
        ],
        best,
        status: best == null ? 'Not practised yet' : `Best ${best}% · ${mine.length} attempt${mine.length === 1 ? '' : 's'}`,
        lastResult: mine[0] && `/student/gseb/result/${mine[0].id}`,
        primary: {
          label: starting === c.id ? 'Starting…' : mine.length ? 'Practise again' : 'Practise MCQs', again: mine.length > 0,
          onClick: practise, disabled: !mcq.length || starting !== null,
        },
        partB: partBCount > 0 && { to: `/student/gseb/chapter/${shownSubject}/${c.id}`, count: partBCount },
      }
    })
  }
  const shown = cards && cards.filter(c => filter === 'all' || (filter === 'done') === c.attempted)

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>{user.name} ({user.roll_number})</span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="page-content gx" style={lookVars(shownSubject)}>
        <Link to="/student/dashboard" className="back-btn">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        <section className="gx-hero">
          <SubjectIcon className="gx-hero-art" size={220} strokeWidth={1} aria-hidden />
          <div>
            <div className="gx-eyebrow">GSEB · Std 12 Science · Group B</div>
            <h1>{GSEB_SUBJECT_LABELS[shownSubject]} Board Papers</h1>
            <p>Real Gujarat board questions, timed like the exam. 1 mark each, no negative marking.</p>
          </div>
          <div className="gx-stats">
            <div className="gx-stat"><b>{st.papersDone}<small>/{st.papers}</small></b><span>Papers done</span></div>
            <div className="gx-stat"><b>{st.chaptersDone}<small>/{st.chapters}</small></b><span>Chapters done</span></div>
            <div className="gx-stat"><b>{st.avgBest == null ? '–' : `${st.avgBest}%`}</b><span>Avg best</span></div>
          </div>
        </section>

        <div className="gx-subjects">
          {GSEB_SUBJECTS.map(s => {
            const Icon = lookOf(s.id).icon
            const sst = statsOf(s.id)
            return (
              <button key={s.id} className={`gx-subject${shownSubject === s.id ? ' on' : ''}`} style={lookVars(s.id)} onClick={() => setParam('subject', s.id)}>
                <span className="gx-subject-icon"><Icon size={22} /></span>
                <span>
                  <span className="gx-subject-name">{s.label}</span>
                  <span className="gx-subject-meta">{sst.papers} papers · {sst.mcq} MCQs</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="gx-toolbar">
          <div className="gx-seg" role="tablist">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={view === id} className={view === id ? 'on' : ''} onClick={() => setParam('view', id)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="gx-filter">
            {FILTERS.map(f => (
              <button key={f.id} className={`gx-chipbtn${filter === f.id ? ' on' : ''}`} onClick={() => setParam('show', f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        {!shown ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : cards.length === 0 ? (
          <div className="gx-empty">No papers for {GSEB_SUBJECT_LABELS[shownSubject]} yet.</div>
        ) : shown.length === 0 ? (
          <div className="gx-empty">{filter === 'done' ? 'Nothing attempted here yet. Pick one and start!' : 'All done here. Great work!'}</div>
        ) : (
          <div className="gx-grid">
            {shown.map(({ key, attempted: _a, ...card }) => <PracticeCard key={key} {...card} />)}
          </div>
        )}
      </div>
    </div>
  )
}
