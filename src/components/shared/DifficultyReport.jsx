import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { NEET_CHEMISTRY_SYLLABUS, UNIT_LEVELS, levelBadge } from '../../lib/constants'

const DIFFS = ['Easy', 'Medium', 'Hard']
// Same palette as the .badge-easy/medium/hard classes elsewhere in the app —
// reused here as literal hex (not the badge class) because these also drive
// the stacked-bar fill, which needs a plain color, not a pill background.
const DIFF_COLOR = { Easy: '#16a34a', Medium: '#f59e0b', Hard: '#dc2626', Unset: 'var(--gray-300)' }
const DIFF_TEXT = { Easy: '#15803d', Medium: '#b45309', Hard: '#b91c1c', Unset: 'var(--gray-500)' }

function emptyCounts() {
  return { total: 0, Easy: 0, Medium: 0, Hard: 0, Unset: 0 }
}
function add(counts, diff) {
  counts.total++
  counts[diff]++
}

// A thin stacked bar showing the Easy/Medium/Hard split of one row's `counts`.
// Reuses the same 10px-pill-of-segments look as .perf-breakdown-bar on the
// Performance page — same visual language, different metric.
function DiffBar({ counts, style }) {
  if (counts.total === 0) return <span className="perf-breakdown-bar" style={{ ...style, background: 'var(--gray-100)' }} />
  return (
    <span className="perf-breakdown-bar" style={style}>
      {[...DIFFS, 'Unset'].map(d => counts[d] > 0 && (
        <span key={d} style={{ width: `${(counts[d] / counts.total) * 100}%`, background: DIFF_COLOR[d] }} />
      ))}
    </span>
  )
}

// One count, colored by difficulty when non-zero and greyed out at zero —
// zero is exactly the fact an admin auditing coverage is scanning for, so it
// stays a real "0" rather than a dash, just visually quiet.
function DiffCell({ n, diff }) {
  return (
    <span style={{ fontWeight: n > 0 ? 700 : 400, color: n > 0 ? DIFF_TEXT[diff] : 'var(--gray-300)' }}>
      {n}
    </span>
  )
}

/**
 * Unit-wise, level-wise breakdown of how many Easy / Medium / Hard questions
 * are in the bank — a coverage map, not a question list. Built for one
 * question: "where are we thin on Hard questions?" (or Easy, or a whole
 * level), which the Question List's per-level counts can't answer without
 * opening every level one at a time.
 *
 * Scoped to is_active questions, matching the "Active Qs" default filter
 * elsewhere on this page — in-service inventory, published or still awaiting
 * review, not retired rows.
 */
