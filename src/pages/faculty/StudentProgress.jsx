import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { UNIT_11_LEVELS } from '../../lib/constants'
import { ArrowLeft } from 'lucide-react'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/profile', label: 'Profile' },
]

export default function StudentProgress() {
  const { studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [progress, setProgress] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: p }, { data: a }] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        supabase.from('student_progress').select('*').eq('student_id', studentId).single(),
        supabase.from('test_attempts').select('*').eq('student_id', studentId).order('started_at', { ascending: false }),
      ])
      setStudent(s)
      setProgress(p)
      setAttempts(a || [])
      setLoading(false)
    }
    load()
  }, [studentId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!student) return <div className="loading-screen">Student not found</div>

  const levelMap = {}
  for (const a of attempts) {
    if (!levelMap[a.level]) levelMap[a.level] = []
    levelMap[a.level].push(a)
  }

  const totalAttempted = attempts.reduce((s, a) => s + (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0), 0)

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <Link to="/faculty/students" className="back-btn">
          <ArrowLeft size={16} /> Back to Students
        </Link>

        <div className="page-header">
          <h2>{student.name}</h2>
          <span className="text-muted">Roll: {student.roll_number}</span>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{(progress?.unlocked_levels || [1]).length}</div>
            <div className="stat-label">Levels Unlocked</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{attempts.length}</div>
            <div className="stat-label">Total Attempts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalAttempted}</div>
            <div className="stat-label">Questions Attempted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{student.class || '-'}</div>
            <div className="stat-label">Class</div>
          </div>
        </div>

        <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-700)' }}>Level-wise Performance</h3>
        <div className="levels-grid">
          {UNIT_11_LEVELS.map(level => {
            const lvlAttempts = levelMap[level.id] || []
            const unlocked = (progress?.unlocked_levels || [1]).includes(level.id)
            const best = lvlAttempts.reduce((b, a) => (a.score || 0) > (b.score || 0) ? a : b, {})
            return (
              <div key={level.id} className={`level-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="level-num">Level {level.id}</div>
                <h4>{level.name}</h4>
                <div className="level-stats">
                  <div>Attempts: <strong>{lvlAttempts.length}</strong></div>
                  {lvlAttempts.length > 0 && (
                    <div>Best score: <strong>{best.score ?? '-'}</strong> / {(best.correct_count || 0) * 4 - (best.wrong_count || 0)}</div>
                  )}
                  {lvlAttempts.length > 0 && (
                    <div>Correct / Wrong / Skip: <strong>{lvlAttempts[0]?.correct_count}</strong> / {lvlAttempts[0]?.wrong_count} / {lvlAttempts[0]?.skipped_count}</div>
                  )}
                </div>
                {!unlocked && <div className="lock-icon">🔒</div>}
              </div>
            )
          })}
        </div>

        {attempts.length > 0 && (
          <>
            <h3 style={{ fontWeight: 700, margin: '2rem 0 1rem', color: 'var(--gray-700)' }}>All Attempts</h3>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Attempt #</th>
                      <th>Score</th>
                      <th>Correct</th>
                      <th>Wrong</th>
                      <th>Skipped</th>
                      <th>Time</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(a => (
                      <tr key={a.id}>
                        <td>Level {a.level}</td>
                        <td>#{a.attempt_number}</td>
                        <td><strong>{a.score ?? '-'}</strong></td>
                        <td style={{ color: 'var(--green)' }}>{a.correct_count}</td>
                        <td style={{ color: 'var(--red)' }}>{a.wrong_count}</td>
                        <td style={{ color: 'var(--yellow)' }}>{a.skipped_count}</td>
                        <td>{a.time_taken ? `${Math.floor(a.time_taken / 60)}m ${a.time_taken % 60}s` : '-'}</td>
                        <td>{new Date(a.started_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
