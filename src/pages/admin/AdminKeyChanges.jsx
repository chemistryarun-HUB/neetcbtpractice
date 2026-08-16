import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { AlertTriangle, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import { buildRegradePlan, applyRegradePlan, planNetMarks } from '../../lib/regrade'
import { analyseAnswerKeys, ITEM_ANALYSIS_RULES } from '../../lib/itemAnalysis'
import { levelBadge } from '../../lib/constants'
import { unitIdOf } from '../../lib/topics'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
]

const QUESTION_COLUMNS = 'id, qid, question, unit, level, option1, option2, option3, option4, correct_option, is_active'
const ATTEMPT_COLUMNS = 'id, student_id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, question_ids, answers'

async function pageAll(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
      {label}
      <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.1rem', color: tone || 'var(--gray-800)' }}>{value}</div>
    </div>
  )
}

export default function AdminKeyChanges() {
  const [tab, setTab] = useState('changes')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [changes, setChanges] = useState([])
  const [attempts, setAttempts] = useState([])
  const [questions, setQuestions] = useState([])
  const [progressByStudent, setProgressByStudent] = useState({})
  const [nameOf, setNameOf] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [applyingId, setApplyingId] = useState(null)

  const questionsById = useMemo(() => Object.fromEntries(questions.map(q => [q.id, q])), [questions])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [chg, qs, ats, progs, studs] = await Promise.all([
        pageAll(() => supabase.from('answer_key_changes').select('*').order('changed_at', { ascending: false })),
        pageAll(() => supabase.from('questions').select(QUESTION_COLUMNS)),
        pageAll(() => supabase.from('test_attempts').select(ATTEMPT_COLUMNS).eq('submitted', true)),
        pageAll(() => supabase.from('student_progress').select('student_id, unlocked_levels_by_unit')),
        pageAll(() => supabase.from('students').select('id, name, roll_number')),
      ])
      setChanges(chg)
      setQuestions(qs)
      setAttempts(ats)
      setProgressByStudent(Object.fromEntries(progs.map(p => [p.student_id, p])))
      setNameOf(Object.fromEntries(studs.map(s => [s.id, `${s.name} (${s.roll_number})`])))
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const pending = changes.filter(c => c.status === 'pending')
  const resolved = changes.filter(c => c.status !== 'pending').slice(0, 30)

  // Impact per pending change. Recomputed from live state, never cached into the
  // row — applying one change can zero out another's impact when they share an
  // attempt, and a stale cached number would quietly misreport that.
  const impacts = useMemo(() => {
    if (loading || !attempts.length) return {}
    const out = {}
    for (const c of pending) {
      out[c.id] = buildRegradePlan({
        attempts, questionsById, progressByStudent, onlyQuestionIds: [c.question_id],
      })
    }
    return out
  }, [pending, attempts, questionsById, progressByStudent, loading])

  // A correction to a question nobody has answered yet needs no decision, and a
  // bulk Excel re-upload can produce hundreds of those at once. Resolve them
  // silently so the queue only ever shows changes that touch real students.
  useEffect(() => {
    if (loading || !pending.length || !attempts.length) return
    const noop = pending.filter(c => impacts[c.id] && impacts[c.id].attemptPatches.length === 0)
    if (!noop.length) return
    let cancelled = false
    ;(async () => {
      for (const c of noop) {
        await supabase.from('answer_key_changes')
          .update({ status: 'dismissed', applied_at: new Date().toISOString(), note: 'No submitted attempt had answered this question' })
          .eq('id', c.id)
      }
      if (cancelled) return
      setChanges(prev => prev.map(c =>
        noop.some(n => n.id === c.id)
          ? { ...c, status: 'dismissed', note: 'No submitted attempt had answered this question' }
          : c))
    })()
    return () => { cancelled = true }
  }, [impacts, loading])

  async function applyOne(change) {
    const plan = impacts[change.id]
    if (!plan || !plan.attemptPatches.length) return
    setApplyingId(change.id)
    try {
      const res = await applyRegradePlan(supabase, plan, {
        attempts,
        note: `Answer key for ${change.qid} corrected (${change.old_correct_option ?? '—'} → ${change.new_correct_option})`,
      })
      await supabase.from('answer_key_changes')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          note: `${res.attemptsWritten} attempt(s) re-graded, ${res.unlocksWritten} unlock(s) granted`,
        })
        .eq('id', change.id)
      toast.success(`${res.attemptsWritten} attempt(s) re-graded · ${res.unlocksWritten} unlock(s) granted`, { duration: 6000 })
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setApplyingId(null)
    }
  }

  const suspects = useMemo(() => {
    if (loading || !attempts.length) return []
    return analyseAnswerKeys({ attempts, questions: questions.filter(q => q.is_active !== false) })
  }, [attempts, questions, loading])

  if (loading) return <div className="dashboard"><Topbar links={NAV} /><div style={{ padding: '3rem', textAlign: 'center' }}>Loading…</div></div>

  if (loadError) {
    return (
      <div className="dashboard">
        <Topbar links={NAV} />
        <div className="page-content">
          <div className="empty-state" style={{ color: '#b91c1c' }}>
            {loadError.includes('answer_key_changes')
              ? <>The <code>answer_key_changes</code> table doesn’t exist yet — run <code>migration_answer_key_changes.sql</code> in the Supabase SQL editor first.</>
              : loadError}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Answer Keys</h2>
          <button className="btn btn-outline btn-sm" onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'changes' ? 'active' : ''}`} onClick={() => setTab('changes')}>
            Pending Re-grades{pending.length ? ` (${pending.length})` : ''}
          </button>
          <button className={`tab-btn ${tab === 'suspect' ? 'active' : ''}`} onClick={() => setTab('suspect')}>
            Suspect Keys{suspects.length ? ` (${suspects.length})` : ''}
          </button>
        </div>

        {/* ── Pending re-grades ── */}
        {tab === 'changes' && (
          <>
            {pending.length === 0 ? (
              <div className="empty-state">
                No answer-key change is waiting on a re-grade. Corrections to questions nobody has answered yet resolve themselves and never appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pending.map(c => {
                  const plan = impacts[c.id]
                  if (!plan) return null
                  const net = planNetMarks(plan)
                  const isOpen = expandedId === c.id
                  return (
                    <div key={c.id} className="card">
                      <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <code style={{ color: 'var(--primary)' }}>{c.qid}</code>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                              key changed {new Date(c.changed_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                            {questionsById[c.question_id]?.question?.slice(0, 110) || '(question not found)'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Stat label="Attempts" value={plan.attemptPatches.length} />
                          <Stat label="Net marks" value={`${net >= 0 ? '+' : ''}${net}`} tone={net >= 0 ? 'var(--green)' : 'var(--red)'} />
                          <Stat label="Unlocks" value={`+${plan.unlocksGained.length}`} tone={plan.unlocksGained.length ? 'var(--green)' : undefined} />
                          <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Details
                          </button>
                          <button className="btn btn-primary btn-sm" disabled={applyingId === c.id} onClick={() => applyOne(c)}>
                            {applyingId === c.id ? 'Applying…' : 'Apply re-grade'}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Attempt</th>
                                  <th style={{ textAlign: 'right' }}>Score</th>
                                  <th style={{ textAlign: 'right' }}>Change</th>
                                </tr>
                              </thead>
                              <tbody>
                                {plan.attemptPatches.map(p => {
                                  const a = attempts.find(x => x.id === p.id)
                                  const d = p.patch.score - p.before.score
                                  return (
                                    <tr key={p.id}>
                                      <td>{nameOf[a?.student_id] || '—'}</td>
                                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Unit {a?.unit_id ?? '—'} · L{a?.level} · #{a?.attempt_number}</td>
                                      <td style={{ textAlign: 'right' }}>{p.before.score} → <strong>{p.patch.score}</strong></td>
                                      <td style={{ textAlign: 'right', fontWeight: 700, color: d >= 0 ? 'var(--green)' : 'var(--red)' }}>{d >= 0 ? '+' : ''}{d}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                          {plan.unlocksGained.length > 0 && (
                            <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#15803d' }}>
                              <strong>Unlocks granted:</strong>{' '}
                              {plan.unlocksGained.map(u => `${nameOf[u.student_id]} → Unit ${u.unit_id} L${u.next}`).join(' · ')}
                            </div>
                          )}
                          {plan.unlocksLost.length > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '0.5rem 0.65rem' }}>
                              {plan.unlocksLost.length} student(s) would fall below the bar for a level they already hold. That access is <strong>kept</strong> — the key was wrong through no fault of theirs.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {resolved.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.9rem', margin: '2rem 0 0.75rem', color: 'var(--gray-600)' }}>Recently resolved</h3>
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr><th>Q ID</th><th>Change</th><th>When</th><th>Outcome</th></tr>
                    </thead>
                    <tbody>
                      {resolved.map(c => (
                        <tr key={c.id}>
                          <td><code style={{ fontSize: '0.75rem' }}>{c.qid}</code></td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{c.old_correct_option ?? '—'} → {c.new_correct_option}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(c.changed_at).toLocaleDateString('en-IN')}</td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            <span className={`badge ${c.status === 'applied' ? 'badge-easy' : 'badge-locked'}`}>{c.status}</span>
                            <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem' }}>{c.note}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Suspect keys ── */}
        {tab === 'suspect' && (
          <>
            <div className="card card-body" style={{ marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Flags a question when more students chose some option than chose the keyed one, or when the
              students who chose another option clearly outscore those who chose the key. On a factual
              question that usually means the key is wrong rather than that most of the class is.
              <div style={{ marginTop: '0.4rem', color: 'var(--gray-400)' }}>
                Needs at least {ITEM_ANALYSIS_RULES.MIN_RESPONSES} responses, and a rival option with at least{' '}
                {ITEM_ANALYSIS_RULES.MIN_OPTION_RESPONSES} students behind it.
                <strong> Rows marked “probably just hard” have evidence pointing the other way</strong> — the
                students who picked the key beat the field, which is what a difficult but correctly-keyed
                question looks like. Read the question before changing anything; this ranks candidates, it doesn’t decide.
              </div>
            </div>

            {suspects.length === 0 ? (
              <div className="empty-state">No active question currently looks mis-keyed.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {suspects.map(s => (
                  <div key={s.question_id} className="card card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <AlertTriangle size={15} style={{ color: '#d97706' }} />
                      <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{s.qid}</code>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{s.unit} · {levelBadge(unitIdOf(s.unit), s.level)} · {s.responses} responses</span>
                      {s.nobodyPickedKeyed && <span className="badge badge-hard">nobody chose the keyed answer</span>}
                      {s.keyedOutperforms && (
                        <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>
                          probably just hard
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: '0.4rem' }}>
                      {s.reasons.join(' · ')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.6rem', whiteSpace: 'pre-wrap' }}>{s.question}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                      <div style={{ padding: '0.5rem 0.7rem', borderRadius: 6, background: '#f0fdf4', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#15803d' }}>Currently keyed — {s.keyed.letter}</div>
                        <div style={{ fontSize: '0.8125rem', margin: '0.15rem 0' }}>{s.keyed.text}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                          {s.keyed.count} chose it · they average {s.keyed.meanPct.toFixed(0)}% overall
                        </div>
                      </div>
                      {s.rival && (
                        <div style={{ padding: '0.5rem 0.7rem', borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#92400e' }}>
                            Stronger students chose — {s.rival.letter}
                          </div>
                          <div style={{ fontSize: '0.8125rem', margin: '0.15rem 0' }}>{s.rival.text}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                            {s.rival.count} chose it · they average {s.rival.meanPct.toFixed(0)}% overall
                          </div>
                        </div>
                      )}
                    </div>
                    {s.keyedOutperforms && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--gray-500)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 6, padding: '0.45rem 0.6rem' }}>
                        Evidence the other way: students who picked the keyed answer beat the rest of the
                        field by {s.discrimination.toFixed(0)} points. That’s the signature of a hard-but-correct
                        question, so verify before changing this key.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
