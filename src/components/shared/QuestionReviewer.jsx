import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Pencil, Lock } from 'lucide-react'
import { deriveTopic, deriveFullTopic, unitIdOf } from '../../lib/topics'
import { levelBadge } from '../../lib/constants'
import QuestionView from './QuestionView'
import QuestionEditPanel from './QuestionEditPanel'
import InfoTooltip from './InfoTooltip'

// Keys that navigate/act only when the admin isn't typing into the edit form.
function isTyping(target) {
  const tag = (target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable
}

/**
 * Full-screen question reviewer.
 *
 * The question bank's list view is for *finding* a question; this is for
 * *reading* one. It takes over the whole viewport so the question renders at
 * the size a student actually sees it at, and it walks the same filtered list
 * the admin was already looking at — ← / → step through questions without ever
 * going back to the table.
 *
 * Everything it mutates goes back to the caller as a patch (onToggleActive,
 * onSaved) so the underlying list is updated in place. Nothing here triggers a
 * refetch, which is what keeps the admin's scroll position and place in the
 * level intact for the whole review session.
 */
export default function QuestionReviewer({
  questions,
  index,
  onIndexChange,
  onClose,
  onToggleActive,
  onSaved,
  startInEdit = false,
}) {
  const [mode, setMode] = useState('student')   // 'student' | 'admin'
  const [editing, setEditing] = useState(startInEdit)
  const paletteRef = useRef(null)
  const contentRef = useRef(null)

  const q = questions[index]
  const total = questions.length
  const atFirst = index <= 0
  const atLast = index >= total - 1

  function go(delta) {
    const next = index + delta
    if (next < 0 || next >= total) return
    onIndexChange(next)
  }

  // Fresh question, fresh scroll — a long question left the next one scrolled
  // halfway down otherwise. Editing closes on move so ← / → can never carry
  // half-typed edits onto a different row (startInEdit applies to the question
  // the reviewer was opened on, not to every question walked to afterwards).
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) setEditing(false)
    mounted.current = true
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [q?.id])

  // Keep the current chip visible in the palette strip as ← / → walk past it.
  useEffect(() => {
    paletteRef.current?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [index])

  // Lock the page behind the overlay so a wheel event that runs past the end of
  // the question doesn't quietly scroll the list underneath it.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (editing) setEditing(false)
        else onClose()
        return
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); go(1); break
        case 'ArrowLeft':  e.preventDefault(); go(-1); break
        case 'Home':       e.preventDefault(); onIndexChange(0); break
        case 'End':        e.preventDefault(); onIndexChange(total - 1); break
        case 'e': case 'E': e.preventDefault(); setEditing(v => !v); break
        case 'v': case 'V': e.preventDefault(); setMode(m => (m === 'student' ? 'admin' : 'student')); break
        case 'a': case 'A': e.preventDefault(); onToggleActive(q); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })   // no dep array: handlers close over index/editing/q, which change every render

  if (!q) return null

  const isInactive = q.is_active === false
  const topic = deriveTopic(q.unit, q.level) || q.topic || '—'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, background: 'var(--gray-50)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header: identity + controls, deliberately one slim row ── */}
      <div style={{
        background: 'var(--primary)', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0.5rem 1rem', flexWrap: 'wrap',
      }}>
        <button onClick={onClose} title="Close (Esc)"
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 'var(--radius)', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <code style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.02em' }}>{q.qid}</code>
          {q.content_locked && <Lock size={13} style={{ opacity: 0.8 }} />}
          {isInactive && (
            <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>INACTIVE</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', opacity: 0.9, minWidth: 0, flex: '1 1 200px' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.unit}>{q.unit}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {levelBadge(unitIdOf(q.unit), q.level)}: {topic}
          </span>
          <InfoTooltip text={deriveFullTopic(q.unit, q.level) || q.topic} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{q.question_type}</span>
          <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
          {mode === 'admin' && q.question_tag && (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{q.question_tag}</span>
          )}
          {mode === 'admin' && q.source && (
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Source: {q.source}</span>
          )}

          {/* Admin / Student view toggle (V) */}
          <div style={{ display: 'flex' }}>
            {['admin', 'student'].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                title={`${m === 'admin' ? 'Admin view — reveals the answer key' : 'Student preview — exactly what a student sees'} (V)`}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  borderRadius: m === 'admin' ? 'var(--radius) 0 0 var(--radius)' : '0 var(--radius) var(--radius) 0',
                  marginLeft: m === 'student' ? '-1.5px' : 0,
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? 'var(--primary)' : '#fff',
                }}>
                {m === 'admin' ? 'Admin' : 'Student'}
              </button>
            ))}
          </div>

          {/* Active / Inactive toggle (A) */}
          <button onClick={() => onToggleActive(q)}
            title={isInactive ? 'Click to restore this question (A)' : 'Click to deactivate this question (A)'}
            style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: 'var(--radius)', cursor: 'pointer',
              background: isInactive ? '#fee2e2' : '#dcfce7',
              color: isInactive ? '#b91c1c' : '#15803d',
              border: `1.5px solid ${isInactive ? '#fca5a5' : '#86efac'}`,
            }}>
            {isInactive ? 'Inactive' : 'Active'}
          </button>

          <button onClick={() => setEditing(v => !v)} title="Edit this question (E)"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
              padding: '0.3rem 0.65rem', borderRadius: 'var(--radius)', cursor: 'pointer',
              background: editing ? '#fff' : 'rgba(255,255,255,0.15)',
              color: editing ? '#b45309' : '#fff',
              border: '1.5px solid rgba(255,255,255,0.6)',
            }}>
            <Pencil size={13} /> {editing ? 'Editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ── The question itself: everything above and below this is ~110px, so
             the question owns the rest of the screen ── */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem 2rem' }}>
        <div style={{ maxWidth: editing ? 1100 : 860, margin: '0 auto' }}>
          {editing ? (
            <QuestionEditPanel
              key={q.id}
              q={q}
              onSaved={row => { onSaved(row); setEditing(false) }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div style={{
              background: '#fff', borderRadius: 14, border: '1px solid var(--gray-200)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '2rem 2.25rem',
              opacity: isInactive ? 0.7 : 1,
            }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Q{index + 1}.
              </div>
              <QuestionView q={q} mode={mode} size="full" />
              {mode === 'student' && (
                <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                  Exactly how a student sees this question — options are shuffled during the actual test.
                  Press <strong>V</strong> to reveal the answer key.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: prev / palette / next ── */}
      <div style={{
        flexShrink: 0, background: '#fff', borderTop: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => go(-1)} disabled={atFirst}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <ChevronLeft size={16} /> Previous
        </button>

        <div ref={paletteRef} style={{ flex: 1, minWidth: 0, display: 'flex', gap: '0.3rem', overflowX: 'auto', padding: '0.15rem 0' }}>
          {questions.map((item, i) => {
            const current = i === index
            const inactive = item.is_active === false
            return (
              <button key={item.id} data-current={current} onClick={() => onIndexChange(i)}
                title={`${item.qid} — ${(item.question || '').slice(0, 70)}`}
                style={{
                  flexShrink: 0, minWidth: 30, height: 28, padding: '0 0.35rem', borderRadius: 6,
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${current ? 'var(--primary)' : inactive ? '#fca5a5' : 'var(--gray-200)'}`,
                  background: current ? 'var(--primary)' : inactive ? '#fef2f2' : '#fff',
                  color: current ? '#fff' : inactive ? '#b91c1c' : 'var(--gray-600)',
                }}>
                {i + 1}
              </button>
            )
          })}
        </div>

        <div style={{ flexShrink: 0, fontSize: '0.8125rem', color: 'var(--gray-500)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {index + 1} of {total}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => go(1)} disabled={atLast}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          Next <ChevronRight size={16} />
        </button>
      </div>

      <div style={{
        flexShrink: 0, background: 'var(--gray-100)', borderTop: '1px solid var(--gray-200)',
        padding: '0.25rem 1rem', fontSize: '0.7rem', color: 'var(--gray-500)',
        display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <span><kbd>←</kbd> <kbd>→</kbd> prev / next</span>
        <span><kbd>V</kbd> admin ↔ student</span>
        <span><kbd>E</kbd> edit</span>
        <span><kbd>A</kbd> active / inactive</span>
        <span><kbd>Home</kbd> <kbd>End</kbd> first / last</span>
        <span><kbd>Esc</kbd> back to list</span>
      </div>
    </div>
  )
}
