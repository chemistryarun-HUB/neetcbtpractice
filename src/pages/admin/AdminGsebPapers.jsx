import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Shuffle, BarChart3, CalendarDays, BookOpen, ListChecks, Users, Flame, TrendingUp, KeyRound, PencilLine, ListTree,
} from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import GsebPdfButton from '../../components/shared/GsebPdfButton'
import { lookOf, lookVars, PracticeCard, SkeletonGrid, chapterOfAttempt, answeredOf, pctOf } from '../../components/shared/GsebHub'
import { supabase } from '../../lib/supabase'
import { GSEB_SUBJECTS, GSEB_MEDIUM_LABELS, GSEB_EXAM_LABELS, GSEB_SUBJECT_LABELS, chaptersOf } from '../../lib/gseb'

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

const BLANK_FORM = {
  subject: 'physics', paper_code: '054', year: new Date().getFullYear(),
  session: 'march', medium: 'en', set_no: '', duration_min: 60, mcq_count: 50,
}

const VIEWS = [
  { id: 'years', label: 'Year-wise papers', icon: CalendarDays },
  { id: 'chapters', label: 'Chapter-wise', icon: BookOpen },
]
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
]
const SORTS = [
  { id: 'syllabus', label: 'Syllabus order' },
  { id: 'asked', label: 'Most asked' },
]
const HOT_CHAPTERS = 3

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

// Each student's best, averaged. The admin sees it from the first student.
function classAverage(list, pct) {
  const best = {}
  for (const a of list) best[a.student_id] = Math.max(best[a.student_id] ?? 0, pct(a))
  const vals = Object.values(best)
  return vals.length ? Math.round(vals.reduce((t, x) => t + x, 0) / vals.length) : null
}

