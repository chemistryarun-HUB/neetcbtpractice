import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, ArrowLeft, Play, RotateCcw, FileText, Atom, FlaskConical, Dna, Sigma, CalendarDays, BookOpen,
  ListChecks, CheckCircle2, Sparkles, Users, Flame, Target, TrendingUp, Trophy,
} from 'lucide-react'
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
const SORTS = [
  { id: 'syllabus', label: 'Syllabus order' },
  { id: 'asked', label: 'Most asked' },
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

// Only ids, chapters and marks: the cards count and pick, the test loads the rest.
const LIGHT = { mcqSelect: 'id, paper_id, q_no, chapter_no', subjectiveSelect: 'id, paper_id, q_no, chapter_no, marks' }
const HOT_CHAPTERS = 3          // how many chapters get the "Most asked" tag
const CLASS_MIN_STUDENTS = 3    // below this a class average would give one student's score away
const WEAK_BELOW = 60           // a chapter best under this is suggested for another go

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

// Chapter practice attempts are titled "Physics · Ch 4 Moving Charges…".
const chapterOfAttempt = a => Number(a.title?.match(/· Ch (\d+)\b/)?.[1]) || null
const answeredOf = a => (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
const pctOf = (score, total) => total ? Math.min(100, Math.round((score / total) * 100)) : 0
const scoreColor = p => p >= 70 ? '#16a34a' : p >= 40 ? '#d97706' : '#dc2626'

// Each student's best on one paper or chapter, averaged over the class.
function classAverage(list, pct) {
  const best = {}
  for (const a of list) best[a.student_id] = Math.max(best[a.student_id] ?? 0, pct(a))
  const vals = Object.values(best)
  return vals.length >= CLASS_MIN_STUDENTS ? Math.round(vals.reduce((t, x) => t + x, 0) / vals.length) : null
}

function Ring({ pct }) {
  const r = 21, c = 2 * Math.PI * r
  return (
    <svg className="gx-ring" width="54" height="54" viewBox="0 0 54 54" aria-label={pct == null ? 'Not attempted' : `Best ${pct}%`}>
      <circle cx="27" cy="27" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="5" />
      {pct != null && (
        <circle className="gx-ring-arc" cx="27" cy="27" r={r} fill="none" stroke={scoreColor(pct)} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ '--full': c }} transform="rotate(-90 27 27)" />
      )}
      <text x="27" y="31" textAnchor="middle" fontSize={pct == null ? 10 : 12} fontWeight="800" fill={pct == null ? 'var(--gray-400)' : 'var(--gray-800)'}>
        {pct == null ? 'NEW' : `${pct}%`}
      </text>
    </svg>
  )
}

// One card shape for both views: a year paper and a chapter read the same way.
function PracticeCard({ badgeTop, badgeMain, title, sub, chips, best, status, versus, lastResult, primary, partB }) {
  return (
    <div className="gx-card">
      <div className="gx-card-head">
        <div className="gx-badge"><small>{badgeTop}</small><b>{badgeMain}</b></div>
        <div style={{ minWidth: 0 }}>
          <div className="gx-card-title" title={title}>{title}</div>
          <div className="gx-card-sub">{sub}</div>
        </div>
        <Ring pct={best} />
      </div>
      <div className="gx-chips">
        {chips.filter(Boolean).map(({ icon: Icon, text, tone }) => (
          <span key={text} className={`gx-chip${tone ? ` ${tone}` : ''}`}><Icon size={13} /> {text}</span>
        ))}
      </div>
      <div className={`gx-status${best != null ? ' done' : ''}`}>
        {best != null ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
        <span>{status}</span>
        {versus != null && <span className={`gx-vs ${versus >= 0 ? 'up' : 'down'}`}>{versus >= 0 ? '+' : ''}{versus}% vs class</span>}
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

function SkeletonGrid() {
  return (
    <div className="gx-grid" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="gx-card gx-skel">
          <div className="gx-card-head"><i className="sk sk-badge" /><div style={{ flex: 1 }}><i className="sk sk-line" /><i className="sk sk-line short" /></div></div>
          <i className="sk sk-line" style={{ width: '55%' }} />
          <i className="sk sk-btn" />
        </div>
      ))}
    </div>
  )
}

