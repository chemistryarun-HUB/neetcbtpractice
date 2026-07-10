import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import InfoTooltip from '../../../components/shared/InfoTooltip'
import {
  unitName, levelDef, totalQuestions, accuracyOf, aggregateAccuracy, avgTimePerQuestion,
  computeStreak, clearedInfo, trendLabel, groupByUnitLevel, mostRecent, fmtDuration, fmtWhen,
} from '../../../lib/performanceMetrics'

const LOGIN_URL = 'https://chemistryarun-hub.github.io/neetcbtpractice/'
function waLink(phone, message) {
  if (!phone) return null
  const cleaned = String(phone).replace(/\D/g, '')
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function StudentProfile({ student, progress, attempts, onOpenReview }) {
  const [unitFilter, setUnitFilter] = useState('all')

  const groups = useMemo(() => groupByUnitLevel(attempts), [attempts])
  const groupEntries = useMemo(() => Object.entries(groups).map(([key, rows]) => {
    const [unitId, level] = key.split('-').map(Number)
    const recent = mostRecent(rows)
    return { key, unitId, level, rows, recent }
  }).sort((a, b) => a.unitId - b.unitId || a.level - b.level), [groups])

  const distinctUnits = useMemo(() => [...new Set(attempts.map(a => a.unit_id).filter(id => id != null))].sort((a, b) => a - b), [attempts])
  const visibleGroups = unitFilter === 'all' ? groupEntries : groupEntries.filter(g => g.unitId === Number(unitFilter))

  // Attempts predating the unit_id column can't show a unit — excluded from
  // the Last Attempt card specifically, but still count toward the raw
  // (unit-agnostic) stat tiles below.
  const lastAttempt = mostRecent(attempts.filter(a => a.unit_id != null))
  const mostRecentAny = mostRecent(attempts)
  const overallAccuracy = aggregateAccuracy(attempts)
  const avgTime = avgTimePerQuestion(attempts)
  const streak = computeStreak(attempts)
  const clearedCount = groupEntries.filter(g => clearedInfo(g.rows).cleared).length
  const totalMinutes = Math.round(attempts.reduce((s, a) => s + (a.time_taken || 0), 0) / 60)
  const lastActive = fmtWhen(mostRecentAny?.submitted_at)

  const unitAccuracyRows = useMemo(() => {
    const byUnit = {}
    for (const a of attempts) {
      if (a.unit_id == null) continue
      if (!byUnit[a.unit_id]) byUnit[a.unit_id] = []
      byUnit[a.unit_id].push(a)
    }
    return Object.entries(byUnit).map(([unitId, rows]) => ({
      unitId: Number(unitId),
      accuracy: aggregateAccuracy(rows),
      attempts: rows.length,
    })).sort((a, b) => b.accuracy - a.accuracy)
  }, [attempts])

  const unlockedUnitsCount = Object.keys(progress?.unlocked_levels_by_unit || {}).length

  return (
    <div>
      <div className="header">
        <div className="identity">
          <div className="avatar" style={{
            width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(155deg, var(--primary), var(--primary-dark))',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.125rem', flexShrink: 0,
          }}>
            {initials(student.name)}
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem', color: 'var(--gray-800)' }}>{student.name}</h1>
            <div className="meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 0.875rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              <code>{student.roll_number}</code>
              <span>Class {student.class} · NEET {student.neet_year}</span>
              <span>{unlockedUnitsCount} / 20 units unlocked</span>
            </div>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            ['Student', student.phone_student],
            ['Mother', student.phone_mother],
            ['Father', student.phone_father],
          ].map(([label, phone]) => {
            const link = waLink(phone, `Hello, checking in on ${student.name}'s NEET CBT practice. Login: ${LOGIN_URL}`)
            if (!link) return null
            return (
              <a key={label} href={link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MessageCircle size={13} color="#25d366" /> {label}
              </a>
            )
          })}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{attempts.length}</div>
          <div className="stat-label">Total Attempts</div>
          <div className="text-muted" style={{ marginTop: '0.35rem' }}>{groupEntries.length} topics · {distinctUnits.length} units</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overallAccuracy.toFixed(0)}%</div>
          <div className="stat-label">Overall Accuracy</div>
          <div className="text-muted" style={{ marginTop: '0.35rem' }}>{clearedCount} levels cleared</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgTime.toFixed(0)}<span style={{ fontSize: '0.9375rem', color: 'var(--gray-400)' }}>s</span></div>
          <div className="stat-label">Avg Time / Question</div>
          <div className="text-muted" style={{ marginTop: '0.35rem' }}>{totalMinutes}m practiced total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{streak}<span style={{ fontSize: '0.9375rem', color: 'var(--gray-400)' }}> day{streak !== 1 ? 's' : ''}</span></div>
          <div className="stat-label">Practice Streak</div>
          <div className="text-muted" style={{ marginTop: '0.35rem' }}>
            {lastAttempt ? `Last active ${lastActive.day}, ${lastActive.time}` : 'No attempts yet'}
          </div>
        </div>
      </div>

      <div className="perf-split">
        {lastAttempt ? (
          <LastAttemptCard attempt={lastAttempt} onOpen={() => onOpenReview(lastAttempt)} />
        ) : (
          <div className="card card-body empty-state">No attempts yet</div>
        )}

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Accuracy by Unit</span>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unitAccuracyRows.length === 0 ? (
              <div className="empty-state">No data yet</div>
            ) : unitAccuracyRows.map(row => (
              <div key={row.unitId} className="perf-bar-row" title={`${row.attempts} attempt${row.attempts !== 1 ? 's' : ''}`}>
                <span className="perf-bar-label">{unitName(row.unitId)}</span>
                <span className="perf-bar-track">
                  <span className="perf-bar-fill" style={{ width: `${Math.max(row.accuracy, 3)}%` }} />
                </span>
                <span className="perf-bar-value">{row.accuracy.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2 style={{ fontSize: '1.125rem', margin: 0 }}>Topic-wise Attempts</h2>
        <div className="chips">
          <button className={`chip ${unitFilter === 'all' ? 'active' : ''}`} onClick={() => setUnitFilter('all')}>All units</button>
          {distinctUnits.map(uid => (
            <button key={uid} className={`chip ${unitFilter === String(uid) ? 'active' : ''}`} onClick={() => setUnitFilter(String(uid))}>
              Unit {uid}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap card" style={{ marginBottom: '1.5rem' }}>
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Level</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th style={{ textAlign: 'right' }}>Correct</th>
              <th style={{ textAlign: 'right' }}>Wrong</th>
              <th style={{ textAlign: 'right' }}>Skipped</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map(g => {
              const a = g.recent
              const lDef = levelDef(g.unitId, g.level)
              const cleared = clearedInfo(g.rows)
              const trend = cleared.cleared ? null : trendLabel(g.rows)
              return (
                <tr key={g.key} style={{ cursor: 'pointer' }} onClick={() => onOpenReview(a)}>
                  <td>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Unit {String(g.unitId).padStart(2, '0')}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', fontWeight: 600 }}>{unitName(g.unitId)}</div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <span style={{ fontWeight: 700 }}>Level {String(g.level).padStart(2, '0')}</span>
                    <InfoTooltip text={lDef?.topic} align="left" />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{a.score}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{a.correct_count ?? 0}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>{a.wrong_count ?? 0}</td>
                  <td style={{ textAlign: 'right', color: 'var(--gray-400)', fontWeight: 600 }}>{a.skipped_count ?? 0}</td>
                  <td>
                    {cleared.cleared ? (
                      <span className="badge badge-easy">Cleared in Attempt #{cleared.attemptNumber}</span>
                    ) : (
                      <span className={`badge ${trend === 'declining' ? 'badge-hard' : 'badge-medium'}`}>
                        {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Needs work'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {visibleGroups.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No attempts for this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LastAttemptCard({ attempt, onOpen }) {
  const lDef = levelDef(attempt.unit_id, attempt.level)
  const total = totalQuestions(attempt)
  const maxScore = total * 4
  const accuracy = accuracyOf(attempt)
  const when = fmtWhen(attempt.submitted_at)
  const pctCorrect = total > 0 ? ((attempt.correct_count || 0) / total) * 100 : 0
  const pctWrong = total > 0 ? ((attempt.wrong_count || 0) / total) * 100 : 0
  const pctSkip = total > 0 ? ((attempt.skipped_count || 0) / total) * 100 : 0

  return (
    <div className="card perf-clickable-card" onClick={onOpen}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Last Attempt</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Tap to review →</span>
      </div>
      <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              Unit {String(attempt.unit_id).padStart(2, '0')} · Level {String(attempt.level).padStart(2, '0')} · Attempt #{attempt.attempt_number}
            </div>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--gray-800)', marginTop: '0.15rem' }} onClick={e => e.stopPropagation()}>
              Level {attempt.level}
              <InfoTooltip text={lDef?.topic} align="left" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'right' }}>
            {when.day}<br /><span>{when.time}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--gray-800)' }}>
            {attempt.score}<span style={{ fontSize: '1rem', color: 'var(--gray-400)', fontWeight: 600 }}>/{maxScore}</span>
          </div>
          <span className="badge badge-medium">{accuracy.toFixed(0)}% accuracy</span>
        </div>

        <div>
          <div className="perf-breakdown-bar">
            <span style={{ width: `${pctCorrect}%`, background: 'var(--green)' }} />
            <span style={{ width: `${pctWrong}%`, background: 'var(--red)' }} />
            <span style={{ width: `${pctSkip}%`, background: 'var(--gray-300)' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.6rem' }}>
            <span><span className="perf-swatch" style={{ background: 'var(--green)' }} />{attempt.correct_count ?? 0} correct</span>
            <span><span className="perf-swatch" style={{ background: 'var(--red)' }} />{attempt.wrong_count ?? 0} wrong</span>
            <span><span className="perf-swatch" style={{ background: 'var(--gray-300)' }} />{attempt.skipped_count ?? 0} skipped</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', borderTop: '1px dashed var(--gray-200)', paddingTop: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Time taken<div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-800)' }}>{fmtDuration(attempt.time_taken)}</div></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Avg / question<div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-800)' }}>{total > 0 ? (attempt.time_taken / total).toFixed(1) : '0'}s</div></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Questions<div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-800)' }}>{total}</div></div>
        </div>
      </div>
    </div>
  )
}
