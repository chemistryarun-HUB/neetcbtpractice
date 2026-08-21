import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { attemptsInOrder, attemptClearedOwnBar } from '../../lib/performanceMetrics'
import { UNIT_LEVELS, levelBadge } from '../../lib/constants'

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// Sorting nulls: a student who has cleared nothing must not float into the
// middle of the ranking. -1 puts them last on "highest first" and first on
// "lowest first" — which is correct either way, since "nothing cleared" IS
// the bottom of the scale and is exactly who you're looking for when you sort
// ascending.
const NONE = -1

export default function UnitRoster({ students, attemptsByStudent, unitId, showClass, onSelectStudent }) {
  const [activeIdsByLevel, setActiveIdsByLevel] = useState(null) // { [level]: Set<questionId> }
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  const levels = useMemo(() => UNIT_LEVELS[unitId] || [], [unitId])
  const lastLevelId = levels.length > 0 ? levels[levels.length - 1].id : null

  // Only the per-level question totals need fetching, and only for the
  // selected unit — a few hundred rows, cheap enough to refetch on every unit
  // change rather than preloading the whole bank.
  //
  // "Questions seen" deliberately does NOT come from used_questions. That
  // table is written by an upsert keyed on (student, question) after a
  // submit, and on real data it undercounts: one student with a single
  // 25-question attempt has only 17 rows there. Each attempt's own
  // question_ids array is the list actually served, is written when the
  // attempt is created, and is already loaded here — so it's both more
  // accurate and free.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const qRows = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('questions')
          .select('id, level').ilike('unit', `Unit ${unitId} -%`).eq('is_active', true)
          .range(from, from + 999)
        if (error) break
        qRows.push(...(data || []))
        if (!data || data.length < 1000) break
      }
      if (cancelled) return
      const byLvl = {}
      for (const r of qRows) (byLvl[r.level] ||= new Set()).add(r.id)
      setActiveIdsByLevel(byLvl)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unitId])

  // The CCT draws from every level of the unit combined rather than owning a
  // pool of its own, so its pool is the union of the others — matching how
  // StudentDashboard sizes it for students.
  const poolForLevel = useMemo(() => (lvl) => {
    if (!activeIdsByLevel) return null
    if (lvl === lastLevelId) {
      const all = new Set()
      for (const [l, ids] of Object.entries(activeIdsByLevel)) {
        if (Number(l) !== lastLevelId) for (const id of ids) all.add(id)
      }
      return all
    }
    return activeIdsByLevel[lvl] ?? new Set()
  }, [activeIdsByLevel, lastLevelId])

  const rows = useMemo(() => students.map(s => {
    const unitAttempts = (attemptsByStudent[s.id] || []).filter(a => a.unit_id === unitId)

    // Per level: did they clear it, and on which attempt (by submission order,
    // matching the "#N" StudentProfile shows rather than the stored column).
    const clearedAt = {}
    const byLevel = {}
    for (const a of unitAttempts) (byLevel[a.level] ||= []).push(a)
    for (const [lvl, arr] of Object.entries(byLevel)) {
      const ordered = attemptsInOrder(arr)
      const hit = ordered.find(({ attempt }) => attemptClearedOwnBar(attempt))
      if (hit) clearedAt[Number(lvl)] = hit.position
    }

    const clearedLevels = Object.keys(clearedAt).map(Number)
    // CCT is excluded from "highest cleared" on purpose: it's open from day
    // one, so a student can clear it without having cleared anything between.
    // Reporting it as their high-water mark would overstate real progression.
    const ladder = clearedLevels.filter(l => l !== lastLevelId)
    const highest = ladder.length > 0 ? Math.max(...ladder) : null
    const cctCleared = lastLevelId != null && clearedAt[lastLevelId] != null

    // Coverage of the level's CURRENT pool: distinct questions served to this
    // student there (union across their attempts, so a retry serving the same
    // question isn't double-counted), intersected with the questions still
    // active at that level.
    //
    // The intersection is what keeps this readable. Students get served
    // questions that are later deactivated, so a raw served-count runs past
    // the live total — real data here produced "50 / 45", which reads as a
    // bug. Counting only questions still in the pool makes the fraction mean
    // one thing: how much of what's on offer today have they actually seen.
    const focusLevel = highest
    const pool = focusLevel != null ? poolForLevel(focusLevel) : null
    const served = focusLevel != null
      ? new Set((byLevel[focusLevel] || []).flatMap(a => a.question_ids || []))
      : null
    const seen = pool && served ? [...served].filter(id => pool.has(id)).length : null
    const totalInLevel = pool ? pool.size : null

    return {
      student: s,
      attempts: unitAttempts.length,
      clearedCount: ladder.length,
      ladderTotal: Math.max(0, levels.length - (lastLevelId != null ? 1 : 0)),
      highest,
      clearedOn: highest != null ? clearedAt[highest] : null,
      seen,
      totalInLevel,
      cctCleared,
    }
  }), [students, attemptsByStudent, unitId, levels, lastLevelId, poolForLevel])

  const sorted = useMemo(() => {
    const val = r => {
      switch (sort.key) {
        case 'name': return (r.student.name || '').toLowerCase()
        case 'cleared': return r.clearedCount
        case 'highest': return r.highest ?? NONE
        case 'attempt': return r.clearedOn ?? NONE
        case 'seen': return r.seen ?? NONE
        case 'attempts': return r.attempts
        default: return 0
      }
    }
    const out = [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      if (typeof x === 'string') return x.localeCompare(y)
      return x - y
    })
    return sort.dir === 'desc' ? out.reverse() : out
  }, [rows, sort])

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      // Names read naturally A→Z; every numeric column is far more useful
      // opening on "highest first", which is what you actually want to see.
      : { key, dir: key === 'name' ? 'asc' : 'desc' })
  }

  const COLS = [
    { key: 'name', label: 'Student', align: 'left' },
    ...(showClass ? [{ key: null, label: 'Class', align: 'left' }] : []),
    { key: 'cleared', label: 'Levels cleared', align: 'center' },
    { key: 'highest', label: 'Highest cleared', align: 'left' },
    { key: 'attempt', label: 'Cleared on', align: 'center' },
    { key: 'seen', label: 'Qs seen in that level', align: 'center' },
    { key: 'attempts', label: 'Attempts', align: 'center' },
    { key: null, label: 'CCT', align: 'center' },
  ]

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading question counts…</div>
  }

  return (
    <div>
      <div className="table-wrap" style={{ maxHeight: 'max(320px, calc(100vh - 320px))' }}>
        <table>
          <thead>
            <tr>
              {COLS.map(c => {
                const active = sort.key === c.key
                return (
                  <th key={c.label} style={{ textAlign: c.align, whiteSpace: 'nowrap', cursor: c.key ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={c.key ? () => toggleSort(c.key) : undefined}
                    title={c.key ? 'Click to sort' : undefined}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: active ? 'var(--primary)' : undefined }}>
                      {c.label}
                      {c.key && (active
                        ? (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                        : <ChevronDown size={13} style={{ opacity: 0.22 }} />)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.student.id}>
                <td>
                  <button className="perf-lb-student" onClick={() => onSelectStudent(r.student.id)}>
                    <span className="perf-s-avatar">{initials(r.student.name)}</span>
                    <span>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.student.name}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gray-400)' }}>{r.student.roll_number}</span>
                    </span>
                  </button>
                </td>
                {showClass && (
                  <td><span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>{r.student.class || '—'}</span></td>
                )}
                <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8125rem', color: r.clearedCount > 0 ? '#15803d' : 'var(--gray-400)' }}>
                  {r.clearedCount} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>/ {r.ladderTotal}</span>
                </td>
                <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {r.highest != null
                    ? <span style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{levelBadge(unitId, r.highest)}</span>
                    : <span style={{ color: 'var(--gray-400)' }}>{r.attempts > 0 ? 'None yet' : 'Not started'}</span>}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: r.clearedOn != null ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                  {r.clearedOn != null ? `#${r.clearedOn}` : '—'}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {r.seen != null
                    ? <><strong>{r.seen}</strong> <span style={{ color: 'var(--gray-400)' }}>/ {r.totalInLevel}</span></>
                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: r.attempts > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                  {r.attempts || '—'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {r.cctCleared
                    ? <span className="badge badge-easy" style={{ fontSize: '0.65rem' }}>cleared</span>
                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLS.length} className="empty-state">No students in this class</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted" style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem 0' }}>
        Click any column heading to sort (click again to reverse). <strong>Highest cleared</strong> ignores the CCT,
        which is open from day one and so isn't earned progression — it gets its own column. <strong>Cleared on</strong> is
        which attempt at that level finally passed its threshold. <strong>Qs seen</strong> counts distinct questions the
        student has actually been served at that level, out of the questions still active at that level — so it always reads as coverage of the current pool.
      </div>
    </div>
  )
}