export default function StudentGsebPapers() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [allAttempts, setAllAttempts] = useState([]) // every student's, for class averages
  const [banks, setBanks] = useState({})             // subject -> light bank
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [params, setParams] = useSearchParams()
  const view = VIEWS.some(v => v.id === params.get('view')) ? params.get('view') : 'years'
  const filter = FILTERS.some(f => f.id === params.get('show')) ? params.get('show') : 'all'
  const sort = SORTS.some(s => s.id === params.get('sort')) ? params.get('sort') : 'syllabus'
  const subject = GSEB_SUBJECTS.some(s => s.id === params.get('subject')) ? params.get('subject') : null
  // View, subject, filter and sort live in the URL so "back" from a test lands on the same place.
  function setParam(key, value) {
    setParams(p => { const n = new URLSearchParams(p); n.set(key, value); return n }, { replace: true })
  }

  useEffect(() => {
    async function load() {
      try {
        const [paperRows, attemptRows] = await Promise.all([
          fetchAll(() => supabase.from('gseb_papers').select('*, gseb_subjective(count)').eq('is_published', true)
            .order('year', { ascending: false }).order('session').order('set_no')),
          fetchAll(() => supabase.from('gseb_attempts')
            .select('id, student_id, paper_id, mode, subject, title, score, correct_count, wrong_count, skipped_count, submitted_at')
            .eq('submitted', true).order('submitted_at', { ascending: false })),
        ])
        setPapers(paperRows)
        setAllAttempts(attemptRows)
      } catch (err) {
        toast.error(err.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Open on the first subject that actually has a paper.
  const shownSubject = subject || GSEB_SUBJECTS.find(s => papers.some(p => p.subject === s.id))?.id || GSEB_SUBJECTS[0].id

  useEffect(() => {
    if (loading || banks[shownSubject]) return
    let live = true
    fetchGsebBank(shownSubject, LIGHT)
      .then(b => { if (live) setBanks(prev => ({ ...prev, [shownSubject]: b })) })
      .catch(err => { toast.error(err.message); if (live) setBanks(prev => ({ ...prev, [shownSubject]: { papers: [], mcq: [], subjective: [] } })) })
    return () => { live = false }
  }, [loading, shownSubject, banks])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const paperById = Object.fromEntries(papers.map(p => [p.id, p]))
  const paperPct = a => pctOf(a.score || 0, paperById[a.paper_id]?.mcq_count)
  const chapterPct = a => pctOf(a.score || 0, answeredOf(a))
  // Attempts grouped per paper and per subject:chapter, mine and the class's.
  const byPaper = {}, byChapter = {}
  for (const a of allAttempts) {
    if (a.paper_id) (byPaper[a.paper_id] ||= []).push(a)
    const ch = a.mode === 'chapter' && chapterOfAttempt(a)
    if (ch) (byChapter[`${a.subject}:${ch}`] ||= []).push(a)
  }
  const mineOf = list => (list || []).filter(a => a.student_id === user.id)
  const bestOf = (list, pct) => list.length ? Math.max(...list.map(pct)) : null

  const statsOf = s => {
    const ps = papers.filter(p => p.subject === s)
    const bests = ps.map(p => bestOf(mineOf(byPaper[p.id]), paperPct)).filter(x => x != null)
    return {
      papers: ps.length,
      mcq: ps.reduce((t, p) => t + (p.mcq_count || 0), 0),
      papersDone: bests.length,
      chapters: chaptersOf(s).length,
      chaptersDone: chaptersOf(s).filter(c => mineOf(byChapter[`${s}:${c.id}`]).length).length,
      avgBest: bests.length ? Math.round(bests.reduce((t, x) => t + x, 0) / bests.length) : null,
    }
  }
  const st = statsOf(shownSubject)
  const SubjectIcon = lookOf(shownSubject).icon
  const bank = banks[shownSubject]

  async function practiseChapter(c, ids) {
    setStarting(c.id)
    try {
      const attemptId = await startGsebPractice({
        studentId: user.id, subject: shownSubject, mode: 'chapter', questionIds: ids,
        title: `${GSEB_SUBJECT_LABELS[shownSubject]} · Ch ${c.id} ${c.name}`,
      })
      navigate(`/student/gseb/practice/${attemptId}`)
    } catch (err) {
      toast.error(err.message)
      setStarting(null)
    }
  }

  // Chapter facts from the bank: questions, how often the board asks it, my best.
  const chapterInfo = bank && chaptersOf(shownSubject).map(c => {
    const mcq = bank.mcq.filter(q => q.chapter_no === c.id)
    const sub = bank.subjective.filter(q => q.chapter_no === c.id)
    const n = bank.papers.length || 1
    const mine = mineOf(byChapter[`${shownSubject}:${c.id}`])
    return {
      c, mcq, ids: [...mcq].sort(byYearThenNumber).map(q => q.id),
      partB: sub.length, perPaper: mcq.length / n, partBMarks: sub.reduce((t, q) => t + (q.marks || 0), 0) / n,
      mine, best: bestOf(mine, chapterPct), cls: classAverage(byChapter[`${shownSubject}:${c.id}`] || [], chapterPct),
    }
  })
  const hot = new Set(chapterInfo ? [...chapterInfo].sort((a, b) => b.mcq.length - a.mcq.length).slice(0, HOT_CHAPTERS).filter(x => x.mcq.length).map(x => x.c.id) : [])
  const mcqs = n => `${n} MCQ${n === 1 ? '' : 's'}`
  const perPaperText = x => x < 1 ? '<1 MCQ / paper' : `~${mcqs(Math.round(x))} / paper`
  const askedText = x => x < 1 ? 'The board asks it less than once a paper.' : `The board asks about ${mcqs(Math.round(x))} per paper from it.`

  // "Your next step": the weakest or most-asked untouched chapter, and a paper.
  const shownPapers = papers.filter(p => p.subject === shownSubject)
  const next = []
  if (chapterInfo) {
    const weak = chapterInfo.filter(x => x.best != null && x.best < WEAK_BELOW && x.mcq.length).sort((a, b) => a.best - b.best)[0]
    const fresh = chapterInfo.filter(x => x.best == null && x.mcq.length).sort((a, b) => b.mcq.length - a.mcq.length)[0]
    const pick = weak || fresh
    if (pick) next.push({
      icon: weak ? TrendingUp : Flame,
      label: weak ? 'Fix a weak spot' : 'Most asked, not practised yet',
      title: `Ch ${pick.c.id} · ${pick.c.name}`,
      why: weak ? `Your best is ${pick.best}%. ${askedText(pick.perPaper)}` : askedText(pick.perPaper),
      cta: weak ? 'Practise again' : 'Practise MCQs', busy: starting === pick.c.id,
      onClick: () => practiseChapter(pick.c, pick.ids),
    })
  }
  const nextPaper = shownPapers.find(p => !mineOf(byPaper[p.id]).length)
  const lowPaper = !nextPaper && [...shownPapers].sort((a, b) => bestOf(mineOf(byPaper[a.id]), paperPct) - bestOf(mineOf(byPaper[b.id]), paperPct))[0]
  if (nextPaper || lowPaper) {
    const p = nextPaper || lowPaper
    next.push({
      icon: nextPaper ? Target : Trophy,
      label: nextPaper ? 'Next full paper' : 'Beat your best',
      title: `${p.year} · ${GSEB_EXAM_LABELS[p.session]}`,
      why: nextPaper ? `${p.mcq_count} MCQs in ${p.duration_min} min, just like the board exam.` : `Your best here is ${bestOf(mineOf(byPaper[p.id]), paperPct)}%. Try to push it up.`,
      cta: nextPaper ? 'Start test' : 'Attempt again',
      onClick: () => navigate(`/student/gseb/test/${p.id}`),
    })
  }

  // Cards for the open view, in one shape.
  let cards = null
  if (view === 'years') {
    const newest = shownPapers[0]?.year
    cards = shownPapers.map(p => {
      const mine = mineOf(byPaper[p.id])
      const best = mine.length ? Math.max(...mine.map(a => a.score || 0)) : null
      const bestPct = best == null ? null : pctOf(best, p.mcq_count)
      const cls = classAverage(byPaper[p.id] || [], paperPct)
      const partBCount = p.gseb_subjective?.[0]?.count || 0
      return {
        key: p.id, attempted: mine.length > 0, order: 0,
        badgeTop: p.session === 'july' ? 'Supp.' : 'Main', badgeMain: p.year,
        title: GSEB_EXAM_LABELS[p.session] || p.session,
        sub: [GSEB_MEDIUM_LABELS[p.medium], p.set_no && `Set ${p.set_no}`, p.paper_code && `Code ${p.paper_code}`].filter(Boolean).join(' · '),
        chips: [
          p.year === newest && { icon: Sparkles, text: 'Latest', tone: 'hot' },
          { icon: ListChecks, text: `${mcqs(p.mcq_count)} · ${p.duration_min} min` },
          cls != null && { icon: Users, text: `Class avg ${cls}%` },
          p.key_status === 'provisional' && { icon: Sparkles, text: 'Provisional key' },
        ],
        best: bestPct,
        status: best == null ? 'Not attempted yet' : `Best ${best}/${p.mcq_count} · ${mine.length} attempt${mine.length === 1 ? '' : 's'}`,
        versus: bestPct != null && cls != null ? bestPct - cls : null,
        lastResult: mine[0] && `/student/gseb/result/${mine[0].id}`,
        primary: { label: mine.length ? 'Attempt again' : 'Start test', again: mine.length > 0, onClick: () => navigate(`/student/gseb/test/${p.id}`) },
        partB: partBCount > 0 && { to: `/student/gseb/paper/${p.id}/part-b`, count: partBCount },
      }
    })
  } else if (chapterInfo) {
    const years = bank.papers.map(p => p.year)
    const span = years.length ? (Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`) : ''
    cards = chapterInfo.map(x => ({
      key: x.c.id, attempted: x.mine.length > 0, order: -x.mcq.length,
      badgeTop: 'Ch', badgeMain: x.c.id,
      title: x.c.name,
      sub: span ? `Board questions ${span}` : 'Board questions',
      chips: [
        hot.has(x.c.id) && { icon: Flame, text: 'Most asked', tone: 'hot' },
        { icon: ListChecks, text: x.mcq.length ? `${mcqs(x.mcq.length)} · ${minutesFor(x.mcq.length)} min` : 'No MCQs yet' },
        x.mcq.length > 0 && { icon: TrendingUp, text: perPaperText(x.perPaper) },
        x.cls != null && { icon: Users, text: `Class avg ${x.cls}%` },
      ],
      best: x.best,
      status: x.best == null ? 'Not practised yet' : `Best ${x.best}% · ${x.mine.length} attempt${x.mine.length === 1 ? '' : 's'}`,
      versus: x.best != null && x.cls != null ? x.best - x.cls : null,
      lastResult: x.mine[0] && `/student/gseb/result/${x.mine[0].id}`,
      primary: {
        label: starting === x.c.id ? 'Starting…' : x.mine.length ? 'Practise again' : 'Practise MCQs', again: x.mine.length > 0,
        onClick: () => practiseChapter(x.c, x.ids), disabled: !x.mcq.length || starting !== null,
      },
      partB: x.partB > 0 && { to: `/student/gseb/chapter/${shownSubject}/${x.c.id}`, count: x.partB },
    }))
    if (sort === 'asked') cards.sort((a, b) => a.order - b.order)
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

        {/* Waits for the bank so the suggestions don't shuffle while it loads. */}
        {bank && next.length > 0 && (
          <section className="gx-next">
            <div className="gx-next-head"><Target size={16} /> Your next step</div>
            <div className="gx-next-grid">
              {next.map(n => (
                <div key={n.label} className="gx-next-item">
                  <span className="gx-next-icon"><n.icon size={20} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gx-next-label">{n.label}</div>
                    <div className="gx-next-title">{n.title}</div>
                    <div className="gx-next-why">{n.why}</div>
                  </div>
                  <button className="gx-go gx-go-sm" onClick={n.onClick} disabled={starting !== null}>
                    <Play size={14} /> {n.busy ? 'Starting…' : n.cta}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="gx-toolbar">
          <div className="gx-seg" role="tablist">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={view === id} className={view === id ? 'on' : ''} onClick={() => setParam('view', id)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="gx-filter">
            {view === 'chapters' && SORTS.map(s => (
              <button key={s.id} className={`gx-chipbtn${sort === s.id ? ' on' : ''}`} onClick={() => setParam('sort', s.id)}>
                {s.id === 'asked' && <Flame size={13} />} {s.label}
              </button>
            ))}
            {view === 'chapters' && <span className="gx-divider" />}
            {FILTERS.map(f => (
              <button key={f.id} className={`gx-chipbtn${filter === f.id ? ' on' : ''}`} onClick={() => setParam('show', f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        {!shown ? (
          <SkeletonGrid />
        ) : cards.length === 0 ? (
          <div className="gx-empty">No papers for {GSEB_SUBJECT_LABELS[shownSubject]} yet.</div>
        ) : shown.length === 0 ? (
          <div className="gx-empty">{filter === 'done' ? 'Nothing attempted here yet. Pick one and start!' : 'All done here. Great work!'}</div>
        ) : (
          <div className="gx-grid">
            {shown.map(({ key, attempted: _a, order: _o, ...card }) => <PracticeCard key={key} {...card} />)}
          </div>
        )}
      </div>
    </div>
  )
}
