import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Flag, Plus, Pencil, X, Search, Send } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import { EditImageField } from '../../components/shared/QuestionEditPanel'
import { MathPreview } from '../../components/shared/MathText'
import { supabase } from '../../lib/supabase'
import { uploadQuestionImage } from '../../lib/storage'
import { useAuth } from '../../hooks/useAuth'
import { ACTIVE_SUBJECTS, unitsFor, levelsFor } from '../../lib/subjects'
import { correctOptionKey, resolveCorrectOptionValue } from '../../lib/questionOptions'
import {
  FACULTY_NAV, SUGGESTION_KINDS, facultyAddQuestion, facultyUpdateQuestion, facultySuggest, facultyMySuggestions,
} from '../../lib/faculty'

// A faculty member's subjects → the question-bank subject they write for.
const BANK_SUBJECT = { Chemistry: 'Chemistry', Physics: 'Physics', Botany: 'Biology', Zoology: 'Biology', Biology: 'Biology' }
const bankSubjectsOf = user => [...new Set((user?.subjects || []).map(s => BANK_SUBJECT[s]).filter(Boolean))]
// Units with no authored levels yet still need somewhere to file a draft.
const levelChoices = (subject, unit) => {
  const defs = levelsFor(subject, unitIdOf(unit))
  return defs.length ? defs.slice(0, defs.length > 1 ? -1 : undefined) : [1, 2, 3, 4, 5, 6, 7, 8, 9].map(id => ({ id, name: `Level ${id}` }))
}
const unitLabel = u => `Unit ${u.id} - ${u.name}`
const unitIdOf = label => Number((label || '').match(/^Unit (\d+)/)?.[1])

const TABS = [
  ['bank', 'Question Bank'],
  ['drafts', 'My Drafts'],
  ['suggestions', 'My Suggestions'],
]

const STATUS = {
  pending:  { label: 'Waiting for admin review', bg: '#fef9c3', fg: '#a16207' },
  approved: { label: 'Approved · live for students', bg: '#dcfce7', fg: '#15803d' },
  rejected: { label: 'Returned by admin', bg: '#fee2e2', fg: '#b91c1c' },
  open:     { label: 'Open', bg: '#fef9c3', fg: '#a16207' },
  applied:  { label: 'Fixed by admin', bg: '#dcfce7', fg: '#15803d' },
  dismissed:{ label: 'Not changed', bg: 'var(--gray-100)', fg: 'var(--gray-600)' },
}
const Badge = ({ s }) => <span className="badge" style={{ background: STATUS[s]?.bg, color: STATUS[s]?.fg }}>{STATUS[s]?.label || s}</span>

const EMPTY_Q = {
  subject: 'Chemistry', unit: '', level: '', question: '', question_image: null,
  option1: '', option2: '', option3: '', option4: '',
  option1_image: null, option2_image: null, option3_image: null, option4_image: null,
  correct: 'option1', difficulty_level: 'Medium', question_tag: '', source: '',
}