// The student GSEB hub's look, with admin cards: every paper (drafts too),
// upload and key status, how students did, and the way into editing.
export default function AdminGsebPapers() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [attempts, setAttempts] = useState([])
  const [banks, setBanks] = useState({}) // subject -> { mcq, subjective } of chapter numbers
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [params, setParams] = useSearchParams()
  const view = VIEWS.some(v => v.id === params.get('view')) ? params.get('view') : 'years'
  const filter = FILTERS.some(f => f.id === params.get('show')) ? params.get('show') : 'all'
  const sort = SORTS.some(x => x.id === params.get('sort')) ? params.get('sort') : 'syllabus'
  const subject = GSEB_SUBJECTS.some(x => x.id === params.get('subject')) ? params.get('subject') : GSEB_SUBJECTS[0].id
  function setParam(key, value) {
    setParams(p => { const n = new URLSearchParams(p); n.set(key, value); return n }, { replace: true })
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Embedded counts rather than every question row: a plain select is
      // capped at 1,000 rows, which 20 papers of 50 MCQs already reach.
      const [paperRows, attemptRows] = await Promise.all([
        fetchAll(() => supabase.from('gseb_papers').select('*, gseb_questions(count), gseb_subjective(count)')
          .order('year', { ascending: false }).order('session').order('set_no')),
        fetchAll(() => supabase.from('gseb_attempts')
          .select('id, student_id, paper_id, mode, subject, title, score, correct_count, wrong_count, skipped_count')
          .eq('submitted', true)),
      ])
      setPapers(paperRows)
      setAttempts(attemptRows)
      setBanks({})
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  // Chapter numbers of every question of the shown subject, drafts included.
  useEffect(() => {
    if (loading || banks[subject]) return
    const ids = papers.filter(p => p.subject === subject).map(p => p.id)
    let live = true
    Promise.all(ids.length ? [
      fetchAll(() => supabase.from('gseb_questions').select('id, paper_id, chapter_no').in('paper_id', ids).order('id')),
      fetchAll(() => supabase.from('gseb_subjective').select('id, paper_id, chapter_no').in('paper_id', ids).order('id')),
    ] : [[], []])
      .then(([mcq, subjective]) => { if (live) setBanks(b => ({ ...b, [subject]: { mcq, subjective } })) })
      .catch(err => { toast.error(err.message); if (live) setBanks(b => ({ ...b, [subject]: { mcq: [], subjective: [] } })) })
    return () => { live = false }
  }, [loading, subject, banks, papers])

  async function handleCreate(e) {
    e.preventDefault()
    const year = Number(form.year)
    if (!year || year < 2000 || year > 2100) { toast.error('Enter a valid year'); return }
    setSaving(true)
    const { error } = await supabase.from('gseb_papers').insert({
      ...form,
      year,
      set_no: String(form.set_no).trim(),
      paper_code: form.paper_code.trim() || null,
      duration_min: Number(form.duration_min) || 60,
      mcq_count: Number(form.mcq_count) || 50,
    })
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? 'That paper (subject, year, session, medium, set) already exists' : error.message)
      return
    }
    toast.success('Paper created. Open it to upload questions.')
    setShowForm(false)
    setForm(BLANK_FORM)
    load()
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const paperById = Object.fromEntries(papers.map(p => [p.id, p]))
  const paperPct = a => pctOf(a.score || 0, paperById[a.paper_id]?.mcq_count)
  const chapterPct = a => pctOf(a.score || 0, answeredOf(a))
  const byPaper = {}, byChapter = {}
  for (const a of attempts) {
    if (a.paper_id) (byPaper[a.paper_id] ||= []).push(a)
    const ch = a.mode === 'chapter' && chapterOfAttempt(a)
    if (ch) (byChapter[`${a.subject}:${ch}`] ||= []).push(a)
  }
  const statsOf = s => {
    const ps = papers.filter(p => p.subject === s)
    return {
      papers: ps.length,
      published: ps.filter(p => p.is_published).length,
      mcq: ps.reduce((t, p) => t + (p.gseb_questions?.[0]?.count || 0), 0),
      attempts: attempts.filter(a => a.subject === s).length,
    }
  }
  const st = statsOf(subject)
  const SubjectIcon = lookOf(subject).icon
  const shownPapers = papers.filter(p => p.subject === subject)
  const bank = banks[subject]
  const times = n => `${n} attempt${n === 1 ? '' : 's'}`

  let cards = null
  if (view === 'years') {
    const newest = shownPapers.find(p => p.is_published)?.year
    cards = shownPapers
      .filter(p => filter === 'all' || (filter === 'published') === !!p.is_published)
      .map(p => {
        const uploaded = p.gseb_questions?.[0]?.count || 0
        const partB = p.gseb_subjective?.[0]?.count || 0
        const tried = byPaper[p.id] || []
        return {
          key: p.id,
          badgeTop: p.session === 'july' ? 'Supp.' : 'Main', badgeMain: p.year,
          title: GSEB_EXAM_LABELS[p.session] || p.session,
          sub: [GSEB_MEDIUM_LABELS[p.medium], p.set_no && `Set ${p.set_no}`, p.paper_code && `Code ${p.paper_code}`].filter(Boolean).join(' · '),
          chips: [
            p.is_published && p.year === newest && { icon: Flame, text: 'Latest', tone: 'hot' },
            { icon: ListChecks, text: `${uploaded}/${p.mcq_count} MCQs`, tone: uploaded < p.mcq_count ? 'hot' : '' },
            { icon: KeyRound, text: p.key_status === 'final' ? 'Key final' : 'Key provisional' },
            tried.length > 0 && { icon: Users, text: times(tried.length) },
          ],
          best: classAverage(tried, paperPct), ringEmpty: 'AVG',
          done: !!p.is_published,
          status: p.is_published ? `Published${tried.length ? ` · class avg ${classAverage(tried, paperPct)}%` : ' · no attempts yet'}` : 'Draft · students cannot see it',
          primary: { label: 'Open & edit', icon: PencilLine, onClick: () => navigate(`/admin/gseb/${p.id}`) },
          partB: { to: `/admin/gseb/${p.id}?tab=B`, count: partB },
          extra: uploaded > 0 && <GsebPdfButton paper={p} className="gx-ghost" />,
        }
      })
  } else if (bank) {
    const n = shownPapers.length || 1
    const info = chaptersOf(subject).map(c => ({
      c,
      mcq: bank.mcq.filter(q => q.chapter_no === c.id).length,
      partB: bank.subjective.filter(q => q.chapter_no === c.id).length,
      tried: byChapter[`${subject}:${c.id}`] || [],
    }))
    const hot = new Set([...info].sort((a, b) => b.mcq - a.mcq).slice(0, HOT_CHAPTERS).filter(x => x.mcq).map(x => x.c.id))
    const years = shownPapers.map(p => p.year)
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : ''
    const perPaper = x => { const k = Math.round(x.mcq / n); return x.mcq / n < 1 ? '<1 MCQ / paper' : `~${k} MCQ${k === 1 ? '' : 's'} / paper` }
    cards = info.map(x => ({
      key: x.c.id, order: -x.mcq,
      badgeTop: 'Ch', badgeMain: x.c.id,
      title: x.c.name,
      sub: span ? `All papers ${span}` : 'All papers',
      chips: [
        hot.has(x.c.id) && { icon: Flame, text: 'Most asked', tone: 'hot' },
        { icon: ListChecks, text: `${x.mcq} MCQs` },
        x.mcq > 0 && { icon: TrendingUp, text: perPaper(x) },
        x.tried.length > 0 && { icon: Users, text: times(x.tried.length) },
      ],
      best: classAverage(x.tried, chapterPct), ringEmpty: 'AVG',
      done: x.tried.length > 0,
      status: x.tried.length ? `Students practised it · class avg ${classAverage(x.tried, chapterPct)}%` : 'Not practised by students yet',
      primary: { label: 'Review MCQs', icon: ListTree, onClick: () => navigate(`/admin/gseb/chapters?subject=${subject}&ch=${x.c.id}&part=A`), disabled: !x.mcq },
      partB: x.partB > 0 && { to: `/admin/gseb/chapters?subject=${subject}&ch=${x.c.id}&part=B`, count: x.partB },
      extra: (x.mcq > 0 || x.partB > 0) && (
        <GsebPdfButton chapter={{ subject, chapter: x.c.id, mcqCount: x.mcq, writtenCount: x.partB, includeDrafts: true }} className="gx-ghost" />
      ),
    }))
    if (sort === 'asked') cards.sort((a, b) => a.order - b.order)
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content gx" style={lookVars(subject)}>
        <div className="gx-admin-actions">
          <Link to="/admin/gseb/performance" className="btn btn-outline btn-sm"><BarChart3 size={15} /> Student Performance</Link>
          <Link to={`/admin/gseb/generate?subject=${subject}`} className="btn btn-outline btn-sm"><Shuffle size={15} /> Paper Generator</Link>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const sub = GSEB_SUBJECTS.find(x => x.id === subject)
            if (!showForm) setForm(f => ({ ...f, subject: sub.id, paper_code: sub.paperCode }))
            setShowForm(s => !s)
          }}><Plus size={15} /> Add Paper</button>
        </div>

        {showForm && (
          <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Subject</label>
                  <select className="form-control" value={form.subject}
                    onChange={e => {
                      const s = GSEB_SUBJECTS.find(x => x.id === e.target.value)
                      setForm(f => ({ ...f, subject: s.id, paper_code: s.paperCode }))
                    }}>
                    {GSEB_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Year</label>
                  <input className="form-control" type="number" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Session</label>
                  <select className="form-control" value={form.session}
                    onChange={e => setForm(f => ({ ...f, session: e.target.value }))}>
                    {Object.entries(GSEB_EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Medium</label>
                  <select className="form-control" value={form.medium}
                    onChange={e => setForm(f => ({ ...f, medium: e.target.value }))}>
                    {Object.entries(GSEB_MEDIUM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Set No</label>
                  <input className="form-control" placeholder="e.g. 15" value={form.set_no}
                    onChange={e => setForm(f => ({ ...f, set_no: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Paper Code</label>
                  <input className="form-control" value={form.paper_code}
                    onChange={e => setForm(f => ({ ...f, paper_code: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>MCQs</label>
                  <input className="form-control" type="number" value={form.mcq_count}
                    onChange={e => setForm(f => ({ ...f, mcq_count: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Minutes</label>
                  <input className="form-control" type="number" value={form.duration_min}
                    onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Create Paper'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setForm(BLANK_FORM) }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <section className="gx-hero">
          <SubjectIcon className="gx-hero-art" size={220} strokeWidth={1} aria-hidden />
          <div>
            <div className="gx-eyebrow">Admin · GSEB · Std 12 Science</div>
            <h1>{GSEB_SUBJECT_LABELS[subject]} Board Papers</h1>
            <p>Upload, check and publish papers. Students see only published papers.</p>
          </div>
          <div className="gx-stats">
            <div className="gx-stat"><b>{st.published}<small>/{st.papers}</small></b><span>Published</span></div>
            <div className="gx-stat"><b>{st.mcq}</b><span>MCQs</span></div>
            <div className="gx-stat"><b>{st.attempts}</b><span>Student attempts</span></div>
          </div>
        </section>

        <div className="gx-subjects">
          {GSEB_SUBJECTS.map(x => {
            const Icon = lookOf(x.id).icon
            const sst = statsOf(x.id)
            return (
              <button key={x.id} className={`gx-subject${subject === x.id ? ' on' : ''}`} style={lookVars(x.id)} onClick={() => setParam('subject', x.id)}>
                <span className="gx-subject-icon"><Icon size={22} /></span>
                <span>
                  <span className="gx-subject-name">{x.label}</span>
                  <span className="gx-subject-meta">{sst.papers} papers{sst.papers - sst.published ? ` · ${sst.papers - sst.published} draft${sst.papers - sst.published === 1 ? '' : 's'}` : ' · all published'}</span>
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
            {view === 'chapters' ? SORTS.map(x => (
              <button key={x.id} className={`gx-chipbtn${sort === x.id ? ' on' : ''}`} onClick={() => setParam('sort', x.id)}>
                {x.id === 'asked' && <Flame size={13} />} {x.label}
              </button>
            )) : FILTERS.map(f => (
              <button key={f.id} className={`gx-chipbtn${filter === f.id ? ' on' : ''}`} onClick={() => setParam('show', f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        {!cards ? (
          <SkeletonGrid />
        ) : cards.length === 0 ? (
          <div className="gx-empty">
            {view === 'years' && filter !== 'all' ? `No ${filter === 'draft' ? 'draft' : 'published'} ${GSEB_SUBJECT_LABELS[subject]} papers.` : <>No {GSEB_SUBJECT_LABELS[subject]} papers yet. Click <b>Add Paper</b> to create one.</>}
          </div>
        ) : (
          <div className="gx-grid">
            {cards.map(({ key, order: _o, ...card }) => <PracticeCard key={key} {...card} />)}
          </div>
        )}
      </div>
    </div>
  )
}
