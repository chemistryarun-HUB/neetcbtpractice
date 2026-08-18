import { useEffect, useMemo, useState } from 'react'
import {
  Rocket, Target, TrendingUp, Unlock, Layers, RotateCcw, PartyPopper,
  ChevronLeft, ChevronRight, X, Lock,
} from 'lucide-react'
import { QUESTIONS_PER_ATTEMPT, MARKS_CORRECT, MARKS_WRONG, UNLOCK_THRESHOLDS, thresholdPctFor } from '../../lib/constants'

// One localStorage key per student — so a shared device doesn't skip the
// tour for a second student, and doesn't misfire for the admin/faculty
// accounts (which never mount this component in the first place).
const seenKey = studentId => `neetcbt_level_tour_seen_v1_${studentId || 'anon'}`

export function hasTourBeenSeen(studentId) {
  try { return localStorage.getItem(seenKey(studentId)) === '1' } catch { return true }
}

function markTourSeen(studentId) {
  try { localStorage.setItem(seenKey(studentId), '1') } catch { /* private-mode Safari etc. — worst case it re-offers the tour next visit */ }
}

// Small reusable visual: the marking-scheme chip row, shared by two steps.
function MarkingChips() {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.5rem 0' }}>
      {[
        { label: 'Correct', value: `+${MARKS_CORRECT}`, bg: '#dcfce7', color: '#15803d', border: '#86efac' },
        { label: 'Wrong', value: MARKS_WRONG, bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
        { label: 'Skipped', value: '0', bg: 'var(--gray-100)', color: 'var(--gray-500)', border: 'var(--gray-200)' },
      ].map(c => (
        <div key={c.label} style={{
          padding: '0.5rem 0.9rem', borderRadius: 10, background: c.bg, color: c.color,
          border: `1.5px solid ${c.border}`, textAlign: 'center', minWidth: 84,
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{c.value}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.15rem' }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

// The unlock-threshold ladder, read live from UNLOCK_THRESHOLDS rather than
// hardcoded — if the admin ever retunes the bar, this stays correct with no
// copy to go find and update.
function ThresholdLadder() {
  const rows = useMemo(() => {
    const attempts = UNLOCK_THRESHOLDS.map(t => t.attempt)
    const last = Math.max(...attempts)
    return [...UNLOCK_THRESHOLDS.map(t => ({ attempt: t.attempt, pct: t.score_pct, isLast: t.attempt === last }))]
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.5rem 0' }}>
      {rows.map(r => (
        <div key={r.attempt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 78, flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)' }}>
            Attempt {r.attempt}{r.isLast ? '+' : ''}
          </div>
          <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--gray-100)', overflow: 'hidden' }}>
            <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--primary), var(--primary-dark))' }} />
          </div>
          <div style={{ width: 44, flexShrink: 0, textAlign: 'right', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--primary)' }}>
            {r.pct}%
          </div>
        </div>
      ))}
    </div>
  )
}

function buildSteps(firstName) {
  const attempt1Pct = thresholdPctFor(1)
  const attempt3Pct = thresholdPctFor(3)
  const maxMarks = QUESTIONS_PER_ATTEMPT * MARKS_CORRECT

  return [
    {
      icon: Rocket,
      title: `Welcome, ${firstName || 'there'}! 👋`,
      body: (
        <p style={{ margin: 0 }}>
          Before you dive in — here's exactly how levels, scoring and unlocking work on NEETCBT,
          so nothing ever feels like a mystery. Takes under a minute.
        </p>
      ),
    },
    {
      icon: Target,
      title: `Every attempt is ${QUESTIONS_PER_ATTEMPT} questions`,
      body: (
        <>
          <p style={{ margin: '0 0 0.25rem' }}>
            Each level gives you {QUESTIONS_PER_ATTEMPT} MCQs, marked exactly like the real NEET exam:
          </p>
          <MarkingChips />
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
            Max possible for one attempt: <strong>{maxMarks} marks</strong>. Not sure of an answer?
            Skipping costs nothing — a wrong guess costs you {Math.abs(MARKS_WRONG)}.
          </p>
        </>
      ),
    },
    {
      icon: TrendingUp,
      title: `Clear a level with ${attempt1Pct}% on attempt 1`,
      body: (
        <>
          <p style={{ margin: '0 0 0.25rem' }}>
            Score at least <strong>{attempt1Pct}%</strong> of the max marks on your first try at a
            level, and the next one unlocks immediately. Don't make it? The bar gets a little easier
            each retry — because the point is to keep you practicing, not stuck:
          </p>
          <ThresholdLadder />
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
            From attempt {UNLOCK_THRESHOLDS[UNLOCK_THRESHOLDS.length - 1].attempt} onward the bar
            holds at {attempt3Pct}% — so you always have a fair shot.
          </p>
        </>
      ),
    },
    {
      icon: Unlock,
      title: 'Level 1 and the Complete Chapter Test are always open',
      body: (
        <>
          <p style={{ margin: '0 0 0.6rem' }}>
            You can start <strong>Level 1</strong> of any active unit right away — no unlocking needed.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <div style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'var(--primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary-dark)' }}>
                <Unlock size={14} /> Level 1
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>Always open</div>
            </div>
            <div style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'var(--primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary-dark)' }}>
                <Unlock size={14} /> CCT
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>Always open</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
            The <strong>Complete Chapter Test (CCT)</strong> is the last level of every unit — it pulls
            questions from every level in that chapter combined, so you can test your whole command of
            the topic anytime, even before finishing the levels in between.
          </p>
        </>
      ),
    },
    {
      icon: Layers,
      title: 'Every level in between unlocks the next',
      body: (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.6rem', flexWrap: 'wrap' }}>
            {['1', '2', '3', '4', '…'].map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8125rem',
                  background: i === 0 ? 'var(--primary)' : 'var(--gray-100)',
                  color: i === 0 ? '#fff' : 'var(--gray-400)',
                  border: i === 0 ? 'none' : '1.5px dashed var(--gray-300)',
                }}>
                  {i === 4 ? <Lock size={13} /> : n}
                </div>
                {i < 4 && <ChevronRight size={14} style={{ color: 'var(--gray-300)' }} />}
              </div>
            ))}
          </div>
          <p style={{ margin: 0 }}>
            Levels 2, 3, 4… open one at a time as you clear the one before. And once a level is
            unlocked, it <strong>stays</strong> unlocked — come back anytime to sharpen a topic you're
            weak on, even after moving ahead.
          </p>
        </>
      ),
    },
    {
      icon: RotateCcw,
      title: 'Retrying never means running out of questions',
      body: (
        <p style={{ margin: 0 }}>
          Already seen every question in a level? A retry brings back the ones you got{' '}
          <strong>wrong</strong> first, then <strong>skipped</strong>, and only as a last resort ones
          you already got right — so every retry is still real practice, not just repetition.
        </p>
      ),
    },
    {
      icon: PartyPopper,
      title: "That's it — you're ready 🎯",
      body: (
        <p style={{ margin: 0 }}>
          Pick a unit, start with Level 1, and chase that unlock. You can reopen this tour anytime
          from the <strong>"How levels work"</strong> link. Good luck!
        </p>
      ),
      isLast: true,
    },
  ]
}

