import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { NEET_CHEMISTRY_SYLLABUS, UNIT_11_LEVELS } from '../../lib/constants'
import { Lock, ChevronRight, LogOut, History } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUnit11, setShowUnit11] = useState(false)
  const [progress, setProgress] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [questionCounts, setQuestionCounts] = useState({}) // level → count; 9 → total
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
      setLoading(false)

      // Fetch question counts separately — this query needs the RLS policy to allow anon reads.
      // If the query fails (old RLS policy still active), counts stay at their defaults (shown as '…').
      // Fix in Supabase SQL editor:
      //   drop policy if exists "Questions readable by all authenticated" on questions;
      //   create policy "Questions readable by all" on questions for select using (true);
      const { data: qLevels, error: qErr } = await supabase.from('questions').select('level')
      if (!qErr && qLevels) {
        const counts = {}
        for (const row of qLevels) {
          const lv = row.level
          if (lv !== null && lv !== undefined) counts[lv] = (counts[lv] || 0) + 1
        }
        // Level 9 = Complete Chapter Test = sum of all levels 1-8
        counts[9] = Object.entries(counts)
          .filter(([lv]) => Number(lv) >= 1 && Number(lv) <= 8)
          .reduce((sum, [, c]) => sum + c, 0)
        setQuestionCounts(counts)
      }
    }
    load()
  }, [user.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function startTest(levelId) {
    const unlockedLevels = progress?.unlocked_levels || [1]
    if (!unlockedLevels.includes(levelId)) {
      toast.error('Complete previous levels to unlock this one')
      return
    }
    navigate(`/student/test/${levelId}`)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const unlockedLevels = progress?.unlocked_levels || [1]
  const attemptsByLevel = {}
  for (const a of attempts) {
    if (!attemptsByLevel[a.level]) attemptsByLevel[a.level] = []
    attemptsByLevel[a.level].push(a)
  }

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
          <div className="text-muted">NEET 2025 — Unit 11 Active</div>
        </div>

        {showUnit11 ? (
          <>
            <button className="back-btn" onClick={() => setShowUnit11(false)}>
              ← Back to Syllabus
            </button>
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', color: 'var(--gray-700)' }}>
              Unit 11: d and f Block Elements — Levels
            </h3>
            <div className="levels-grid">
              {UNIT_11_LEVELS.map(level => {
                const isUnlocked = unlockedLevels.includes(level.id)
                const lvlAttempts = attemptsByLevel[level.id] || []
                const totalQAttempted = lvlAttempts.reduce((s, a) => s + (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0), 0)

                return (
                  <div
                    key={level.id}
                    className={`level-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                    onClick={() => isUnlocked && startTest(level.id)}
                  >
                    <div className="level-num">Level {level.id}</div>
                    <h4>{level.name}</h4>
                    <div className="level-stats">
                      <div>Total questions: {questionCounts[level.id] ?? '…'}</div>
                      {lvlAttempts.length > 0 && (
                        <>
                          <div style={{ marginTop: '0.25rem' }}>Attempts: <strong>{lvlAttempts.length}</strong></div>
                          <div>Questions done: <strong>{totalQAttempted}</strong></div>
                        </>
                      )}
                    </div>
                    {!isUnlocked && (
                      <div className="lock-icon"><Lock size={18} /></div>
                    )}
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
          </>
        ) : (
          NEET_CHEMISTRY_SYLLABUS.map(section => (
            <div className="syllabus-section" key={section.section}>
              <h3>{section.section}</h3>
              <div className="unit-grid">
                {section.units.map(unit => (
                  <div
                    key={unit.id}
                    className={`unit-card ${unit.active ? 'active' : 'locked'}`}
                    onClick={() => unit.active && setShowUnit11(true)}
                  >
                    <div className="unit-num">{unit.id}</div>
                    <span>{unit.name}</span>
                    {unit.active && <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                    {!unit.active && <Lock size={14} style={{ marginLeft: 'auto', color: 'var(--gray-300)' }} />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

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
                      const lvlInfo = UNIT_11_LEVELS.find(l => l.id === att.level)
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
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{lvlInfo?.name || ''}</div>
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
