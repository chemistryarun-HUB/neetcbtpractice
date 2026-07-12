import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// Sorts by the leading number in the class name (Class 11, Class 12, Class 13 (Repeater), ...)
function classSortKey(cls) {
  const m = (cls || '').match(/\d+/)
  return m ? Number(m[0]) : 999
}

export default function StudentSidebar({
  students, selectedStudentId, onSelectStudent,
  view, selectedClass, onSelectClass,
  sidebarOpen, onCloseSidebar,
}) {
  const [search, setSearch] = useState('')
  const [manualExpanded, setManualExpanded] = useState(() => new Set())

  const classes = useMemo(() => {
    const set = new Set(students.map(s => s.class).filter(Boolean))
    return [...set].sort((a, b) => classSortKey(a) - classSortKey(b))
  }, [students])

  const byClass = useMemo(() => {
    const map = {}
    for (const cls of classes) {
      map[cls] = students.filter(s => s.class === cls).sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [students, classes])

  const q = search.trim().toLowerCase()
  const matchesSearch = (s) => !q || s.name.toLowerCase().includes(q)

  function classHasMatch(cls) {
    return byClass[cls].some(matchesSearch)
  }

  function isExpanded(cls) {
    return q ? classHasMatch(cls) : manualExpanded.has(cls)
  }

  function toggleExpanded(cls) {
    setManualExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cls)) next.delete(cls)
      else next.add(cls)
      return next
    })
  }

  function handleClassClick(cls) {
    setManualExpanded(prev => new Set(prev).add(cls))
    onSelectClass(cls)
  }

  const noMatches = q && classes.every(cls => !classHasMatch(cls))

  return (
    <>
      <aside className={`perf-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="perf-sidebar-inner">
          <div className="perf-sidebar-head">Classes</div>
          <div style={{ padding: '0 0.875rem 0.75rem' }}>
            <input
              className="form-control"
              style={{ fontSize: '0.8125rem' }}
              placeholder="Search students by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {classes.map(cls => {
            const visible = !q || classHasMatch(cls)
            if (!visible) return null
            const expanded = isExpanded(cls)
            const isLbActive = view === 'leaderboard' && selectedClass === cls
            const list = byClass[cls].filter(matchesSearch)
            return (
              <div key={cls} className="perf-class-group" style={{ borderTop: '1px solid var(--gray-100)' }}>
                <div className="perf-class-row">
                  <button
                    className="perf-chev-btn"
                    onClick={() => toggleExpanded(cls)}
                    aria-label={expanded ? `Collapse ${cls}` : `Expand ${cls}`}
                  >
                    <ChevronRight size={15} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                  </button>
                  <button
                    className={`perf-class-label ${isLbActive ? 'active' : ''}`}
                    onClick={() => handleClassClick(cls)}
                  >
                    <span className="perf-class-name">{cls}</span>
                    <span className="perf-class-count">{byClass[cls].length}</span>
                  </button>
                </div>

                {expanded && (
                  <div className="perf-student-list">
                    {list.map(s => (
                      <button
                        key={s.id}
                        className={`perf-student-item ${view === 'profile' && selectedStudentId === s.id ? 'active' : ''}`}
                        onClick={() => onSelectStudent(s.id)}
                      >
                        <span className="perf-s-avatar">{initials(s.name)}</span>
                        <span className="perf-s-info">
                          <span className="perf-s-name">{s.name}</span>
                          <span className="perf-s-roll">•••• {String(s.roll_number || '').slice(-4)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {noMatches && (
            <div style={{ padding: '0.5rem 1rem 1rem', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
              No students match "{search}"
            </div>
          )}
        </div>
      </aside>
      <div className={`perf-scrim ${sidebarOpen ? 'open' : ''}`} onClick={onCloseSidebar} />
    </>
  )
}
