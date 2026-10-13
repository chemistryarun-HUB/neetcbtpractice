import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Printer, Shuffle, RefreshCw } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { optionEntries, correctOptionKey } from '../../lib/questionOptions'
import { GSEB_SUBJECTS, GSEB_SUBJECT_LABELS, chaptersOf, paperTag, buildCustomPaper } from '../../lib/gseb'
import { fetchGsebBank } from '../../lib/gsebBank'

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
const SUB_MARKS = [2, 3, 4]
const SECTION_NAMES = ['B', 'C', 'D', 'E']

function Num({ label, value, onChange, max }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 600 }}>
      {label}
      <input className="form-control" type="number" min={0} max={max} value={value} style={{ width: 90 }}
        onChange={e => onChange(Math.max(0, Math.min(Number(e.target.value) || 0, max ?? 999)))} />
      {max !== undefined && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>{max} available</span>}
    </label>
  )
}

// Teacher's paper generator: pick chapters, years and how many questions of
// each kind, get a printable paper built from past GSEB board questions, then
// swap any question you don't like and print (or save as PDF) with the key.
export default function AdminGsebGenerator() {
  const [subject, setSubject] = useState('chemistry')
  const [bank, setBank] = useState(null)
  const [chapters, setChapters] = useState(new Set())
  const [years, setYears] = useState(new Set())
  const [mcqCount, setMcqCount] = useState(20)
  const [subCounts, setSubCounts] = useState({ 2: 4, 3: 3, 4: 2 })
  const [title, setTitle] = useState('Unit Test')
  const [minutes, setMinutes] = useState(90)
  const [showYear, setShowYear] = useState(true)
  const [withKey, setWithKey] = useState(true)
  const [paper, setPaper] = useState(null)

  useEffect(() => {
    let live = true
    setBank(null)
    setPaper(null)
    fetchGsebBank(subject).then(b => {
      if (!live) return
      setBank(b)
      setChapters(new Set(chaptersOf(subject).map(c => c.id)))
      setYears(new Set(b.papers.map(p => p.year)))
    }).catch(err => toast.error(err.message))
    return () => { live = false }
  }, [subject])

  const pool = useMemo(() => {
    if (!bank) return { mcq: [], subjective: [] }
    const keep = q => chapters.has(q.chapter_no) && years.has(q.paper.year)
    return { mcq: bank.mcq.filter(q => keep(q) && q.correct_option), subjective: bank.subjective.filter(keep) }
  }, [bank, chapters, years])

  function generate() {
    const built = buildCustomPaper(pool.mcq, pool.subjective, { mcq: mcqCount, subjective: subCounts })
    if (built.short.length) toast(`Not enough questions for: ${built.short.join(', ')}`, { duration: 6000 })
    setPaper(built)
  }

  // Replace one question with another from the same pool (same marks), same
  // chapter if one is free, so the paper's balance doesn't shift.
  function swap(kind, marks, q) {
    setPaper(prev => {
      const used = new Set([...prev.mcq, ...Object.values(prev.subjective).flat()].map(x => x.id))
      const candidates = (kind === 'mcq' ? pool.mcq : pool.subjective.filter(x => x.marks === Number(marks)))
        .filter(x => !used.has(x.id))
      const same = candidates.filter(x => x.chapter_no === q.chapter_no)
      const choices = same.length ? same : candidates
      if (!choices.length) { toast('No other question left to swap in'); return prev }
      const next = choices[Math.floor(Math.random() * choices.length)]
      if (kind === 'mcq') return { ...prev, mcq: prev.mcq.map(x => x.id === q.id ? next : x) }
      return { ...prev, subjective: { ...prev.subjective, [marks]: prev.subjective[marks].map(x => x.id === q.id ? next : x) } }
    })
  }

  const allChapters = chaptersOf(subject)
  const allYears = bank ? [...new Set(bank.papers.map(p => p.year))].sort((a, b) => b - a) : []
  const subjectiveAvail = m => pool.subjective.filter(q => q.marks === m).length
  const sections = paper ? SUB_MARKS.filter(m => paper.subjective[m]?.length) : []
  const totalMarks = paper ? paper.mcq.length + sections.reduce((t, m) => t + m * paper.subjective[m].length, 0) : 0
  const tag = q => showYear && q.paper ? <span className="gp-tag">[GSEB {paperTag(q.paper)}]</span> : null

  function toggle(setter, id) {
    setter(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }

  return (
    <div className="dashboard">
      <div className="no-print"><Topbar links={NAV} /></div>
      <div className="page-content">
        <div className="no-print">
          <Link to="/admin/gseb" className="back-btn" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
            <ArrowLeft size={16} /> All GSEB papers
          </Link>
          <div className="page-header"><h2>Paper Generator</h2></div>

          <div className="tabs">
            {GSEB_SUBJECTS.map(s => (
              <button key={s.id} className={`tab-btn ${subject === s.id ? 'active' : ''}`} onClick={() => setSubject(s.id)}>{s.label}</button>
            ))}
          </div>

          {!bank ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
            : !bank.papers.length ? <div className="empty-state">No published {GSEB_SUBJECT_LABELS[subject]} papers yet.</div> : (
            <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Chapters</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.3rem 1rem' }}>
                  {allChapters.map(c => (
                    <label key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={chapters.has(c.id)} onChange={() => toggle(setChapters, c.id)} /> {c.id}. {c.name}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setChapters(new Set(allChapters.map(c => c.id)))}>All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setChapters(new Set())}>None</button>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Board years</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {allYears.map(y => (
                    <label key={y} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={years.has(y)} onChange={() => toggle(setYears, y)} /> {y}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Num label="MCQs (1 mark)" value={mcqCount} onChange={setMcqCount} max={pool.mcq.length} />
                {SUB_MARKS.map(m => (
                  <Num key={m} label={`${m}-mark questions`} value={subCounts[m]} max={subjectiveAvail(m)}
                    onChange={v => setSubCounts(c => ({ ...c, [m]: v }))} />
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                  Paper title
                  <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} style={{ width: 260 }} />
                </label>
                <Num label="Time (minutes)" value={minutes} onChange={setMinutes} />
                <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={showYear} onChange={e => setShowYear(e.target.checked)} /> Show board year on each question
                </label>
                <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={withKey} onChange={e => setWithKey(e.target.checked)} /> Answer key at the end
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={generate} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {paper ? <RefreshCw size={16} /> : <Shuffle size={16} />} {paper ? 'Generate again' : 'Generate paper'}
                </button>
                {paper && (
                  <button className="btn btn-outline" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Printer size={16} /> Print / Save PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {paper && (
          <div className="gseb-print">
            <div className="gp-head">
              <div className="gp-title">{title}</div>
              <div>{GSEB_SUBJECT_LABELS[subject]} · Std 12 Science</div>
              <div className="gp-meta"><span>Time: {minutes} min</span><span>Total marks: {totalMarks}</span></div>
            </div>

            {paper.mcq.length > 0 && (
              <section>
                <div className="gp-section">Section A · Choose the correct option ({paper.mcq.length} × 1 = {paper.mcq.length} marks)</div>
                <ol className="gp-list">
                  {paper.mcq.map(q => (
                    <li key={q.id}>
                      <div className="gp-q">{q.question}{' '}{tag(q)}
                        <button className="no-print gp-swap" title="Swap for another question" onClick={() => swap('mcq', 1, q)}><Shuffle size={13} /></button>
                      </div>
                      {q.question_image && <img src={q.question_image} alt="" className="gp-img" />}
                      <div className="gp-opts">
                        {optionEntries(q).map((o, i) => (
                          <div key={o.key}>({LETTERS[i]}) {o.text}{o.image && <img src={o.image} alt="" className="gp-img" />}</div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {sections.map((m, i) => (
              <section key={m}>
                <div className="gp-section">
                  Section {SECTION_NAMES[i]} · Answer the following ({paper.subjective[m].length} × {m} = {paper.subjective[m].length * m} marks)
                </div>
                <ol className="gp-list">
                  {paper.subjective[m].map(q => (
                    <li key={q.id}>
                      <div className="gp-q">{q.question}{' '}{tag(q)}
                        <button className="no-print gp-swap" title="Swap for another question" onClick={() => swap('sub', m, q)}><Shuffle size={13} /></button>
                      </div>
                      {q.question_image && <img src={q.question_image} alt="" className="gp-img" />}
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            {withKey && (
              <section className="gp-key">
                <div className="gp-title" style={{ fontSize: '1.1rem' }}>Answer key · {title}</div>
                {paper.mcq.length > 0 && (
                  <div className="gp-keygrid">
                    {paper.mcq.map((q, i) => {
                      const k = correctOptionKey(q)
                      return <span key={q.id}>{i + 1}. {k ? LETTERS[Number(k.slice(-1)) - 1] : '?'}</span>
                    })}
                  </div>
                )}
                {sections.map((m, i) => paper.subjective[m].some(q => q.answer || q.answer_image) && (
                  <div key={m}>
                    <div className="gp-section">Section {SECTION_NAMES[i]} · model answers</div>
                    <ol className="gp-list">
                      {paper.subjective[m].map(q => (
                        <li key={q.id}>
                          {q.answer || <em>No model answer added.</em>}
                          {q.answer_image && <img src={q.answer_image} alt="" className="gp-img" />}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
