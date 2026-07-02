import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { NEET_CHEMISTRY_SYLLABUS, UNIT_LEVELS } from '../../lib/constants'
import { Lock, ChevronRight, LogOut, History, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [progress, setProgress] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  // unitId → array of { level, topic, count } sorted by level
  const [unitLevels, setUnitLevels] = useState({})
  // Set of unit ids that have at least one question
  const [activeUnitIds, setActiveUnitIds] = useState(new Set())

  // Currently selected unit (for drill-down view)
  const [selectedUnit, setSelectedUnit] = useState(null)

  useEffect(() => {
    async function load() {
      // 1. Student progress + attempts
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
        supabase.from('test_attempts').select('*').eq('student_id', user.id).eq('submitted', true),
      ])
      if (!p) {
        await supabase.from('student_progress').insert({ student_id: user.id, unlocked_levels: [1] })
        setProgress({ unlocked_levels: [1], total_questions_attempted: 0 })
      } else {
        setProgress(p)
      }
      setAttempts(a || [])

      // 2. All active questions: unit, level, topic — to know which units/levels exist
      const { data: qRows, error: qErr } = await supabase
        .from('questions')
        .select('unit, level, topic')
        .eq('is_active', true)

      if (!qErr && qRows) {
        // Build map: unitId → Map<level, count>
        // The `unit` column is stored as "Unit 11 - d- and f-Block Elements"
        // Extract the unit number from the prefix "Unit N -"
        const byUnitId = {}
        for (const row of qRows) {
          const match = (row.unit || '').match(/^Unit\s+(\d+)\s*-/i)
          if (!match) continue
          const uid = Number(match[1])
          if (!byUnitId[uid]) byUnitId[uid] = {}
          const lv = row.level ?? 1
          if (!byUnitId[uid][lv]) byUnitId[uid][lv] = { topic: row.topic || `Level ${lv}`, count: 0 }
          byUnitId[uid][lv].count++
        }

        const idToLevels = {}
        const activeIds = new Set()

        for (const [uid, levels] of Object.entries(byUnitId)) {
          const unitId = Number(uid)
          if (Object.keys(levels).length > 0) {
            activeIds.add(unitId)
            idToLevels[unitId] = Object.entries(levels)
              .map(([lv, { topic, count }]) => ({ level: Number(lv), topic, count }))
              .sort((a, b) => a.level - b.level)
          }
        }

        setActiveUnitIds(activeIds)
        setUnitLevels(idToLevels)
      }

      setLoading(false)
    }
    load()
  }, [user.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function startTest(unitId, levelId) {
    const levelDefs = UNIT_LEVELS[unitId] || []
    const lastLevelId = levelDefs.length > 0 ? levelDefs[levelDefs.length - 1].id : null
    const alwaysUnlocked = levelId === 1 || levelId === lastLevelId
    const unlockedLevels = progress?.unlocked_levels || [1]
    if (!alwaysUnlocked && !unlockedLevels.includes(levelId)) {
      toast.error('Complete previous levels to unlock this one')
      return
    }
    navigate(`/student/test/${unitId}/${levelId}`)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const unlockedLevels = progress?.unlocked_levels || [1]
  const attemptsByLevel = {}
  for (const a of attempts) {
    if (!attemptsByLevel[a.level]) attemptsByLevel[a.level] = []
    attemptsByLevel[a.level].push(a)
  }

  // ── Level drill-down view ──
  if (selectedUnit) {
    const levelDefs = UNIT_LEVELS[selectedUnit.id] || []
    const dbLevels = unitLevels[selectedUnit.id] || []   // question counts from DB
    const countByLevel = Object.fromEntries(dbLevels.map(l => [l.level, l.count]))
    const lastLevelId = levelDefs.length > 0 ? levelDefs[levelDefs.length - 1].id : null
    // CCT total = sum of all non-CCT levels
    const cctTotal = dbLevels.filter(l => l.level !== lastLevelId).reduce((s, l) => s + l.count, 0)

    return (
      <div className="dashboard">
        <header className="topbar">
          <div className="topbar-brand">NEETCBT</div>
          <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
              {user.name} ({user.roll_number})
            </span>
            <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <div className="page-content">
          <button className="back-btn" onClick={() => setSelectedUnit(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
            <ArrowLeft size={15} /> Back to Syllabus
          </button>
          <h3 style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--gray-700)' }}>
            Unit {selectedUnit.id}: {selectedUnit.name}
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {levelDefs.length} level{levelDefs.length !== 1 ? 's' : ''} · Level 1 and Level {lastLevelId} always unlocked
          </p>
          <div className="levels-grid">
            {levelDefs.map(({ id: levelId, name: levelName }) => {
              // Level 1 and last level are always unlocked
              const alwaysUnlocked = levelId === 1 || levelId === lastLevelId
              const isUnlocked = alwaysUnlocked || unlockedLevels.includes(levelId)
              const lvlAttempts = attemptsByLevel[levelId] || []
              const totalQAttempted = lvlAttempts.reduce((s, a) => s + (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0), 0)
              const qCount = levelId === lastLevelId ? cctTotal : (countByLevel[levelId] ?? 0)
              return (
                <div
                  key={levelId}
                  className={`level-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => isUnlocked && startTest(selectedUnit.id, levelId)}
                >
                  <div className="level-num" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Level {levelId}
                    <span title={levelName || 'No topic mapped to this level'}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--gray-300)', color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>
                      i
                    </span>
                  </div>
                  <h4>{levelName}</h4>
                  <div className="level-stats">
                    <div>Total questions: {qCount > 0 ? qCount : '—'}</div>
                    {lvlAttempts.length > 0 && (
                      <>
                        <div style={{ marginTop: '0.25rem' }}>Attempts: <strong>{lvlAttempts.length}</strong></div>
                        <div>Questions done: <strong>{totalQAttempted}</strong></div>
                      </>
                    )}
                  </div>
                  {!isUnlocked && <div className="lock-icon"><Lock size={18} /></div>}
                  {isUnlocked && lvlAttempts.length === 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span className="badge badge-green">Start</span>
                    </div>
                  )}
                  {isUnlocked && lvlAttempts.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Continue</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Syllabus view ──
  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            {user.name} ({user.roll_number})
          </span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="page-header">
          <h2>Chemistry Syllabus</h2>
          <div className="text-muted">
            {activeUnitIds.size} unit{activeUnitIds.size !== 1 ? 's' : ''} active
          </div>
        </div>

        {NEET_CHEMISTRY_SYLLABUS.map(section => (
          <div className="syllabus-section" key={section.section}>
            <h3>{section.section}</h3>
            <div className="unit-grid">
              {section.units.map(unit => {
                const isActive = activeUnitIds.has(unit.id)
                return (
                  <div
                    key={unit.id}
                    className={`unit-card ${isActive ? 'active' : 'locked'}`}
                    onClick={() => isActive && setSelectedUnit(unit)}
                  >
                    <div className="unit-num">{unit.id}</div>
                    <span>{unit.name}</span>
                    {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                    {!isActive && <Lock size={14} style={{ marginLeft: 'auto', color: 'var(--gray-300)' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Attempt History */}
        {attempts.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} /> Attempt History
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', color: 'var(--gray-600)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', color: 'var(--gray-600)', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--gray-600)', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>✓</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>✗</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--gray-400)', fontWeight: 600 }}>–</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center', color: 'var(--gray-600)', fontWeight: 600 }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {[...attempts]
                    .sort((a, b) => new Date(b.submitted_at || b.started_at) - new Date(a.submitted_at || a.started_at))
                    .map(att => {
                      // Find level name from UNIT_LEVELS definitions
                      const topicName = Object.values(UNIT_LEVELS)
                        .flat()
                        .find(l => l.id === att.level)?.name || ''
                      const date = new Date(att.submitted_at || att.started_at)
                      const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      const total = (att.correct_count || 0) + (att.wrong_count || 0) + (att.skipped_count || 0)
                      const pct = total > 0 ? Math.round(((att.correct_count || 0) / total) * 100) : 0
                      return (
                        <tr key={att.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--gray-600)' }}>
                            <div>{dateStr}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{timeStr}</div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--gray-700)' }}>
                            <div style={{ fontWeight: 600 }}>Level {att.level}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{topicName}</div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 700, color: att.score >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {att.score}
                            <div style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--gray-400)' }}>{pct}%</div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{att.correct_count || 0}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>{att.wrong_count || 0}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--gray-400)', fontWeight: 600 }}>{att.skipped_count || 0}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <Link to={`/student/result/${att.id}`} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
