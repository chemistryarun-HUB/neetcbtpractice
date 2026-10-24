import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, Undo2, Pencil, X, ArrowLeft } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import QuestionEditPanel from '../../components/shared/QuestionEditPanel'
import { supabase } from '../../lib/supabase'
import { correctOptionKey, resolveCorrectOptionValue } from '../../lib/questionOptions'
import { SUGGESTION_KINDS } from '../../lib/faculty'

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

const DRAFT_FILTERS = [['pending', 'Waiting for review'], ['rejected', 'Returned'], ['approved', 'Approved']]

// Everything faculty send the admin: new questions (drafts) and corrections
// to live questions. Nothing a faculty member writes reaches students until
// it is approved here.
export default function AdminFacultyReview() {
  const [tab, setTab] = useState('drafts')
  const [draftFilter, setDraftFilter] = useState('pending')
  const [drafts, setDrafts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [questionsById, setQuestionsById] = useState({})
  const [facultyById, setFacultyById] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [missing, setMissing] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: fac }, d, s] = await Promise.all([
      supabase.from('faculty').select('id, name, faculty_code'),
      supabase.from('questions').select('*').eq('review_status', draftFilter).order('created_at', { ascending: false }).limit(200),
      supabase.from('question_suggestions').select('*').eq('status', 'open').order('created_at', { ascending: true }),
    ])
    if (d.error || s.error) { setMissing(true); setLoading(false); return }
    setFacultyById(Object.fromEntries((fac || []).map(f => [f.id, f])))
    setDrafts(d.data || [])
    setSuggestions(s.data || [])
    const ids = [...new Set((s.data || []).map(x => x.question_id))]
    if (ids.length) {
      const { data: qs } = await supabase.from('questions').select('*').in('id', ids)
      setQuestionsById(Object.fromEntries((qs || []).map(q => [q.id, q])))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [draftFilter])

  const by = id => facultyById[id] ? `${facultyById[id].name} · ${facultyById[id].faculty_code}` : 'Faculty'

  async function approve(q) {
    const { error } = await supabase.from('questions')
      .update({ is_published: true, is_active: true, review_status: 'approved', review_note: null, reviewed_at: new Date().toISOString() })
      .eq('id', q.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${q.qid} approved — live for students`)
    load()
  }

  async function giveBack(q) {
    const note = prompt(`Note for ${by(q.uploaded_by)} — what should they fix in ${q.qid}?`)
    if (note === null) return
    const { error } = await supabase.from('questions')
      .update({ review_status: 'rejected', review_note: note.trim() || null, is_active: false, reviewed_at: new Date().toISOString() })
      .eq('id', q.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${q.qid} returned to the faculty`)
    load()
  }

  async function resolve(s, status, note) {
    const { error } = await supabase.from('question_suggestions')
      .update({ status, admin_note: note || null, resolved_at: new Date().toISOString() }).eq('id', s.id)
    if (error) { toast.error(error.message); return false }
    return true
  }

  async function applyKey(s) {
    const q = questionsById[s.question_id]
    if (!q) return
    if (!confirm(`Change ${q.qid}'s answer key to Option ${s.proposed_option}?`)) return
    const texts = [q.option1, q.option2, q.option3, q.option4]
    const { error } = await supabase.from('questions')
      .update({ correct_option: resolveCorrectOptionValue(`option${s.proposed_option}`, texts) }).eq('id', q.id)
    if (error) { toast.error(error.message); return }
    if (await resolve(s, 'applied')) {
      toast.success('Key changed. Re-grade affected students on the Answer Keys page.', { duration: 7000 })
      load()
    }
  }

  async function markFixed(s) { if (await resolve(s, 'applied')) { toast.success('Marked as fixed'); load() } }
  async function dismiss(s) {
    const note = prompt('Why is no change needed? (shown to the faculty — optional)')
    if (note === null) return
    if (await resolve(s, 'dismissed', note.trim())) { toast.success('Dismissed'); load() }
  }

  const editingQ = useMemo(() => drafts.find(q => q.id === editingId) || questionsById[editingId], [editingId, drafts, questionsById])

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <div>
            <Link to="/admin/faculty" className="back-btn" style={{ fontSize: '0.8rem' }}><ArrowLeft size={14} /> Faculty</Link>
            <h2 style={{ marginBottom: 0 }}>Faculty Review</h2>
          </div>
        </div>

        {missing ? (
          <div className="card card-body">Run <code>migration_faculty_portal.sql</code> in the Supabase SQL Editor to enable faculty drafts and corrections.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
              <button className={`btn btn-sm ${tab === 'drafts' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('drafts')}>New questions</button>
              <button className={`btn btn-sm ${tab === 'corrections' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('corrections')}>
                Corrections {suggestions.length > 0 && <span className="badge" style={{ marginLeft: 6, background: '#fef9c3', color: '#a16207' }}>{suggestions.length}</span>}
              </button>
            </div>

            {editingQ && (
              <div className="card card-body" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>Editing {editingQ.qid}</strong>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}><X size={16} /></button>
                </div>
                <QuestionEditPanel key={editingQ.id} q={editingQ} onSaved={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
              </div>
            )}

            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div> : tab === 'drafts' ? (
              <>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {DRAFT_FILTERS.map(([k, label]) => (
                    <button key={k} className={`btn btn-sm ${draftFilter === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDraftFilter(k)}>{label}</button>
                  ))}
                </div>
                {drafts.length === 0 ? <div className="empty-state">Nothing here.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {drafts.map(q => (
                      <div key={q.id} className="card card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.qid}</code>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{q.unit} · L{q.level} · by {by(q.uploaded_by)}</span>
                          {draftFilter === 'pending' && (
                            <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => setEditingId(q.id)}><Pencil size={13} /> Edit</button>
                              <button className="btn btn-outline btn-sm" onClick={() => giveBack(q)}><Undo2 size={13} /> Return</button>
                              <button className="btn btn-success btn-sm" onClick={() => approve(q)}><Check size={13} /> Approve & publish</button>
                            </span>
                          )}
                        </div>
                        {q.review_note && <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>Note sent: {q.review_note}</div>}
                        <QuestionView q={q} mode="admin" size="compact" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : suggestions.length === 0 ? <div className="empty-state">No open corrections. 🎉</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {suggestions.map(s => {
                  const q = questionsById[s.question_id]
                  return (
                    <div key={s.id} className="card card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{q?.qid}</code>
                        <span className="badge" style={{ background: '#fef9c3', color: '#a16207' }}>{SUGGESTION_KINDS[s.kind]}</span>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>by {by(s.faculty_id)} · {new Date(s.created_at).toLocaleDateString()}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {s.kind === 'answer_key' && s.proposed_option && (
                            <button className="btn btn-success btn-sm" onClick={() => applyKey(s)}><Check size={13} /> Set key to Option {s.proposed_option}</button>
                          )}
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingId(s.question_id)}><Pencil size={13} /> Edit question</button>
                          {s.kind !== 'answer_key' && <button className="btn btn-outline btn-sm" onClick={() => markFixed(s)}><Check size={13} /> Mark fixed</button>}
                          <button className="btn btn-ghost btn-sm" onClick={() => dismiss(s)}><X size={13} /> No change</button>
                        </span>
                      </div>
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
                        {s.kind === 'answer_key' && <><strong>Suggested key:</strong> Option {s.proposed_option} (currently {correctOptionKey(q || {})?.replace('option', 'Option ') || '—'}). </>}
                        {s.message}
                      </div>
                      {q && <QuestionView q={q} mode="admin" size="compact" />}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