// ── Add / edit a draft ──
function DraftForm({ initial, onDone, onCancel }) {
  const { facultyToken } = useAuth()
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const levels = f.unit ? levelChoices(f.subject, f.unit) : []

  async function upload(key, file) {
    setBusy(b => new Set(b).add(key))
    try { set(key, await uploadQuestionImage(file)) } catch (e) { toast.error(e.message) }
    setBusy(b => { const n = new Set(b); n.delete(key); return n })
  }

  async function submit(e) {
    e.preventDefault()
    const texts = [f.option1, f.option2, f.option3, f.option4]
    const payload = {
      subject: f.subject, unit: f.unit, level: f.level, question: f.question, question_image: f.question_image,
      option1: f.option1, option2: f.option2, option3: f.option3, option4: f.option4,
      option1_image: f.option1_image, option2_image: f.option2_image, option3_image: f.option3_image, option4_image: f.option4_image,
      correct_option: resolveCorrectOptionValue(f.correct, texts),
      difficulty_level: f.difficulty_level, question_tag: f.question_tag || null, source: f.source || null,
    }
    for (let i = 1; i <= 4; i++) {
      if (!f[`option${i}`].trim() && !f[`option${i}_image`]) { toast.error(`Option ${i} is empty`); return }
    }
    setSaving(true)
    try {
      if (f.id) {
        await facultyUpdateQuestion(facultyToken, f.id, payload)
        toast.success('Draft updated and sent for review')
      } else {
        const r = await facultyAddQuestion(facultyToken, payload)
        toast.success(`Saved as ${r.qid} — the admin will review it`)
      }
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="card card-body" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <strong>{f.id ? `Edit draft ${f.qid}` : 'New question (draft)'}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /></button>
      </div>
      {f.review_note && f.review_status === 'rejected' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.75rem' }}>
          <strong>Admin’s note:</strong> {f.review_note}
        </div>
      )}
      <div className="grid-2">
        <div className="form-group">
          <label>Unit *</label>
          <select className="form-control" value={f.unit} onChange={e => setF(p => ({ ...p, unit: e.target.value, level: '' }))} required>
            <option value="">Choose unit…</option>
            {unitsFor(f.subject).map(u => <option key={u.id} value={unitLabel(u)}>{unitLabel(u)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Level *</label>
          <select className="form-control" value={f.level} onChange={e => set('level', e.target.value)} required disabled={!levels.length}>
            <option value="">Choose level…</option>
            {levels.map(l => <option key={l.id} value={l.id}>L{l.id} · {l.name}</option>)}
          </select>
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '-0.4rem', marginBottom: '0.6rem' }}>Subject: <strong>{f.subject}</strong></div>
      <div className="form-group">
        <label>Question *</label>
        <textarea className="form-control" rows={3} value={f.question} onChange={e => set('question', e.target.value)} placeholder="Type the question. Use $…$ for equations, e.g. $\ce{H2SO4}$" />
        <MathPreview text={f.question} />
        <EditImageField label="Question image" url={f.question_image} uploading={busy.has('question_image')}
          onUpload={file => upload('question_image', file)} onRemove={() => set('question_image', null)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
        {[1, 2, 3, 4].map(i => {
          const k = `option${i}`, ok = f.correct === k
          return (
            <div key={i} style={{ padding: '0.5rem 0.65rem', borderRadius: 10, border: `1.5px solid ${ok ? '#86efac' : 'var(--gray-200)'}`, background: ok ? '#f0fdf4' : 'var(--gray-50)' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: ok ? '#15803d' : 'var(--gray-500)', display: 'flex', gap: '0.35rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" checked={ok} onChange={() => set('correct', k)} /> Option {i}{ok ? ' ✓ correct' : ''}
              </label>
              <textarea className="form-control" rows={2} style={{ fontSize: '0.85rem', marginTop: '0.3rem' }} value={f[k]} onChange={e => set(k, e.target.value)} />
              <MathPreview text={f[k]} />
              <EditImageField label={`Option ${i} image`} url={f[`${k}_image`]} uploading={busy.has(`${k}_image`)}
                onUpload={file => upload(`${k}_image`, file)} onRemove={() => set(`${k}_image`, null)} />
            </div>
          )
        })}
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>Difficulty</label>
          <select className="form-control" value={f.difficulty_level} onChange={e => set('difficulty_level', e.target.value)}>
            {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Exam tag <span className="text-muted">(optional)</span></label>
          <input className="form-control" value={f.question_tag} onChange={e => set('question_tag', e.target.value)} placeholder="e.g. jee main 08/04/24-2, NEET 2023" />
        </div>
      </div>
      <div className="form-group">
        <label>Source <span className="text-muted">(optional)</span></label>
        <input className="form-control" value={f.source} onChange={e => set('source', e.target.value)} placeholder="Book / module and question number" />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : f.id ? 'Save & resend for review' : 'Submit for review'}</button>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Students will see it only after the admin approves it.</span>
      </div>
    </form>
  )
}

// ── Suggest a correction on a live question ──
function SuggestModal({ q, onClose }) {
  const { facultyToken } = useAuth()
  const [kind, setKind] = useState('answer_key')
  const [proposed, setProposed] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const current = correctOptionKey(q)

  async function send() {
    setSaving(true)
    try {
      await facultySuggest(facultyToken, q.id, kind, kind === 'answer_key' ? proposed : null, message)
      toast.success('Sent to the admin — thank you!')
      onClose(true)
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">Suggest a correction · {q.qid}<button className="btn btn-ghost btn-sm" onClick={() => onClose(false)}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="form-group">
            <label>What is wrong?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {Object.entries(SUGGESTION_KINDS).map(([k, label]) => (
                <button key={k} type="button" className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setKind(k)}>{label}</button>
              ))}
            </div>
          </div>
          {kind === 'answer_key' && (
            <div className="form-group">
              <label>The correct answer should be</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3, 4].map(i => (
                  <button key={i} type="button" disabled={current === `option${i}`}
                    title={current === `option${i}` ? 'This is the current key' : ''}
                    className={`btn btn-sm ${proposed === i ? 'btn-primary' : 'btn-outline'}`} onClick={() => setProposed(i)}>
                    Option {i}{current === `option${i}` ? ' (current)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>{kind === 'answer_key' ? 'Reason (optional)' : 'Describe the problem *'}</label>
            <textarea className="form-control" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Option 3 is correct because…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={send} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}><Send size={14} /> {saving ? 'Sending…' : 'Send to admin'}</button>
        </div>
      </div>
    </div>
  )
}

export default function FacultyQuestions() {
  const { user, facultyToken } = useAuth()
  const [tab, setTab] = useState('bank')
  const mySubjects = bankSubjectsOf(user)
  const [subject, setSubject] = useState(mySubjects[0] || 'Chemistry')
  const [unit, setUnit] = useState('')
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [bank, setBank] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [editing, setEditing] = useState(null)   // null | EMPTY_Q-shaped draft
  const [suggestFor, setSuggestFor] = useState(null)

  // Drafts only in the subjects this faculty member teaches.
  const canAdd = mySubjects.includes(subject)

  async function loadDrafts() {
    const { data } = await supabase.from('questions').select('*').eq('uploaded_by', user.id).order('created_at', { ascending: false })
    setDrafts(data || [])
  }
  async function loadSuggestions() {
    try { setSuggestions(await facultyMySuggestions(facultyToken)) } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { if (user?.id) { loadDrafts(); loadSuggestions() } }, [user?.id])

  // Typing in Search looks through the WHOLE subject, not just the chosen
  // unit — a Q ID's digits don't say which unit it is in (NCU02159 lives in
  // Unit 12), so searching only the open unit found nothing.
  const term = search.trim().replace(/[,()*%\\]/g, '')
  const searching = term.length >= 3
  useEffect(() => {
    if (!searching && !unit) { setBank([]); return }
    let cancelled = false
    setBankLoading(true)
    const timer = setTimeout(() => {
      let q = supabase.from('questions').select('*').eq('subject', subject).eq('is_active', true).eq('is_published', true)
      if (searching) {
        q = q.or(`qid.ilike.%${term}%,question.ilike.%${term}%,source.ilike.%${term}%`).order('qid').limit(60)
      } else {
        q = q.eq('unit', unit)
        if (level) q = q.eq('level', Number(level))
        q = q.order('level').order('qid')
      }
      q.then(({ data }) => { if (!cancelled) { setBank(data || []); setBankLoading(false) } })
    }, searching ? 350 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [subject, unit, level, term, searching])

  const shownBank = bank

  function startEdit(q) {
    setEditing({
      ...EMPTY_Q, ...Object.fromEntries(Object.keys(EMPTY_Q).map(k => [k, q[k] ?? EMPTY_Q[k]])),
      id: q.id, qid: q.qid, level: String(q.level), correct: correctOptionKey(q) || 'option1',
      review_status: q.review_status, review_note: q.review_note,
    })
    setTab('drafts')
  }

  const draftStatus = q => q.is_published ? 'approved' : (q.review_status === 'rejected' ? 'rejected' : 'pending')
  const pendingCount = drafts.filter(q => draftStatus(q) === 'pending').length

  return (
    <div className="dashboard">
      <Topbar links={FACULTY_NAV} />
      <div className="page-content">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ marginBottom: 0 }}>Questions</h2>
          {canAdd && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ ...EMPTY_Q, subject, unit }); setTab('drafts') }} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
              <Plus size={15} /> Add Question
            </button>
          )}
        </div>

        {mySubjects.length === 0 && (
          <div className="card card-body" style={{ marginBottom: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            The question bank covers Chemistry, Physics and Biology. A bank for {(user?.subjects || []).join(', ') || 'your subject'} isn’t set up yet — you can still browse and flag questions.
          </div>
        )}

        <div className="tabs" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {TABS.map(([k, label]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(k)}>
              {label}
              {k === 'drafts' && pendingCount > 0 && <span className="badge" style={{ marginLeft: 6, background: '#fef9c3', color: '#a16207' }}>{pendingCount}</span>}
              {k === 'suggestions' && suggestions.some(s => s.status === 'open') && <span className="badge" style={{ marginLeft: 6, background: '#fef9c3', color: '#a16207' }}>{suggestions.filter(s => s.status === 'open').length}</span>}
            </button>
          ))}
        </div>

        {tab === 'bank' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select className="form-control" style={{ width: 'auto' }} value={subject} onChange={e => { setSubject(e.target.value); setUnit(''); setLevel('') }}>
                {ACTIVE_SUBJECTS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="form-control" style={{ maxWidth: 380 }} value={unit} onChange={e => { setUnit(e.target.value); setLevel('') }}>
                <option value="">Choose a unit to browse…</option>
                {unitsFor(subject).map(u => <option key={u.id} value={unitLabel(u)}>{unitLabel(u)}</option>)}
              </select>
              <select className="form-control" style={{ maxWidth: 260 }} value={level} onChange={e => setLevel(e.target.value)} disabled={!unit}>
                <option value="">All levels</option>
                {levelsFor(subject, unitIdOf(unit)).map(l => <option key={l.id} value={l.id}>L{l.id} · {l.name}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-control" style={{ paddingLeft: 32, width: 220 }} placeholder="Search Q ID or text" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {!unit && !searching ? <div className="empty-state">Choose a unit, or search by Q ID / text, to see questions (with answers).</div>
              : bankLoading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
              : shownBank.length === 0 ? <div className="empty-state">{searching ? `No live ${subject} question matches “${term}”.` : 'No live questions here.'}</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{searching ? `${shownBank.length}${shownBank.length === 60 ? '+' : ''} matches in all ${subject} units` : `${shownBank.length} live questions`}</div>
                  {shownBank.map(q => (
                    <div key={q.id} className="card card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                        <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.qid}</code>
                        <span className="badge">{searching ? `${q.unit} · ` : ''}L{q.level}</span>
                        {q.difficulty_level && <span className={`badge badge-${q.difficulty_level.toLowerCase()}`}>{q.difficulty_level}</span>}
                        {q.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{q.question_tag}</span>}
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }} onClick={() => setSuggestFor(q)}>
                          <Flag size={13} /> Suggest correction
                        </button>
                      </div>
                      <QuestionView q={q} mode="admin" size="compact" />
                    </div>
                  ))}
                </div>
              )}
          </>
        )}

        {tab === 'drafts' && (
          <>
            {editing && <DraftForm key={editing.id || 'new'} initial={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); loadDrafts() }} />}
            {drafts.length === 0 && !editing ? (
              <div className="empty-state">
                No drafts yet.{mySubjects.length > 0 && <> <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => setEditing({ ...EMPTY_Q, subject: canAdd ? subject : mySubjects[0] })}><Plus size={14} /> Add a question</button></>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {drafts.map(q => (
                  <div key={q.id} className="card card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.qid}</code>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{q.unit} · L{q.level}</span>
                      <Badge s={draftStatus(q)} />
                      {!q.is_published && (
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }} onClick={() => startEdit(q)}>
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                    </div>
                    {q.review_status === 'rejected' && q.review_note && (
                      <div style={{ background: '#fef2f2', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.6rem' }}>
                        <strong>Admin’s note:</strong> {q.review_note}
                      </div>
                    )}
                    <QuestionView q={q} mode="admin" size="compact" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'suggestions' && (
          suggestions.length === 0 ? <div className="empty-state">You haven’t suggested any corrections yet. Use “Suggest correction” on any question in the bank.</div> : (
            <div className="card"><div className="table-wrap">
              <table>
                <thead><tr><th>Q ID</th><th>Problem</th><th>Your note</th><th>Status</th><th>Sent</th></tr></thead>
                <tbody>
                  {suggestions.map(s => (
                    <tr key={s.id}>
                      <td><code>{s.qid}</code></td>
                      <td>{SUGGESTION_KINDS[s.kind]}{s.proposed_option ? ` → Option ${s.proposed_option}` : ''}</td>
                      <td style={{ maxWidth: 320 }}>{s.message || '—'}{s.admin_note && <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Admin: {s.admin_note}</div>}</td>
                      <td><Badge s={s.status} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          )
        )}
      </div>

      {suggestFor && <SuggestModal q={suggestFor} onClose={sent => { setSuggestFor(null); if (sent) loadSuggestions() }} />}
    </div>
  )
}
