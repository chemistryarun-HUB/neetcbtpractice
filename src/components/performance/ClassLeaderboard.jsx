import { useMemo, useState } from 'react'
import { computeStreak, aggregateAccuracy } from '../../lib/performanceMetrics'

const SORT_TABS = [
  { key: 'attempts', label: 'Most Attempts' },
  { key: 'max', label: 'Max Score' },
  { key: 'streak', label: 'Longest Streak' },
  { key: 'accuracy', label: 'Highest Accuracy' },
]

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function classSortKey(cls) {
  const m = (cls || '').match(/\d+/)
  return m ? Number(m[0]) : 999
}

export default function ClassLeaderboard({
  students, attemptsByStudent, selectedClass, onSelectClass,
  selectedStudentId, onSelectStudent, onBack,
}) {
  const [sortMetric, setSortMetric] = useState('attempts')

  const classes = useMemo(() => {
    const set = new Set(students.map(s => s.class).filter(Boolean))
    return [...set].sort((a, b) => classSortKey(a) - classSortKey(b))
  }, [students])

  const rows = useMemo(() => {
    const filtered = selectedClass && selectedClass !== 'all' ? students.filter(s => s.class === selectedClass) : students
    return filtered.map(s => {
      const attempts = attemptsByStudent[s.id] || []
      const maxScore = attempts.length ? Math.max(...attempts.map(a => a.score ?? 0)) : 0
      return {
        student: s,
        attempts: attempts.length,
        maxScore,
        streak: computeStreak(attempts),
        accuracy: aggregateAccuracy(attempts),
      }
    })
  }, [students, attemptsByStudent, selectedClass])

  const sorted = useMemo(() => {
    const key = sortMetric === 'attempts' ? 'attempts' : sortMetric === 'max' ? 'maxScore' : sortMetric === 'streak' ? 'streak' : 'accuracy'
    return [...rows].sort((a, b) => b[key] - a[key])
  }, [rows, sortMetric])

  const activeClass = selectedClass && selectedClass !== 'all' ? selectedClass : null

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div className="identity">
          <div className="avatar" style={{ background: 'var(--gray-400)' }}>{activeClass ? initials(activeClass) : 'ALL'}</div>
          <div>
            <h1>{activeClass || 'All Classes'}</h1>
            <div className="meta"><span>{rows.length} student{rows.length !== 1 ? 's' : ''}</span></div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onBack}>← Back to student view</button>
        </div>
      </div>

      <div className="section-head">
        <h2>Class Leaderboard</h2>
        <div className="chips">
          {SORT_TABS.map(t => (
            <button key={t.key} className={`chip ${sortMetric === t.key ? 'active' : ''}`} onClick={() => setSortMetric(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chips" style={{ marginBottom: '1rem' }}>
        <button className={`chip ${!activeClass ? 'active' : ''}`} onClick={() => onSelectClass('all')}>All classes</button>
        {classes.map(cls => (
          <button key={cls} className={`chip ${activeClass === cls ? 'active' : ''}`} onClick={() => onSelectClass(cls)}>{cls}</button>
        ))}
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }}>Rank</th>
              <th>Student</th>
              <th>Class</th>
              <th style={{ textAlign: 'right' }}>Attempts</th>
              <th style={{ textAlign: 'right' }}>Max score</th>
              <th style={{ textAlign: 'right' }}>Streak</th>
              <th style={{ textAlign: 'right' }}>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const rank = i + 1
              const isViewing = row.student.id === selectedStudentId
              const emphKey = sortMetric === 'attempts' ? 'attempts' : sortMetric === 'max' ? 'maxScore' : sortMetric === 'streak' ? 'streak' : 'accuracy'
              return (
                <tr key={row.student.id} style={isViewing ? { background: 'var(--primary-light)' } : undefined}>
                  <td>
                    <span className={`perf-rank-badge ${rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : ''}`}>{rank}</span>
                  </td>
                  <td>
                    <button className="perf-lb-student" onClick={() => onSelectStudent(row.student.id)}>
                      <span className="perf-s-avatar">{initials(row.student.name)}</span>
                      <span>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.student.name}</span>
                        {isViewing && <span className="perf-you-tag">Viewing</span>}
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-400)' }}>{row.student.roll_number}</span>
                      </span>
                    </button>
                  </td>
                  <td><span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>{row.student.class}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: emphKey === 'attempts' ? 700 : 400, color: emphKey === 'attempts' ? 'var(--primary)' : undefined }}>{row.attempts}</td>
                  <td style={{ textAlign: 'right', fontWeight: emphKey === 'maxScore' ? 700 : 400, color: emphKey === 'maxScore' ? 'var(--primary)' : undefined }}>{row.maxScore}</td>
                  <td style={{ textAlign: 'right', fontWeight: emphKey === 'streak' ? 700 : 400, color: emphKey === 'streak' ? 'var(--primary)' : undefined }}>{row.streak}d</td>
                  <td style={{ textAlign: 'right', fontWeight: emphKey === 'accuracy' ? 700 : 400, color: emphKey === 'accuracy' ? 'var(--primary)' : undefined }}>{row.accuracy.toFixed(0)}%</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No students in this class</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
