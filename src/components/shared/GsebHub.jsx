import { Link } from 'react-router-dom'
import { Play, RotateCcw, FileText, Atom, FlaskConical, Dna, Sigma, CheckCircle2, Sparkles } from 'lucide-react'

// The GSEB hub look, shared by the student page and the admin papers page:
// subject colours, the score ring and one card shape for papers and chapters.
// Styles are the .gx-* rules in index.css.

// Each subject has its own colour, carried by the hero, the tabs and every card.
const LOOK = {
  physics:   { icon: Atom,         c: '#4f46e5', deep: '#312e81', soft: '#eef2ff' },
  chemistry: { icon: FlaskConical, c: '#ea580c', deep: '#7c2d12', soft: '#fff7ed' },
  biology:   { icon: Dna,          c: '#059669', deep: '#064e3b', soft: '#ecfdf5' },
  maths:     { icon: Sigma,        c: '#1a56db', deep: '#1e3a8a', soft: '#e1effe' },
}
export const lookOf = s => LOOK[s] || LOOK.maths
export const lookVars = s => { const l = lookOf(s); return { '--c': l.c, '--c-deep': l.deep, '--c-soft': l.soft } }

// Chapter practice attempts are titled "Physics · Ch 4 Moving Charges…".
export const chapterOfAttempt = a => Number(a.title?.match(/· Ch (\d+)\b/)?.[1]) || null
export const answeredOf = a => (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)
export const pctOf = (score, total) => total ? Math.min(100, Math.round((score / total) * 100)) : 0
const scoreColor = p => p >= 70 ? '#16a34a' : p >= 40 ? '#d97706' : '#dc2626'

export function Ring({ pct, empty = 'NEW' }) {
  const r = 21, c = 2 * Math.PI * r
  return (
    <svg className="gx-ring" width="54" height="54" viewBox="0 0 54 54" aria-label={pct == null ? 'No score yet' : `${pct}%`}>
      <circle cx="27" cy="27" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="5" />
      {pct != null && (
        <circle className="gx-ring-arc" cx="27" cy="27" r={r} fill="none" stroke={scoreColor(pct)} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ '--full': c }} transform="rotate(-90 27 27)" />
      )}
      <text x="27" y="31" textAnchor="middle" fontSize={pct == null ? 10 : 12} fontWeight="800" fill={pct == null ? 'var(--gray-400)' : 'var(--gray-800)'}>
        {pct == null ? empty : `${pct}%`}
      </text>
    </svg>
  )
}

/**
 * One card shape for both views: a year paper and a chapter read the same way.
 * done (default: a score exists) turns the status line green; primary.icon
 * replaces the play / try-again icon.
 */
export function PracticeCard({ badgeTop, badgeMain, title, sub, chips, best, ringEmpty, status, done = best != null, versus, lastResult, primary, partB, extra }) {
  const Icon = primary.icon || (primary.again ? RotateCcw : Play)
  return (
    <div className="gx-card">
      <div className="gx-card-head">
        <div className="gx-badge"><small>{badgeTop}</small><b>{badgeMain}</b></div>
        <div style={{ minWidth: 0 }}>
          <div className="gx-card-title" title={title}>{title}</div>
          <div className="gx-card-sub">{sub}</div>
        </div>
        <Ring pct={best} empty={ringEmpty} />
      </div>
      <div className="gx-chips">
        {chips.filter(Boolean).map(({ icon: ChipIcon, text, tone }) => (
          <span key={text} className={`gx-chip${tone ? ` ${tone}` : ''}`}><ChipIcon size={13} /> {text}</span>
        ))}
      </div>
      <div className={`gx-status${done ? ' done' : ''}`}>
        {done ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
        <span>{status}</span>
        {versus != null && <span className={`gx-vs ${versus >= 0 ? 'up' : 'down'}`}>{versus >= 0 ? '+' : ''}{versus}% vs class</span>}
        {lastResult && <Link to={lastResult} className="gx-link">Last result →</Link>}
      </div>
      <div className="gx-actions">
        <button className="gx-go" onClick={primary.onClick} disabled={primary.disabled}>
          <Icon size={15} /> {primary.label}
        </button>
        {partB && <Link to={partB.to} className="gx-ghost"><FileText size={14} /> Part B{partB.count ? ` · ${partB.count}` : ''}</Link>}
        {extra}
      </div>
    </div>
  )
}

export function SkeletonGrid() {
  return (
    <div className="gx-grid" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="gx-card gx-skel">
          <div className="gx-card-head"><i className="sk sk-badge" /><div style={{ flex: 1 }}><i className="sk sk-line" /><i className="sk sk-line short" /></div></div>
          <i className="sk sk-line" style={{ width: '55%' }} />
          <i className="sk sk-btn" />
        </div>
      ))}
    </div>
  )
}