export default function DifficultyReport() {
  const [rows, setRows] = useState(null) // null = loading
  const [expanded, setExpanded] = useState(() => new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const all = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('questions')
          .select('unit, level, difficulty_level')
          .eq('is_active', true)
          .range(from, from + 999)
        if (error) break
        all.push(...(data || []))
        if (!data || data.length < 1000) break
      }
      if (!cancelled) setRows(all)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // unitId -> { counts, levels: { levelId -> counts } }
  const byUnit = useMemo(() => {
    if (!rows) return null
    const map = {}
    for (const r of rows) {
      const uid = Number((r.unit || '').match(/^Unit\s+(\d+)/i)?.[1]) || null
      if (!uid) continue
      const diff = DIFFS.includes(r.difficulty_level) ? r.difficulty_level : 'Unset'
      const u = (map[uid] ||= { counts: emptyCounts(), levels: {} })
      add(u.counts, diff)
      const l = (u.levels[r.level] ||= emptyCounts())
      add(l, diff)
    }
    return map
  }, [rows])

  const grand = useMemo(() => {
    const g = emptyCounts()
    if (byUnit) for (const u of Object.values(byUnit)) {
      g.total += u.counts.total
      for (const d of DIFFS) g[d] += u.counts[d]
      g.Unset += u.counts.Unset
    }
    return g
  }, [byUnit])

  const q = search.trim().toLowerCase()
  const sections = NEET_CHEMISTRY_SYLLABUS.map(sec => ({
    ...sec,
    units: sec.units.filter(u => !q || u.name.toLowerCase().includes(q) || `unit ${u.id}` === q || String(u.id) === q),
  })).filter(sec => sec.units.length > 0)

  function toggle(uid) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }
  const allShownIds = sections.flatMap(s => s.units.map(u => u.id))
  const allExpanded = allShownIds.length > 0 && allShownIds.every(id => expanded.has(id))

  if (rows === null) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading question counts…</div>
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Layers size={17} style={{ color: 'var(--primary)' }} />
        Difficulty Coverage
        <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>— active questions, every unit and level</span>
      </div>

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Bank-wide totals — the headline numbers before any drill-down. */}
        <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-700)' }}>{grand.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>active questions</div>
          </div>
          {DIFFS.map(d => (
            <div key={d}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: DIFF_TEXT[d] }}>
                {grand[d]} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-400)' }}>
                  {grand.total > 0 ? `· ${Math.round((grand[d] / grand.total) * 100)}%` : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{d}</div>
            </div>
          ))}
          {grand.Unset > 0 && (
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: DIFF_TEXT.Unset }}>{grand.Unset}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>no difficulty set</div>
            </div>
          )}
        </div>
        <DiffBar counts={grand} style={{ height: 8, marginBottom: '1rem' }} />

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <input
            className="form-control"
            style={{ maxWidth: 260 }}
            placeholder="Search unit name or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}
            onClick={() => setExpanded(allExpanded ? new Set() : new Set(allShownIds))}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
          <span style={{ display: 'flex', gap: '0.9rem', marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            {DIFFS.map(d => (
              <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: DIFF_COLOR[d], display: 'inline-block' }} />
                {d}
              </span>
            ))}
          </span>
        </div>

        {/* Unit accordion, grouped by syllabus section. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sections.map(sec => (
            <div key={sec.section}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--gray-400)', padding: '0.4rem 0.1rem' }}>
                {sec.section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {sec.units.map(u => {
                  const data = byUnit[u.id]
                  const counts = data?.counts || emptyCounts()
                  const isOpen = expanded.has(u.id)
                  const levelDefs = UNIT_LEVELS[u.id] || []
                  return (
                    <div key={u.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                      <button
                        onClick={() => toggle(u.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.55rem 0.7rem', background: isOpen ? 'var(--gray-50)' : '#fff',
                          border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit',
                        }}
                      >
                        {isOpen ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />}
                        <span style={{ flexShrink: 0, minWidth: 44, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>U{u.id}</span>
                        <span style={{ flex: '1 1 200px', minWidth: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </span>
                        <DiffBar counts={counts} style={{ flex: '1 1 120px', maxWidth: 180 }} />
                        {counts.total === 0 ? (
                          <span style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--gray-300)' }}>no questions</span>
                        ) : (
                          <span style={{ flexShrink: 0, display: 'flex', gap: '0.6rem', fontSize: '0.75rem' }}>
                            {DIFFS.map(d => <DiffCell key={d} n={counts[d]} diff={d} />)}
                            <span style={{ color: 'var(--gray-400)' }}>/ {counts.total}</span>
                          </span>
                        )}
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--gray-200)' }}>
                          <table style={{ width: '100%', fontSize: '0.8125rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--gray-50)' }}>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.7rem', fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Level</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 700, color: DIFF_TEXT.Easy, fontSize: '0.7rem', textTransform: 'uppercase' }}>Easy</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 700, color: DIFF_TEXT.Medium, fontSize: '0.7rem', textTransform: 'uppercase' }}>Medium</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 700, color: DIFF_TEXT.Hard, fontSize: '0.7rem', textTransform: 'uppercase' }}>Hard</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Total</th>
                                <th style={{ padding: '0.4rem 0.7rem 0.4rem 0', width: '30%' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {levelDefs.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '0.6rem 0.7rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>No levels defined for this unit yet.</td></tr>
                              ) : levelDefs.map(l => {
                                const lc = data?.levels[l.id] || emptyCounts()
                                return (
                                  <tr key={l.id} style={{ borderTop: '1px solid var(--gray-100)' }}>
                                    <td style={{ padding: '0.4rem 0.7rem' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{levelBadge(u.id, l.id)}</span>
                                      <span style={{ color: 'var(--gray-400)', marginLeft: '0.4rem' }}>{l.name}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}><DiffCell n={lc.Easy} diff="Easy" /></td>
                                    <td style={{ textAlign: 'center' }}><DiffCell n={lc.Medium} diff="Medium" /></td>
                                    <td style={{ textAlign: 'center' }}><DiffCell n={lc.Hard} diff="Hard" /></td>
                                    <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>{lc.total}</td>
                                    <td style={{ padding: '0.4rem 0.7rem 0.4rem 0' }}><DiffBar counts={lc} /></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="empty-state">No unit matches "{search}"</div>
          )}
        </div>
      </div>
    </div>
  )
}
