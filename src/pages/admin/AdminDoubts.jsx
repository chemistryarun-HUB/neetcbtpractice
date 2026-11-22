import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Topbar from '../../components/shared/Topbar'
import QuestionView from '../../components/shared/QuestionView'
import MathText from '../../components/shared/MathText'
import { orderOptionsForReview } from '../../lib/optionShuffle'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/doubts', label: 'Doubts' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
  { to: '/admin/gseb', label: 'GSEB Papers' },
]

const TABS = [
  ['waiting', 'Waiting for Sir'],
  ['ai', 'Answered by Doubt Desk'],
  ['answered', 'Sir answered'],
  ['all', 'All'],
]
const STATUS_BADGE = {
  waiting: { label: 'Waiting', bg: '#fef3c7', fg: '#92400e' },
  ai: { label: 'Doubt Desk', bg: '#e0e7ff', fg: '#3730a3' },
  answered: { label: 'Sir answered', bg: '#dcfce7', fg: '#15803d' },
}

function when(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Admin → Doubts: every Doubt Desk conversation, newest first. "Waiting for
// Sir" holds the ones the helper was unsure about or the student sent on.
// Replying adds a "Sir ka jawab" message the student sees in the same panel.
export default function AdminDoubts() {
  const [tab, setTab] = useState('waiting')
  const [doubts, setDoubts] = useState(null)
  const [students, setStudents] = useState({})
  const [openId, setOpenId] = useState(null)
  const [thread, setThread] = useState([])
  const [question, setQuestion] = useState(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setDoubts(null)
    let q = supabase.from('doubts').select('*').order('updated_at', { ascending: false }).limit(200)
    if (tab !== 'all') q = q.eq('status', tab)
    const { data, error } = await q
    if (error) { toast.error(error.message); setDoubts([]); return }
    setDoubts(data || [])
    const ids = [...new Set((data || []).map(d => d.student_id))].filter(id => !students[id])
    if (ids.length) {
      const { data: st } = await supabase.from('students').select('id, name, roll_number').in('id', ids)
      setStudents(prev => ({ ...prev, ...Object.fromEntries((st || []).map(s => [s.id, s])) }))
    }
  }
  useEffect(() => { load() }, [tab])   // eslint-disable-line react-hooks/exhaustive-deps

  const open = useMemo(() => (doubts || []).find(d => d.id === openId) || null, [doubts, openId])

  useEffect(() => {
    if (!open) { setThread([]); setQuestion(null); return }
    let cancelled = false
    supabase.from('doubt_messages').select('*').eq('doubt_id', open.id).order('created_at')
      .then(({ data }) => { if (!cancelled) setThread(data || []) })
    if (open.question_id) {
      supabase.from('questions').select('*').eq('id', open.question_id).single()
        .then(({ data }) => { if (!cancelled) setQuestion(data || null) })
    } else setQuestion(null)
    return () => { cancelled = true }
  }, [open?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function sendReply() {
    const text = reply.trim()
    if (!text || !open) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: e1 } = await supabase.from('doubt_messages').insert({ doubt_id: open.id, role: 'faculty', content: text, author: user?.email || 'Admin' })
      if (e1) throw e1
      const now = new Date().toISOString()
      const { error: e2 } = await supabase.from('doubts').update({ status: 'answered', answered_at: now, updated_at: now }).eq('id', open.id)
      if (e2) throw e2
      toast.success('Reply sent to the student')
      setReply('')
      const { data } = await supabase.from('doubt_messages').select('*').eq('doubt_id', open.id).order('created_at')
      setThread(data || [])
      setDoubts(ds => ds.map(d => (d.id === open.id ? { ...d, status: 'answered', updated_at: now } : d)))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2>Doubts</h2>
            <div className="text-muted">Doubt Desk conversations. Test version: only students switched on for Doubt Desk can ask.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {TABS.map(([key, label]) => (
            <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab(key); setOpenId(null) }}>{label}</button>
          ))}
        </div>

        <div className="doubt-admin">
          <div className="card table-wrap" style={{ flex: 1, minWidth: 0 }}>
            <table>
              <thead><tr><th>When</th><th>Student</th><th>Q ID</th><th>Chapter</th><th>Status</th></tr></thead>
              <tbody>
                {doubts === null && <tr><td colSpan={5} style={{ color: 'var(--gray-500)' }}>Loading…</td></tr>}
                {doubts?.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--gray-500)' }}>No doubts here.</td></tr>}
                {(doubts || []).map(d => {
                  const s = students[d.student_id]
                  const b = STATUS_BADGE[d.status]
                  return (
                    <tr key={d.id} onClick={() => setOpenId(d.id)} style={{ cursor: 'pointer', background: d.id === openId ? '#eff6ff' : undefined }}>
                      <td style={{ whiteSpace: 'nowrap' }}>{when(d.updated_at)}</td>
                      <td>{s ? `${s.name} (${s.roll_number})` : '…'}</td>
                      <td><code>{d.qid || 'Free doubt'}</code></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{d.chapter}</td>
                      <td><span className="badge" style={{ background: b.bg, color: b.fg }}>{b.label}{d.helpful ? ' · 👍' : ''}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {open && (
            <div className="doubt-admin-panel">
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                {students[open.student_id]?.name || 'Student'} · <code>{open.qid || 'Free doubt'}</code>
              </div>
              {question && (
                <div className="doubt-admin-q">
                  <QuestionView q={question} mode="review" size="compact"
                    options={orderOptionsForReview(question, open.shown_order)}
                    isChosen={o => o.key === open.chosen_key} />
                </div>
              )}
              <div className="doubt-body" style={{ padding: 0, margin: '0.75rem 0' }}>
                {thread.map(m => (
                  <div key={m.id} className={`doubt-msg doubt-${m.role}`}>
                    <div className="doubt-who" style={{ color: m.role === 'helper' ? '#3730a3' : m.role === 'student' ? '#1e429f' : undefined }}>
                      {m.role === 'student' ? 'Student' : m.role === 'helper' ? `Doubt Desk${m.confident === false ? ' (unsure → sent to Sir)' : ''}` : `Sir (${m.author || 'admin'})`}
                    </div>
                    <MathText text={m.content} />
                  </div>
                ))}
              </div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5}
                placeholder="Sir ka jawab likhiye… (formula: $\ce{XeOF4}$)" className="form-control" style={{ width: '100%', fontFamily: 'inherit' }} />
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={saving || !reply.trim()} onClick={sendReply}>
                {saving ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
