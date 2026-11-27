import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, RefreshCw, X, FileDown, ChevronDown, ChevronUp, Shuffle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACTIVE_SUBJECTS, unitsFor, levelsFor, courseUnitId, fromCourseUnitId } from '../../lib/subjects'
import { levelBadge } from '../../lib/constants'
import { MEDIUMS, mediumLabel } from '../../lib/neetI18n'
import { CLASSES, targetYears } from '../../lib/students'
import {
  PAPER_MODES, sourceLabel, paperQuestionCount, fetchSourcePool, drawQuestions, fetchQuestionsByIds,
  bySubject, shuffle, maxMarks, isSetupMissing,
} from '../../lib/onlinePapers'
import MathText from '../shared/MathText'

const BLANK = { title: '', duration_min: 60, medium: 'en', class_filter: '', target_year: '', mode: 'same' }
const blankSource = () => ({ subject: 'Chemistry', unit: 1, level: '', count: 10 })
const srcOf = s => ({ subject: s.subject, unit_id: courseUnitId(s.subject, s.unit), level: s.level === '' ? null : Number(s.level), count: Number(s.count) || 0 })

function audience(p) {
  return [mediumLabel(p.medium), p.class_filter, p.target_year && `Target ${p.target_year}`].filter(Boolean).join(' · ')
}

// One "where the questions come from" row: subject, unit, level (or CCT), how many.
function SourceRow({ src, medium, onChange, onRemove }) {
  const [available, setAvailable] = useState(null)
  const units = unitsFor(src.subject)
  const levels = levelsFor(src.subject, src.unit)
  // A unit's own CCT level is a pool of the whole unit, so it is offered once, as "whole unit".
  const cct = levels.length > 1 ? levels[levels.length - 1].id : null
  const choosable = levels.filter(l => l.id !== cct)

  useEffect(() => {
    let cancelled = false
    setAvailable(null)
    fetchSourcePool(srcOf(src), medium).then(qs => { if (!cancelled) setAvailable(qs.length) }).catch(() => {})
    return () => { cancelled = true }
  }, [src.subject, src.unit, src.level, medium])

  return (
    <div className="op-src">
      <select className="form-control" value={src.subject} onChange={e => onChange({ ...src, subject: e.target.value, unit: 1, level: '' })}>
        {ACTIVE_SUBJECTS.map(s => <option key={s}>{s}</option>)}
      </select>
      <select className="form-control op-src-unit" value={src.unit} onChange={e => onChange({ ...src, unit: Number(e.target.value), level: '' })}>
        {units.map(u => <option key={u.id} value={u.id}>Unit {u.id} · {u.name}</option>)}
      </select>
      <select className="form-control" value={src.level} onChange={e => onChange({ ...src, level: e.target.value })}>
        <option value="">CCT (whole unit)</option>
        {choosable.map(l => <option key={l.id} value={l.id}>{levelBadge(courseUnitId(src.subject, src.unit), l.id, { subject: src.subject })}{l.name ? ` · ${l.name}` : ''}</option>)}
      </select>
      <input className="form-control op-src-count" type="number" min="1" value={src.count} onChange={e => onChange({ ...src, count: e.target.value })} aria-label="Number of questions" />
      <span className={`op-src-avail${available != null && available < Number(src.count) ? ' short' : ''}`}>
        {available == null ? '…' : `${available} in bank`}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} aria-label="Remove row"><X size={14} /></button>
    </div>
  )
}

function PaperForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(BLANK)
  const [sources, setSources] = useState([blankSource()])
  const [picked, setPicked] = useState(null)   // 'same' mode: the questions drawn so far
  const [busy, setBusy] = useState(false)
  const set = patch => setForm(f => ({ ...f, ...patch }))
  const total = sources.reduce((t, s) => t + (Number(s.count) || 0), 0)

  async function draw() {
    setBusy(true)
    try {
      const { questions, short } = await drawQuestions(sources.map(srcOf), form.medium)
      short.forEach(s => toast.error(`${sourceLabel(s.src)}: only ${s.got} of ${s.wanted} questions in the bank`, { duration: 6000 }))
      setPicked(bySubject(questions, sources.map(srcOf)))
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  // Swaps one question for another unused one from the same unit (and level).
  async function replace(q) {
    const src = sources.map(srcOf).find(s => fromCourseUnitId(s.unit_id).subject === q.subject && q.unit?.startsWith(`Unit ${fromCourseUnitId(s.unit_id).unit} -`) && (s.level == null || s.level === q.level))
    if (!src) return
    const pool = shuffle((await fetchSourcePool(src, form.medium)).filter(x => !picked.some(p => p.id === x.id)))
    if (!pool.length) { toast.error('No other question left in this pool'); return }
    setPicked(list => list.map(x => (x.id === q.id ? pool[0] : x)))
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Give the paper a name'); return }
    if (!total) { toast.error('Add at least one question source'); return }
    if (form.mode === 'same' && !picked?.length) { toast.error('Click "Pick questions" first'); return }
    setBusy(true)
    const row = {
      title: form.title.trim(), mode: form.mode, duration_min: Number(form.duration_min) || 60, medium: form.medium,
      class_filter: form.class_filter || null, target_year: form.target_year || null,
      sources: sources.map(srcOf), question_ids: form.mode === 'same' ? picked.map(q => q.id) : [],
      is_published: false,
    }
    const { error } = await supabase.from('online_papers').insert(row)
    setBusy(false)
    if (error) { toast.error(isSetupMissing(error) ? 'Run 10_online_papers.sql in Supabase first' : error.message); return }
    toast.success('Paper saved as a draft. Publish it to show it to students.')
    onSaved()
  }

  return (
    <div className="card card-body op-form">
      <div className="op-grid">
        <div className="form-group op-wide">
          <label>Paper name *</label>
          <input className="form-control" placeholder="e.g. Weekly Test 5 · Equilibrium" value={form.title} onChange={e => set({ title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Time (minutes)</label>
          <input className="form-control" type="number" min="5" value={form.duration_min} onChange={e => set({ duration_min: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Medium</label>
          <select className="form-control" value={form.medium} onChange={e => { set({ medium: e.target.value }); setPicked(null) }}>
            {MEDIUMS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Class</label>
          <select className="form-control" value={form.class_filter} onChange={e => set({ class_filter: e.target.value })}>
            <option value="">All classes</option>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Target year</label>
          <select className="form-control" value={form.target_year} onChange={e => set({ target_year: e.target.value })}>
            <option value="">All years</option>
            {targetYears().map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="op-label">Paper type</div>
      <div className="op-modes">
        {Object.entries(PAPER_MODES).map(([id, label]) => (
          <label key={id} className={`op-mode${form.mode === id ? ' active' : ''}`}>
            <input type="radio" name="mode" checked={form.mode === id} onChange={() => set({ mode: id })} />
            <span><strong>{label}</strong><small>{id === 'same'
              ? 'You pick the questions now. Every student gets them in a different question and option order.'
              : 'Each student gets their own random questions from these chapters/levels when they start.'}</small></span>
          </label>
        ))}
      </div>

      <div className="op-label">Questions from <span>{total} question{total === 1 ? '' : 's'} · {maxMarks(total)} marks</span></div>
      {sources.map((s, i) => (
        <SourceRow key={i} src={s} medium={form.medium}
          onChange={next => { setSources(list => list.map((x, j) => (j === i ? next : x))); setPicked(null) }}
          onRemove={() => { setSources(list => list.filter((_, j) => j !== i)); setPicked(null) }} />
      ))}
      <button type="button" className="btn btn-ghost btn-sm op-add" onClick={() => setSources(l => [...l, blankSource()])}><Plus size={14} /> Add row</button>

      {form.mode === 'same' && (
        <div className="op-picked">
          <button type="button" className="btn btn-outline btn-sm" disabled={busy || !total} onClick={draw}>
            <Shuffle size={14} /> {picked ? 'Pick again' : 'Pick questions'}
          </button>
          {picked && (
            <ol className="op-qlist">
              {picked.map(q => (
                <li key={q.id}>
                  <code>{q.qid}</code>
                  <span className="op-q-meta">{q.subject} · {levelBadge(courseUnitId(q.subject, Number(/^Unit (\d+)/.exec(q.unit || '')?.[1])), q.level, { subject: q.subject })}</span>
                  <span className="op-q-stem"><MathText text={String(q.question || '').replace(/\s+/g, ' ').slice(0, 140)} /></span>
                  <button type="button" className="btn btn-ghost btn-sm" title="Replace with another question" onClick={() => replace(q)}><RefreshCw size={13} /></button>
                  <button type="button" className="btn btn-ghost btn-sm" title="Remove" onClick={() => setPicked(l => l.filter(x => x.id !== q.id))}><X size={13} /></button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="op-actions">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Working…' : 'Save paper'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function Results({ paper, students }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.from('online_paper_attempts').select('*').eq('paper_id', paper.id)
      .then(({ data }) => setRows((data || []).sort((a, b) => (b.submitted - a.submitted) || b.score - a.score)))
  }, [paper.id])
  if (!rows) return <div className="op-muted">Loading results…</div>
  if (!rows.length) return <div className="op-muted">No student has started this paper yet.</div>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Student</th><th style={{ textAlign: 'right' }}>Score</th><th style={{ textAlign: 'right' }}>Right</th><th style={{ textAlign: 'right' }}>Wrong</th><th style={{ textAlign: 'right' }}>Blank</th><th>Submitted</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const s = students[r.student_id]
            return (
              <tr key={r.id}>
                <td>{r.submitted ? i + 1 : '–'}</td>
                <td>{s ? `${s.name} (${s.roll_number})` : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.submitted ? `${r.score} / ${maxMarks(r.question_ids.length)}` : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--green)' }}>{r.submitted ? r.correct_count : ''}</td>
                <td style={{ textAlign: 'right', color: 'var(--red)' }}>{r.submitted ? r.wrong_count : ''}</td>
                <td style={{ textAlign: 'right' }}>{r.submitted ? r.skipped_count : ''}</td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{r.submitted ? new Date(r.submitted_at).toLocaleString('en-IN') : 'In progress'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function OnlinePapersAdmin() {
  const [papers, setPapers] = useState(null)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(null)
  const [students, setStudents] = useState({})
  const [counts, setCounts] = useState({})

  async function load() {
    const { data, error: err } = await supabase.from('online_papers').select('*').order('created_at', { ascending: false })
    if (err) { setError(isSetupMissing(err) ? 'setup' : err.message); setPapers([]); return }
    setPapers(data || [])
    const { data: atts } = await supabase.from('online_paper_attempts').select('paper_id, submitted')
    const c = {}
    for (const a of atts || []) if (a.submitted) c[a.paper_id] = (c[a.paper_id] || 0) + 1
    setCounts(c)
  }
  useEffect(() => {
    load()
    supabase.from('students').select('id, name, roll_number').then(({ data }) => setStudents(Object.fromEntries((data || []).map(s => [s.id, s]))))
  }, [])

  async function togglePublish(p) {
    const { error: err } = await supabase.from('online_papers').update({ is_published: !p.is_published }).eq('id', p.id)
    if (err) { toast.error(err.message); return }
    toast.success(p.is_published ? 'Hidden from students' : 'Published: students can see it now')
    load()
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.title}"? Students' attempts of it are deleted too. This cannot be undone.`)) return
    const { error: err } = await supabase.from('online_papers').delete().eq('id', p.id)
    if (err) { toast.error(err.message); return }
    load()
  }

  async function pdf(p, withKey) {
    setPdfBusy(`${p.id}${withKey}`)
    try {
      const { downloadPracticePaperPdf } = await import('../../lib/gsebPaperPdf')
      const questions = bySubject(p.mode === 'same'
        ? await fetchQuestionsByIds(p.question_ids)
        : (await drawQuestions(p.sources, p.medium)).questions, p.sources)
      await downloadPracticePaperPdf({
        title: p.title, minutes: p.duration_min, questions, withKey,
        sub: p.mode === 'random' ? 'Sample set (each student gets different questions)' : audience(p),
      })
    } catch (err) { toast.error(err.message) } finally { setPdfBusy(null) }
  }

  if (error === 'setup') {
    return <div className="empty-state">Online papers need a one-time setup: run <code>10_online_papers.sql</code> in the Supabase SQL editor, then refresh this page.</div>
  }
  if (error) return <div className="empty-state" style={{ color: 'var(--red)' }}>{error}</div>

  return (
    <div>
      <div className="op-head">
        <p className="op-muted">Papers made from the question bank. Students see published papers on their dashboard and take them online.</p>
        {!adding && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={15} /> New online paper</button>}
      </div>
      {adding && <PaperForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />}

      {!papers ? <div className="op-muted">Loading…</div> : papers.length === 0 && !adding ? (
        <div className="empty-state">No online papers yet. Click "New online paper" to make one.</div>
      ) : (
        <div className="op-list">
          {papers.map(p => {
            const n = paperQuestionCount(p)
            const open = openId === p.id
            return (
              <div key={p.id} className="card">
                <div className="op-row">
                  <div className="op-row-main">
                    <div className="op-row-title">
                      <strong>{p.title}</strong>
                      <span className={`badge ${p.is_published ? 'badge-easy' : 'badge-locked'}`}>{p.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                    <div className="op-muted">
                      {n} Qs · {maxMarks(n)} marks · {p.duration_min} min · {p.mode === 'same' ? 'Same Qs, shuffled' : 'Different Qs per student'} · {audience(p)}
                    </div>
                    <div className="op-sources">{(p.sources || []).map((s, i) => <span key={i}>{sourceLabel(s)} × {s.count}</span>)}</div>
                  </div>
                  <div className="op-row-actions">
                    <button className="btn btn-ghost btn-sm" disabled={!!pdfBusy} onClick={() => pdf(p, false)}><FileDown size={14} /> {pdfBusy === `${p.id}false` ? 'Making…' : 'PDF'}</button>
                    <button className="btn btn-ghost btn-sm" disabled={!!pdfBusy} onClick={() => pdf(p, true)}><FileDown size={14} /> {pdfBusy === `${p.id}true` ? 'Making…' : 'PDF + Key'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(open ? null : p.id)}>
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Results ({counts[p.id] || 0})
                    </button>
                    <button className={`btn btn-sm ${p.is_published ? 'btn-outline' : 'btn-primary'}`} onClick={() => togglePublish(p)}>{p.is_published ? 'Unpublish' : 'Publish'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(p)} aria-label="Delete paper"><Trash2 size={14} /></button>
                  </div>
                </div>
                {open && <div className="op-results"><Results paper={p} students={students} /></div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
