import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Printer, Shuffle, RefreshCw, Download, Minus, Plus, Flame, Check, FileText } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import GsebPrintSheet from '../../components/shared/GsebPrintSheet'
import { lookOf, lookVars } from '../../components/shared/GsebHub'
import { supabase } from '../../lib/supabase'
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

const SUB_MARKS = [2, 3, 4]
const SECTION_NAMES = ['B', 'C', 'D', 'E']
const HOT_CHAPTERS = 5

// One "how many" tile: − / number / +, and how many the pool can give.
function Count({ label, value, onChange, max }) {
  const set = v => onChange(Math.max(0, Math.min(Number(v) || 0, max)))
  return (
    <div className={`gg-count${value ? ' on' : ''}`}>
      <div className="gg-count-label">{label}</div>
      <div className="gg-count-row">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} aria-label={`Fewer ${label}`}><Minus size={15} /></button>
        <input type="number" min={0} max={max} value={value} onChange={e => set(e.target.value)} aria-label={label} />
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`More ${label}`}><Plus size={15} /></button>
      </div>
      <div className="gg-count-max">{max} available</div>
    </div>
  )
}

function Step({ n, title, hint, right, children }) {
  return (
    <section className="gg-step">
      <div className="gg-step-head">
        <span className="gg-step-no">{n}</span>
        <div className="gg-step-text">
          <div className="gg-step-title">{title}</div>
          {hint && <div className="gg-step-hint">{hint}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

// Teacher's paper generator: pick chapters, years and how many questions of
// each kind, get a paper built from past GSEB board questions, swap any
// question you don't like, then download it as a two-column PDF (or print).
export default function AdminGsebGenerator() {
  const [params, setParams] = useSearchParams()
  const subject = GSEB_SUBJECTS.some(s => s.id === params.get('subject')) ? params.get('subject') : 'chemistry'
  const [published, setPublished] = useState([])
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
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    supabase.from('gseb_papers').select('subject, year').eq('is_published', true)
      .then(({ data }) => setPublished(data || []))
  }, [])

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

  // Questions per chapter within the chosen years, for the chapter chips.
  const perChapter = useMemo(() => {
    const out = {}
    if (bank) for (const q of [...bank.mcq, ...bank.subjective]) if (years.has(q.paper.year)) out[q.chapter_no] = (out[q.chapter_no] || 0) + 1
    return out
  }, [bank, years])

  // The board's favourite chapters by MCQ count over all years.
  const hot = useMemo(() => {
    if (!bank) return []
    const n = {}
    for (const q of bank.mcq) n[q.chapter_no] = (n[q.chapter_no] || 0) + 1
    return Object.entries(n).filter(([c]) => c !== 'null').sort((a, b) => b[1] - a[1]).slice(0, HOT_CHAPTERS).map(([c]) => Number(c))
  }, [bank])

  function generate() {
    const built = buildCustomPaper(pool.mcq, pool.subjective, { mcq: mcqCount, subjective: subCounts })
    if (built.short.length) toast(`Not enough questions for: ${built.short.join(', ')}`, { duration: 6000 })
    setPaper(built)
    setTimeout(() => document.getElementById('gg-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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

  async function downloadPdf() {
    setBusy('Preparing…')
    try {
      const { downloadGsebCustomPdf } = await import('../../lib/gsebPaperPdf')
      await downloadGsebCustomPdf({ subject, title, minutes, paper, showYear, withKey, onProgress: (d, t) => setBusy(`Page ${d} of ${t}…`) })
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err.message || 'Could not make the PDF')
    }
    setBusy(null)
  }

  const allChapters = chaptersOf(subject)
  const allYears = bank ? [...new Set(bank.papers.map(p => p.year))].sort((a, b) => b - a) : []
  const papersIn = y => bank.papers.filter(p => p.year === y).length
  const subjectiveAvail = m => pool.subjective.filter(q => q.marks === m).length
  const sections = paper ? SUB_MARKS.filter(m => paper.subjective[m]?.length) : []
  const totalMarks = paper ? paper.mcq.length + sections.reduce((t, m) => t + m * paper.subjective[m].length, 0) : 0
  const planned = Math.min(mcqCount, pool.mcq.length) + SUB_MARKS.reduce((t, m) => t + m * Math.min(subCounts[m], subjectiveAvail(m)), 0)
  const plannedQs = Math.min(mcqCount, pool.mcq.length) + SUB_MARKS.reduce((t, m) => t + Math.min(subCounts[m], subjectiveAvail(m)), 0)
  const tag = q => showYear && q.paper ? <span className="gp-tag">[GSEB {paperTag(q.paper)}]</span> : null
  const SubjectIcon = lookOf(subject).icon

  function toggle(setter, id) {
    setter(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }

  return (
    <div className="dashboard">
      <div className="no-print"><Topbar links={NAV} /></div>
      <div className="page-content gx" style={lookVars(subject)}>
        <div className="no-print">
          <div className="gx-admin-actions" style={{ justifyContent: 'space-between' }}>
            <Link to={`/admin/gseb?subject=${subject}`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> All GSEB papers</Link>
          </div>

          <section className="gx-hero">
            <SubjectIcon className="gx-hero-art" size={220} strokeWidth={1} aria-hidden />
            <div>
              <div className="gx-eyebrow">Admin · GSEB · Paper Generator</div>
              <h1>Make a {GSEB_SUBJECT_LABELS[subject]} test</h1>
              <p>Pick chapters, years and how many questions. Swap any question you don't like, then download a two-column PDF.</p>
            </div>
            <div className="gx-stats">
              <div className="gx-stat"><b>{bank ? pool.mcq.length : '–'}</b><span>MCQs</span></div>
              <div className="gx-stat"><b>{bank ? pool.subjective.length : '–'}</b><span>Written Qs</span></div>
              <div className="gx-stat"><b>{bank ? bank.papers.length : '–'}</b><span>Board papers</span></div>
            </div>
          </section>

          <div className="gx-subjects">
            {GSEB_SUBJECTS.map(x => {
              const Icon = lookOf(x.id).icon
              const n = published.filter(p => p.subject === x.id).length
              return (
                <button key={x.id} className={`gx-subject${subject === x.id ? ' on' : ''}`} style={lookVars(x.id)} onClick={() => setParams({ subject: x.id })}>
                  <span className="gx-subject-icon"><Icon size={22} /></span>
                  <span>
                    <span className="gx-subject-name">{x.label}</span>
                    <span className="gx-subject-meta">{n} published paper{n === 1 ? '' : 's'}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {!bank ? <div className="gx-empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
            : !bank.papers.length ? <div className="gx-empty">No published {GSEB_SUBJECT_LABELS[subject]} papers yet. Publish a paper first.</div> : (
            <div className="gg-layout">
              <div className="gg-steps">
                <Step n={1} title="Chapters" hint={`${chapters.size} of ${allChapters.length} chosen · the number is board questions in the chosen years`}
                  right={
                    <div className="gg-quick">
                      <button className="gx-chipbtn" onClick={() => setChapters(new Set(allChapters.map(c => c.id)))}>All</button>
                      <button className="gx-chipbtn" onClick={() => setChapters(new Set(hot))}><Flame size={13} /> Most asked</button>
                      <button className="gx-chipbtn" onClick={() => setChapters(new Set())}>None</button>
                    </div>
                  }>
                  <div className="gg-chips">
                    {allChapters.map(c => (
                      <button key={c.id} className={`gg-chip${chapters.has(c.id) ? ' on' : ''}`} onClick={() => toggle(setChapters, c.id)} aria-pressed={chapters.has(c.id)}>
                        <span className="gg-chip-no">{chapters.has(c.id) ? <Check size={13} strokeWidth={3} /> : c.id}</span>
                        <span className="gg-chip-name">{c.name}</span>
                        <span className="gg-chip-n">{perChapter[c.id] || 0}</span>
                      </button>
                    ))}
                  </div>
                </Step>

                <Step n={2} title="Board years" hint="Questions come only from papers of these years">
                  <div className="gx-filter gg-wrap">
                    {allYears.map(y => (
                      <button key={y} className={`gx-chipbtn${years.has(y) ? ' on' : ''}`} onClick={() => toggle(setYears, y)} aria-pressed={years.has(y)}>
                        {years.has(y) && <Check size={13} strokeWidth={3} />} {y} <small style={{ opacity: 0.7 }}>· {papersIn(y)} paper{papersIn(y) === 1 ? '' : 's'}</small>
                      </button>
                    ))}
                  </div>
                </Step>

                <Step n={3} title="How many questions" hint="Picked across the chosen chapters so no one chapter takes over">
                  <div className="gg-counts">
                    <Count label="MCQs · 1 mark" value={mcqCount} onChange={setMcqCount} max={pool.mcq.length} />
                    {SUB_MARKS.map(m => (
                      <Count key={m} label={`${m}-mark written`} value={subCounts[m]} max={subjectiveAvail(m)}
                        onChange={v => setSubCounts(c => ({ ...c, [m]: v }))} />
                    ))}
                  </div>
                </Step>

                <Step n={4} title="Paper details">
                  <div className="gg-details">
                    <label className="gg-field" style={{ flex: '2 1 220px' }}>
                      <span>Paper title</span>
                      <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
                    </label>
                    <label className="gg-field" style={{ flex: '1 1 120px' }}>
                      <span>Time (minutes)</span>
                      <input className="form-control" type="number" min={5} value={minutes} onChange={e => setMinutes(Math.max(0, Number(e.target.value) || 0))} />
                    </label>
                  </div>
                  <div className="gx-filter gg-wrap" style={{ marginTop: '0.75rem' }}>
                    <button className={`gx-chipbtn${showYear ? ' on' : ''}`} onClick={() => setShowYear(v => !v)} aria-pressed={showYear}>
                      {showYear && <Check size={13} strokeWidth={3} />} Board year on each question
                    </button>
                    <button className={`gx-chipbtn${withKey ? ' on' : ''}`} onClick={() => setWithKey(v => !v)} aria-pressed={withKey}>
                      {withKey && <Check size={13} strokeWidth={3} />} Answer key at the end
                    </button>
                  </div>
                </Step>
              </div>

              <aside className="gg-summary">
                <div className="gg-summary-eyebrow"><FileText size={14} /> Your paper</div>
                <div className="gg-summary-title">{title || 'Untitled test'}</div>
                <div className="gg-summary-big">
                  <div><b>{paper ? totalMarks : planned}</b><span>marks</span></div>
                  <div><b>{paper ? paper.mcq.length + sections.reduce((t, m) => t + paper.subjective[m].length, 0) : plannedQs}</b><span>questions</span></div>
                  <div><b>{minutes}</b><span>minutes</span></div>
                </div>
                <ul className="gg-summary-list">
                  <li><span>MCQs</span><b>{paper ? paper.mcq.length : Math.min(mcqCount, pool.mcq.length)} × 1</b></li>
                  {SUB_MARKS.map(m => (
                    <li key={m}><span>{m}-mark</span><b>{paper ? paper.subjective[m]?.length || 0 : Math.min(subCounts[m], subjectiveAvail(m))} × {m}</b></li>
                  ))}
                  <li><span>Chapters</span><b>{chapters.size}</b></li>
                  <li><span>Years</span><b>{years.size ? [...years].sort().join(', ') : '–'}</b></li>
                </ul>
                <button className="gx-go" onClick={generate} disabled={!plannedQs}>
                  {paper ? <RefreshCw size={16} /> : <Shuffle size={16} />} {paper ? 'Generate again' : 'Generate paper'}
                </button>
                {paper && (
                  <>
                    <button className="gx-go gg-dl" onClick={downloadPdf} disabled={!!busy}>
                      {busy ? <span className="spinner spinner-sm" /> : <Download size={16} />} {busy || 'Download PDF'}
                    </button>
                    <button className="gx-ghost" style={{ justifyContent: 'center' }} onClick={() => window.print()}><Printer size={15} /> Print</button>
                  </>
                )}
                {!paper && <div className="gg-summary-note">Nothing is saved. Generate, check the preview, then download.</div>}
              </aside>
            </div>
          )}
        </div>

        {paper && (
          <div id="gg-preview" className="gg-preview">
            <div className="gg-preview-head no-print">
              <div>
                <b>Preview</b>
                <span>Tap <Shuffle size={12} /> next to a question to swap it for another from the same chapter.</span>
              </div>
              <button className="gx-ghost" onClick={downloadPdf} disabled={!!busy}>
                {busy ? <span className="spinner spinner-sm" /> : <Download size={15} />} {busy || 'Download PDF'}
              </button>
            </div>
            <GsebPrintSheet
              title={title}
              subtitle={`${GSEB_SUBJECT_LABELS[subject]} · Std 12 Science`}
              meta={[`Time: ${minutes} min`, `Total marks: ${totalMarks}`]}
              mcq={paper.mcq}
              groups={sections.map((m, i) => ({
                key: m,
                heading: `Section ${SECTION_NAMES[i]} · Answer the following (${paper.subjective[m].length} × ${m} = ${paper.subjective[m].length * m} marks)`,
                items: paper.subjective[m],
              }))}
              withKey={withKey}
              tag={tag}
              extra={(q, kind, m) => (
                <button className="no-print gp-swap" title="Swap for another question" onClick={() => swap(kind, m ?? 1, q)}><Shuffle size={13} /></button>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