/**
 * A short, always-accurate walkthrough of how levels/unlocking/scoring work.
 * Numbers are pulled live from lib/constants.js (QUESTIONS_PER_ATTEMPT,
 * MARKS_CORRECT/WRONG, UNLOCK_THRESHOLDS) rather than copied into prose, so
 * retuning a threshold there can never leave this tour telling a student the
 * wrong bar to clear.
 *
 * Auto-opens once per student (see hasTourBeenSeen/markTourSeen, keyed by
 * student id in localStorage) and stays reachable afterwards via whatever
 * "How levels work" trigger the caller renders.
 */
export default function LevelRulesTour({ studentId, studentName, onClose }) {
  const steps = useMemo(() => buildSteps((studentName || '').trim().split(/\s+/)[0]), [studentName])
  const [i, setI] = useState(0)
  const step = steps[i]
  const atFirst = i === 0
  const atLast = i === steps.length - 1

  function finish() {
    markTourSeen(studentId)
    onClose()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(); return }
      if (e.key === 'ArrowRight' && !atLast) { e.preventDefault(); setI(v => v + 1) }
      if (e.key === 'ArrowLeft' && !atFirst) { e.preventDefault(); setI(v => v - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const Icon = step.icon

  return (
    <div className="modal-overlay" onClick={finish}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0,
            }}>
              <Icon size={18} />
            </div>
            <span style={{ fontSize: '0.9375rem' }}>{step.title}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={finish} aria-label="Close tour"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1.1rem' }}>
          <div style={{ fontSize: '0.9375rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>{step.body}</div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress dots double as the step count — no separate "3 of 7" label needed. */}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {steps.map((_, idx) => (
              <span key={idx} style={{
                width: idx === i ? 16 : 6, height: 6, borderRadius: 999, transition: 'width 0.15s',
                background: idx === i ? 'var(--primary)' : 'var(--gray-200)',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!atFirst && (
              <button className="btn btn-ghost btn-sm" onClick={() => setI(v => v - 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <ChevronLeft size={15} /> Back
              </button>
            )}
            {!atLast ? (
              <button className="btn btn-primary btn-sm" onClick={() => setI(v => v + 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={finish}>
                Let's go 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
