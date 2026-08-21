import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { clearedInfo, unitName } from '../../lib/performanceMetrics'
import { UNIT_LEVELS, levelBadge } from '../../lib/constants'
import UnitRoster from './UnitRoster'

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// Clickable list of the actual students behind a number. The whole point of
// the drill-down is that "14 cleared" is only half an answer — the other half
// is *which* 14, and being one click from their full profile.
function StudentChips({ students, onSelectStudent, emptyLabel }) {
  if (students.length === 0) {
    return <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>{emptyLabel}</div>
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: 168, overflowY: 'auto' }}>
      {students.map(s => (
        <button
          key={s.id}
          onClick={() => onSelectStudent(s.id)}
          title={`${s.name} · ${s.class || '—'} — open profile`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer',
            border: '1px solid var(--gray-200)', background: '#fff', borderRadius: 999,
            padding: '0.15rem 0.55rem 0.15rem 0.15rem', font: 'inherit', fontSize: '0.75rem',
            color: 'var(--gray-700)', maxWidth: 190,
          }}
        >
          <span className="perf-s-avatar" style={{ width: 20, height: 20, borderRadius: '50%', fontSize: '0.55rem' }}>
            {initials(s.name)}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Class → Unit → Level → Student drill-down.
 *
 * Answers the question a funnel of bare counts can't: for THIS unit, how many
 * students have actually cleared each level, how many are stuck having tried
 * it, how many haven't reached it yet, and how many never opened the unit at
 * all — with the names behind every one of those numbers.
 *
 * "Cleared" here means the student genuinely passed a level's unlock
 * threshold on some attempt (clearedInfo, which walks their attempts against
 * the attempt-scaled bar in thresholdPctFor). That's deliberately stricter
 * than "has this level unlocked": Level 1 and the CCT are open to everyone
 * from day one without being earned, so an unlocked-based count reads as a
 * meaningless 100% on exactly those two rows.
 */
export default function UnitDrilldown({
  students, attemptsByStudent, unitId, unitOptions, onSelectUnit, onSelectStudent, showClass,
}) {
  const [expandedLevel, setExpandedLevel] = useState(null)
  const [showNotStarted, setShowNotStarted] = useState(false)
  // 'levels' answers "how far has the cohort got"; 'students' answers "where
  // is each individual student" — same unit, two directions through the same
  // data, so they share one picker rather than becoming separate sections.
  const [mode, setMode] = useState('levels')

  // Attempts this class made in this unit, per student.
  const unitAttemptsByStudent = useMemo(() => {
    const map = {}
    for (const s of students) {
      map[s.id] = (attemptsByStudent[s.id] || []).filter(a => a.unit_id === unitId)
    }
    return map
  }, [students, attemptsByStudent, unitId])

  const startedStudents = useMemo(
    () => students.filter(s => unitAttemptsByStudent[s.id].length > 0),
    [students, unitAttemptsByStudent],
  )
  const notStartedStudents = useMemo(
    () => students.filter(s => unitAttemptsByStudent[s.id].length === 0),
    [students, unitAttemptsByStudent],
  )

  // Prefer the unit's authored level list; fall back to whatever levels the
  // attempts actually reference, so a unit whose levels aren't in UNIT_LEVELS
  // yet still reports rather than rendering blank.
  const levels = useMemo(() => {
    const defined = UNIT_LEVELS[unitId] || []
    if (defined.length > 0) return defined
    const seen = [...new Set(students.flatMap(s => unitAttemptsByStudent[s.id].map(a => a.level)))]
    return seen.sort((a, b) => a - b).map(id => ({ id, name: `Level ${id}` }))
  }, [unitId, students, unitAttemptsByStudent])

  const levelRows = useMemo(() => levels.map(l => {
    const cleared = []
    const tried = []
    const notReached = []
    for (const s of startedStudents) {
      const atLevel = unitAttemptsByStudent[s.id].filter(a => a.level === l.id)
      if (atLevel.length === 0) notReached.push(s)
      else if (clearedInfo(atLevel).cleared) cleared.push(s)
      else tried.push(s)
    }
    return { level: l, cleared, tried, notReached }
  }), [levels, startedStudents, unitAttemptsByStudent])

  const total = students.length

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span>Unit Progress — who has cleared what</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="chips" style={{ marginBottom: 0 }}>
            {[['levels', 'By level'], ['students', 'By student']].map(([k, label]) => (
              <button key={k} className={`chip ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</button>
            ))}
          </div>
          {unitOptions.length > 0 && (
            <select
              className="form-control"
              style={{ width: 'auto', maxWidth: 320, fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              value={unitId ?? ''}
              onChange={e => { setExpandedLevel(null); onSelectUnit(Number(e.target.value)) }}
            >
              {unitOptions.map(uid => <option key={uid} value={uid}>{unitName(uid)}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ padding: '0.875rem 1.25rem' }}>
        {/* Unit-level summary — the "Z students didn't start this unit" answer,
            stated before any per-level detail so it can't be missed. */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{startedStudents.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>started this unit</div>
          </div>
          <div>
            <button
              onClick={() => setShowNotStarted(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
              title="Show which students haven't opened this unit"
            >
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: notStartedStudents.length > 0 ? '#b91c1c' : 'var(--gray-400)' }}>
                {notStartedStudents.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textDecoration: 'underline dotted' }}>
                never started {showNotStarted ? '▾' : '▸'}
              </div>
            </button>
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-700)' }}>{total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>students in scope</div>
          </div>
        </div>

        {showNotStarted && (
          <div style={{ marginBottom: '0.875rem', padding: '0.625rem', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
            <StudentChips
              students={notStartedStudents}
              onSelectStudent={onSelectStudent}
              emptyLabel="Everyone in scope has attempted this unit."
            />
          </div>
        )}

        {mode === 'students' ? (
          // Deliberately not gated on startedStudents: the roster lists every
          // student including the ones who never opened the unit, which is
          // exactly who you're looking for when nobody has started.
          <UnitRoster
            students={students}
            attemptsByStudent={attemptsByStudent}
            unitId={unitId}
            showClass={showClass}
            onSelectStudent={onSelectStudent}
          />
        ) : startedStudents.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
            Nobody in this class has attempted this unit yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {levelRows.map(row => {
              const isOpen = expandedLevel === row.level.id
              // Denominator is students who opened the unit at all — mixing in
              // the never-started crowd would flatten every bar into noise.
              const denom = Math.max(1, startedStudents.length)
              const pct = n => (n / denom) * 100
              return (
                <div key={row.level.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedLevel(isOpen ? null : row.level.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.5rem 0.625rem', background: isOpen ? 'var(--gray-50)' : '#fff',
                      border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit',
                    }}
                  >
                    <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    <span style={{ flexShrink: 0, minWidth: 62, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                      {levelBadge(unitId, row.level.id)}
                    </span>
                    <span style={{ flex: '1 1 140px', minWidth: 0, fontSize: '0.8125rem', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.level.name}
                    </span>
                    <span className="perf-breakdown-bar" style={{ flex: '1 1 120px', maxWidth: 200 }}>
                      <span style={{ width: `${pct(row.cleared.length)}%`, background: 'var(--green, #16a34a)' }} />
                      <span style={{ width: `${pct(row.tried.length)}%`, background: '#f59e0b' }} />
                    </span>
                    <span style={{ flexShrink: 0, fontSize: '0.8125rem', fontWeight: 800, color: '#15803d', minWidth: 28, textAlign: 'right' }}>
                      {row.cleared.length}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: '0.7rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      cleared
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        { label: `Cleared (${row.cleared.length})`, color: '#15803d', list: row.cleared, empty: 'Nobody has cleared this level yet.' },
                        { label: `Attempted, not cleared (${row.tried.length})`, color: '#b45309', list: row.tried, empty: 'Nobody is stuck on this level.' },
                        { label: `Not reached yet (${row.notReached.length})`, color: 'var(--gray-500)', list: row.notReached, empty: 'Everyone who started the unit has attempted this level.' },
                      ].map(group => (
                        <div key={group.label}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: group.color, marginBottom: '0.35rem' }}>
                            {group.label}
                          </div>
                          <StudentChips students={group.list} onSelectStudent={onSelectStudent} emptyLabel={group.empty} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Bars are share of the {startedStudents.length} student{startedStudents.length !== 1 ? 's' : ''} who opened this unit —
              <span style={{ color: '#15803d', fontWeight: 600 }}> green cleared</span>,
              <span style={{ color: '#b45309', fontWeight: 600 }}> amber attempted but not cleared</span>.
              Click any level to see exactly who. "Cleared" means they passed that level's unlock threshold, not just that it's open to them.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
