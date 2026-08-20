import { useMemo, useState } from 'react'
import { MessageCircle, ChevronRight, TrendingDown } from 'lucide-react'
import {
  aggregateAccuracy, aggregateScorePct, totalQuestions, scorePct,
  mostRecent, daysSince, buildActivityMessage, unitName,
} from '../../lib/performanceMetrics'
import { levelBadge } from '../../lib/constants'
import UnitDrilldown from './UnitDrilldown'

function classSortKey(cls) {
  const m = (cls || '').match(/\d+/)
  return m ? Number(m[0]) : 999
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function waLink(phone, message) {
  if (!phone) return null
  const cleaned = String(phone).replace(/\D/g, '')
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// Weakest unit for one student — same "needs ≥3 attempts to mean anything"
// guard StudentProfile.jsx uses, so a single unlucky attempt on a brand-new
// unit doesn't get flagged as their weak spot.
function weakestUnitFor(attempts) {
  const byUnit = {}
  for (const a of attempts) {
    if (a.unit_id == null) continue
    ;(byUnit[a.unit_id] ||= []).push(a)
  }
  const rows = Object.entries(byUnit)
    .map(([unitId, rows]) => ({ unitId: Number(unitId), accuracy: aggregateAccuracy(rows), attempts: rows.length }))
    .filter(u => u.attempts >= 3)
  if (rows.length === 0) return null
  return rows.reduce((worst, u) => (u.accuracy < worst.accuracy ? u : worst))
}

// Green/amber/red — the same three-way split as .badge-easy/-medium/-hard
// everywhere else in the app (question difficulty badges, level-cleared
// status), so "70%+ good, 50-70% borderline, <50% weak" reads consistently
// with what admins already associate those colors with.
function bandColor(pct) {
  if (pct >= 70) return { bg: '#dcfce7', fg: '#15803d', border: '#86efac' }
  if (pct >= 50) return { bg: '#fef9c3', fg: '#92400e', border: '#fde68a' }
  return { bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5' }
}

// Note: no progressByStudent prop. Everything here is derived from actual
// submitted attempts rather than unlocked_levels_by_unit — an unlocked-based
// count reads as a meaningless 100% on Level 1 and the CCT, which are open to
// everyone from day one without being earned.
export default function ClassReport({
  students, attemptsByStudent,
  selectedClass, onSelectClass, onSelectStudent, onShowLeaderboard,
}) {
  const [expandedUnit, setExpandedUnit] = useState(null)
  const [drilldownUnitId, setDrilldownUnitId] = useState(null)

  const classes = useMemo(() => {
    const set = new Set(students.map(s => s.class).filter(Boolean))
    return [...set].sort((a, b) => classSortKey(a) - classSortKey(b))
  }, [students])

  const scopeStudents = useMemo(
    () => (selectedClass && selectedClass !== 'all' ? students.filter(s => s.class === selectedClass) : students),
    [students, selectedClass],
  )

  const scopeAttempts = useMemo(
    () => scopeStudents.flatMap(s => attemptsByStudent[s.id] || []),
    [scopeStudents, attemptsByStudent],
  )

  // ── Headline tiles ──
  const activeStudents = scopeStudents.filter(s => (attemptsByStudent[s.id] || []).length > 0)
  const overallAccuracy = aggregateAccuracy(scopeAttempts)
  const overallScorePct = aggregateScorePct(scopeAttempts)
  const totalQAttempted = scopeAttempts.reduce((s, a) => s + totalQuestions(a), 0)
  const activeLast7 = scopeStudents.filter(s => {
    const m = mostRecent(attemptsByStudent[s.id] || [])
    const d = m ? daysSince(m.submitted_at) : null
    return d != null && d <= 7
  }).length

  // ── Unit weak-spot heatmap ──
  // Unit-level first (cheap: one aggregate per unit already-loaded attempts
  // carry unit_id/level directly, no per-question join needed), with a
  // per-level breakdown on expand for exactly the unit someone clicks into —
  // a full unit×level grid up front would be enormous across 23 units.
  const unitRows = useMemo(() => {
    const byUnit = {}
    for (const a of scopeAttempts) {
      if (a.unit_id == null) continue
      ;(byUnit[a.unit_id] ||= []).push(a)
    }
    return Object.entries(byUnit)
      .map(([unitId, rows]) => ({
        unitId: Number(unitId),
        name: unitName(Number(unitId)),
        accuracy: aggregateAccuracy(rows),
        attempts: rows.length,
      }))
      // Weakest first — that's the point of the heatmap — but a unit with only
      // 1-2 attempts can land at 0% by pure chance and would otherwise outrank
      // a unit genuinely struggled with across 80 attempts. Same reliability
      // guard as the at-risk list below (≥3 data points before a number gets
      // to claim "weakest"): units below that sort to the bottom regardless of
      // their score, ranked only by accuracy among themselves once there.
      .sort((a, b) => {
        const relA = a.attempts >= 3, relB = b.attempts >= 3
        if (relA !== relB) return relA ? -1 : 1
        return a.accuracy - b.accuracy
      })
  }, [scopeAttempts])

  const levelRowsForExpandedUnit = useMemo(() => {
    if (expandedUnit == null) return []
    const byLevel = {}
    for (const a of scopeAttempts) {
      if (a.unit_id !== expandedUnit) continue
      ;(byLevel[a.level] ||= []).push(a)
    }
    return Object.entries(byLevel)
      .map(([level, rows]) => ({ level: Number(level), accuracy: aggregateAccuracy(rows), attempts: rows.length }))
      .sort((a, b) => a.level - b.level)
  }, [expandedUnit, scopeAttempts])

  // Units this class has actually touched — the drill-down's unit picker, and
  // the fallback for which unit it opens on.
  const unitsWithData = useMemo(() => [...new Set(scopeAttempts.map(a => a.unit_id).filter(id => id != null))]
    .sort((a, b) => a - b), [scopeAttempts])
  // Defaults to the weakest unit rather than the lowest-numbered one: the
  // drill-down exists to answer "who's stuck where", so it should open on the
  // unit most likely to need that answer. A previously-picked unit is dropped
  // if the newly-selected class has no attempts in it, which would otherwise
  // strand the drill-down on an all-zeroes unit after switching class.
  const activeDrilldownUnitId = (drilldownUnitId != null && unitsWithData.includes(drilldownUnitId))
    ? drilldownUnitId
    : (unitRows[0]?.unitId ?? unitsWithData[0] ?? null)

  // ── Score distribution ──
  const distBands = useMemo(() => {
    const bands = [
      { label: '< 40%', min: -Infinity, max: 40, count: 0 },
      { label: '40–60%', min: 40, max: 60, count: 0 },
      { label: '60–80%', min: 60, max: 80, count: 0 },
      { label: '80%+', min: 80, max: Infinity, count: 0 },
    ]
    for (const a of scopeAttempts) {
      const pct = scorePct(a)
      const band = bands.find(b => pct >= b.min && pct < b.max) || bands[bands.length - 1]
      band.count++
    }
    return bands
  }, [scopeAttempts])
  const maxBandCount = Math.max(1, ...distBands.map(b => b.count))

  // ── At-risk shortlist ──
  const atRisk = useMemo(() => {
    return scopeStudents
      .map(s => {
        const attempts = attemptsByStudent[s.id] || []
        return { student: s, attempts, accuracy: aggregateAccuracy(attempts), weakest: weakestUnitFor(attempts) }
      })
      .filter(r => r.attempts.length >= 3 && r.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10)
  }, [scopeStudents, attemptsByStudent])

  // ── Engagement buckets ──
  const engagement = useMemo(() => {
    const buckets = { active7: 0, days8to14: 0, days15to30: 0, days30plus: 0, never: 0 }
    for (const s of scopeStudents) {
      const m = mostRecent(attemptsByStudent[s.id] || [])
      if (!m) { buckets.never++; continue }
      const d = daysSince(m.submitted_at)
      if (d <= 7) buckets.active7++
      else if (d <= 14) buckets.days8to14++
      else if (d <= 30) buckets.days15to30++
      else buckets.days30plus++
    }
    return buckets
  }, [scopeStudents, attemptsByStudent])

  const activeClass = selectedClass && selectedClass !== 'all' ? selectedClass : null

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.25rem' }}>
        <div className="identity">
          <div className="avatar" style={{ background: 'var(--gray-400)' }}>{activeClass ? initials(activeClass) : 'ALL'}</div>
          <div>
            <h1>{activeClass || 'All Classes'} — Class Report</h1>
            <div className="meta"><span>{scopeStudents.length} student{scopeStudents.length !== 1 ? 's' : ''}</span></div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={onShowLeaderboard}>View leaderboard →</button>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: '1.25rem' }}>
        <button className={`chip ${!activeClass ? 'active' : ''}`} onClick={() => onSelectClass('all')}>All classes</button>
        {classes.map(cls => (
          <button key={cls} className={`chip ${activeClass === cls ? 'active' : ''}`} onClick={() => onSelectClass(cls)}>{cls}</button>
        ))}
      </div>

      {scopeStudents.length === 0 ? (
        <div className="empty-state">No students in this class</div>
      ) : (
        <>
          {/* ── Headline tiles ── */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-value">{activeStudents.length}<span style={{ fontSize: '0.9375rem', color: 'var(--gray-400)' }}>/{scopeStudents.length}</span></div>
              <div className="stat-label">Students Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallAccuracy.toFixed(0)}%</div>
              <div className="stat-label">Class Accuracy</div>
              <div className="text-muted" style={{ marginTop: '0.35rem' }}>{overallScorePct.toFixed(0)}% of max marks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalQAttempted}</div>
              <div className="stat-label">Questions Attempted</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{activeLast7}<span style={{ fontSize: '0.9375rem', color: 'var(--gray-400)' }}>/{scopeStudents.length}</span></div>
              <div className="stat-label">Active Last 7 Days</div>
            </div>
          </div>

          {scopeAttempts.length === 0 ? (
            <div className="empty-state">No attempts yet in this class</div>
          ) : (
            <div className="perf-split" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
              {/* ── Unit weak-spot heatmap ── */}
              <div className="card">
                <div className="card-header">Weakest Units — where to reteach</div>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {unitRows.map(row => {
                    const c = bandColor(row.accuracy)
                    const isExpanded = expandedUnit === row.unitId
                    return (
                      <div key={row.unitId}>
                        <button
                          // Also points the drill-down below at this unit — clicking a
                          // weak unit here and then asking "so who's stuck in it?" is
                          // the natural next question, and scrolling down to re-pick
                          // the same unit from a dropdown would be busywork.
                          onClick={() => { setExpandedUnit(isExpanded ? null : row.unitId); setDrilldownUnitId(row.unitId) }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.5rem 0.625rem', borderRadius: 8, border: `1.5px solid ${c.border}`,
                            background: c.bg, cursor: 'pointer', textAlign: 'left',
                          }}>
                          <ChevronRight size={14} style={{ color: c.fg, flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', fontWeight: 600, color: c.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.name}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: c.fg, opacity: 0.75, flexShrink: 0 }}>{row.attempts} attempt{row.attempts !== 1 ? 's' : ''}</span>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: c.fg, flexShrink: 0, minWidth: 42, textAlign: 'right' }}>{row.accuracy.toFixed(0)}%</span>
                        </button>
                        {isExpanded && (
                          <div style={{ padding: '0.5rem 0.5rem 0.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {levelRowsForExpandedUnit.map(lr => (
                              <div key={lr.level} className="perf-bar-row">
                                <span className="perf-bar-label">{levelBadge(row.unitId, lr.level)}</span>
                                <span className="perf-bar-track">
                                  <span className="perf-bar-fill" style={{ width: `${Math.max(lr.accuracy, 3)}%`, background: bandColor(lr.accuracy).fg }} />
                                </span>
                                <span className="perf-bar-value">{lr.accuracy.toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* ── Score distribution ── */}
                <div className="card">
                  <div className="card-header">Score Distribution</div>
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {distBands.map(b => (
                      <div key={b.label} className="perf-bar-row" style={{ gridTemplateColumns: '64px 1fr 30px' }}>
                        <span className="perf-bar-label">{b.label}</span>
                        <span className="perf-bar-track">
                          <span className="perf-bar-fill" style={{ width: `${(b.count / maxBandCount) * 100}%` }} />
                        </span>
                        <span className="perf-bar-value">{b.count}</span>
                      </div>
                    ))}
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Across all {scopeAttempts.length} submitted attempts in this scope (score as % of max marks).
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── Class → Unit → Level → Student drill-down ── */}
          {activeDrilldownUnitId != null && (
            <UnitDrilldown
              students={scopeStudents}
              attemptsByStudent={attemptsByStudent}
              unitId={activeDrilldownUnitId}
              unitOptions={unitsWithData}
              onSelectUnit={setDrilldownUnitId}
              onSelectStudent={onSelectStudent}
            />
          )}

          {/* ── Engagement ── */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">Engagement</div>
            <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Active ≤7 days', value: engagement.active7, color: '#15803d' },
                { label: '8–14 days ago', value: engagement.days8to14, color: '#92400e' },
                { label: '15–30 days ago', value: engagement.days15to30, color: '#b45309' },
                { label: '30+ days ago', value: engagement.days30plus, color: '#b91c1c' },
                { label: 'Never practiced', value: engagement.never, color: 'var(--gray-400)' },
              ].map(e => (
                <div key={e.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: e.color }}>{e.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{e.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── At-risk shortlist ── */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={16} style={{ color: '#b91c1c' }} /> Needs Attention
              <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>— under 60% accuracy, at least 3 attempts</span>
            </div>
            {atRisk.length === 0 ? (
              <div className="empty-state">No one meets this yet — either everyone's doing fine, or not enough attempts logged.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th style={{ textAlign: 'right' }}>Attempts</th>
                      <th style={{ textAlign: 'right' }}>Accuracy</th>
                      <th>Weakest unit</th>
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map(row => {
                      const lastActive = mostRecent(row.attempts)?.submitted_at
                      const msg = buildActivityMessage({
                        name: row.student.name,
                        totalAttempts: row.attempts.length,
                        streak: 0,
                        lastActiveIso: lastActive,
                        overallAccuracy: row.accuracy,
                        weakestUnitName: row.weakest ? unitName(row.weakest.unitId) : undefined,
                      })
                      const link = waLink(row.student.phone_student || row.student.phone_father || row.student.phone_mother, msg)
                      return (
                        <tr key={row.student.id}>
                          <td>
                            <button className="perf-lb-student" onClick={() => onSelectStudent(row.student.id)}>
                              <span className="perf-s-avatar">{initials(row.student.name)}</span>
                              <span>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.student.name}</span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-400)' }}>{row.student.class || '—'}</span>
                              </span>
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>{row.attempts.length}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>{row.accuracy.toFixed(0)}%</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{row.weakest ? unitName(row.weakest.unitId) : '—'}</td>
                          <td>
                            {link && (
                              <a href={link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <MessageCircle size={13} color="#25d366" /> Nudge
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
