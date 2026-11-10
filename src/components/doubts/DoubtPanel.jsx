import { useEffect, useRef, useState } from 'react'
import { X, Send, MessageCircleQuestion } from 'lucide-react'
import MathText from '../shared/MathText'
import { doubtDesk } from '../../lib/doubtDesk'

// Doubt Desk panel opened from the review screen ("Doubt poochho"). A side
// panel on a wide screen, a bottom sheet on a phone (CSS: .doubt-panel).
// Shows this question's latest doubt thread, including any reply from Sir.
export default function DoubtPanel({ attempt, q, num, chosenKey, shownOrder, chapter, onClose }) {
  const [doubt, setDoubt] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setDoubt(null); setMessages([])
    doubtDesk('list', { question_id: q.id })
      .then(({ doubts }) => {
        if (cancelled) return
        const latest = (doubts || [])[0]
        if (latest) { setDoubt(latest); setMessages(latest.messages || []) }
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q.id])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, sending])

  async function send(message) {
    const msg = (message ?? text).trim()
    if (!msg || sending) return
    setSending(true); setError('')
    setMessages(m => [...m, { id: 'pending', role: 'student', content: msg }])
    setText('')
    try {
      const res = await doubtDesk('ask', doubt ? { doubt_id: doubt.id, message: msg } : {
        message: msg, question_id: q.id, attempt_id: attempt.id, unit_id: attempt.unit_id, level: attempt.level,
        chapter, chosen_key: chosenKey, shown_order: shownOrder,
      })
      setDoubt(res.doubt); setMessages(res.messages || [])
    } catch (e) {
      setError(e.message)
      setMessages(m => m.filter(x => x.id !== 'pending'))
      setText(msg)
    } finally {
      setSending(false)
    }
  }

  async function act(action, extra = {}) {
    if (!doubt) return
    try {
      const res = await doubtDesk(action, { doubt_id: doubt.id, ...extra })
      setDoubt(res.doubt)
    } catch (e) { setError(e.message) }
  }

  const lastHelper = [...messages].reverse().find(m => m.role === 'helper')
  const chips = chosenKey
    ? ['Mera answer galat kyon hai?', 'Sahi answer kaise aaya?']
    : ['Ye question kaise solve karein?', 'Concept samjhao']

  return (
    <div className="doubt-panel" role="dialog" aria-label="Doubt Desk">
      <div className="doubt-head">
        <div>
          <strong>Doubt Desk · Q{num}</strong>
          <small>Turant jawab · Sir tak bhi bhej sakte ho</small>
        </div>
        <button className="doubt-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>

      <div className="doubt-body">
        <div className="doubt-ctx">
          Ye question, aapka answer aur sahi answer Doubt Desk ko dikh raha hai. Bas apna doubt likho.
        </div>
        {loading && <div className="doubt-note">Loading…</div>}
        {!loading && messages.length === 0 && !error && (
          <div className="doubt-chips">
            {chips.map(c => <button key={c} onClick={() => send(c)} disabled={sending}>{c}</button>)}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`doubt-msg doubt-${m.role}`}>
            {m.role === 'faculty' && <div className="doubt-who">Sir ka jawab</div>}
            <MathText text={m.content} />
          </div>
        ))}
        {sending && <div className="doubt-msg doubt-helper doubt-typing">Soch raha hoon…</div>}
        {doubt?.status === 'waiting' && (
          <div className="doubt-sir">Ye doubt Sir ko bhej diya hai. Sir ka jawab yahin dikhega.</div>
        )}
        {error && <div className="doubt-err">{error}</div>}
        <div ref={endRef} />
      </div>

      {lastHelper && doubt?.status === 'ai' && !sending && (
        <div className="doubt-actions">
          <button className={doubt.helpful ? 'on' : ''} onClick={() => act('feedback', { helpful: true })}>👍 Samajh aaya</button>
          <button onClick={() => act('escalate')}>🙋 Sir se poochho</button>
        </div>
      )}

      <form className="doubt-input" onSubmit={e => { e.preventDefault(); send() }}>
        <textarea rows={1} placeholder={messages.length ? 'Aur kuch poochho…' : 'Apna doubt likho…'} value={text}
          onChange={e => setText(e.target.value)} maxLength={1500}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Send"><Send size={16} /></button>
      </form>
    </div>
  )
}

export function DoubtButton({ onClick }) {
  return (
    <button className="doubt-btn" onClick={onClick}>
      <MessageCircleQuestion size={17} /> Doubt poochho
    </button>
  )
}
