import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, RotateCcw, X } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { ERROR_TYPES, SKIP_REASONS, groupByChapter, groupLabel } from '../../lib/mistakeCopy'
import { levelBadgeT, levelName, neetT } from '../../lib/neetI18n'

const NOT_MARKED = 'none'
const levelKey = (groupKey, level) => `${groupKey}-${level}`
const itemLevelKey = it => levelKey(it.groupKey, it.level)
const statusOf = it => (it.wrongCount > 0 ? 'wrong' : 'skipped')
const typeOf = it => it.entry?.error_type || NOT_MARKED

function Check({ state, onChange, label }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = state === 'some' }, [state])
  return <input ref={ref} type="checkbox" className="mcp-check" aria-label={label} checked={state === 'all'} onChange={onChange} />
}

// Chooses which pending questions go into a re-attempt: wrong or skipped, Error
// Type, chapter and level, in any mix. Each filter's counts allow for the other
// filters, so a number on screen is always how many questions tapping it gives.
export default function MistakePicker({ items, medium, presetGroup = null, rightToday = 0, onStart, onClose }) {
  useBodyScrollLock()
  const t = neetT(medium)
  const [status, setStatus] = useState('both')
  const [errorType, setErrorType] = useState('all')
  const [excluded, setExcluded] = useState(() => new Set(
    presetGroup == null ? [] : items.filter(it => it.groupKey !== presetGroup).map(itemLevelKey)
  ))
  const [expanded, setExpanded] = useState(() => new Set(presetGroup == null ? [] : [presetGroup]))

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const passStatus = it => status === 'both' || statusOf(it) === status
  const passType = it => errorType === 'all' || typeOf(it) === errorType
  const passLevel = it => !excluded.has(itemLevelKey(it))

  const selected = items.filter(it => passStatus(it) && passType(it) && passLevel(it))

  const forStatus = items.filter(it => passType(it) && passLevel(it))
  const statusCounts = {
    both: forStatus.length,
    wrong: forStatus.filter(it => statusOf(it) === 'wrong').length,
    skipped: forStatus.filter(it => statusOf(it) === 'skipped').length,
  }
  const forType = items.filter(it => passStatus(it) && passLevel(it))
  const typeCounts = {}
  for (const it of forType) typeCounts[typeOf(it)] = (typeCounts[typeOf(it)] || 0) + 1

  // The chapter list keeps a chapter on screen once it has any pending question,
  // so unticking a filter never makes rows jump about; only its count changes.
  const units = useMemo(() => groupByChapter(items), [items])
  const inFilters = it => passStatus(it) && passType(it)
  const multiSubject = new Set(units.map(u => u.subject)).size > 1

  const allLevelKeys = units.flatMap(u => u.levels.map(l => levelKey(u.key, l.level)))
  const stateOf = keys => {
    const off = keys.filter(k => excluded.has(k)).length
    return off === 0 ? 'all' : off === keys.length ? 'none' : 'some'
  }
  function toggleKeys(keys) {
    setExcluded(prev => {
      const next = new Set(prev)
      const allOn = keys.every(k => !next.has(k))
      for (const k of keys) { if (allOn) next.add(k); else next.delete(k) }
      return next
    })
  }
  function toggleExpanded(groupKey) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey)
      return next
    })
  }
  const statusOptions = [['both', t.mcBoth], ['wrong', t.mcFilterWrong], ['skipped', t.mcFilterSkipped]]
  const typeOption = type => (
    <option key={type} value={type} disabled={!typeCounts[type] && type !== errorType}>{t.mcErrorTypes[type]} ({typeCounts[type] || 0})</option>
  )

  let lastSubject = null
  return (
    <div className="mcp-overlay" onClick={onClose}>
      <div className="mcp-sheet" role="dialog" aria-modal="true" aria-label={t.mcPickerTitle} lang={medium} onClick={e => e.stopPropagation()}>
        <div className="mcp-head">
          <h3>{t.mcPickerTitle}</h3>
          <button className="mcp-close" onClick={onClose} aria-label={t.mcClose}><X size={20} /></button>
        </div>

        <div className="mcp-body">
          <section>
            <h4>{t.mcPickerStatus}</h4>
            <div className="mcp-seg" role="radiogroup" aria-label={t.mcPickerStatus}>
              {statusOptions.map(([key, label]) => (
                <button key={key} role="radio" aria-checked={status === key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}>
                  {label}<strong>{statusCounts[key]}</strong>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>{t.mcErrorType}</h4>
            <select className="form-control mcp-select" aria-label={t.mcErrorType} value={errorType} onChange={e => setErrorType(e.target.value)}>
              <option value="all">{t.mcAllTypes} ({forType.length})</option>
              <optgroup label={t.mcGroupWrong}>{ERROR_TYPES.map(typeOption)}</optgroup>
              <optgroup label={t.mcGroupSkipped}>{SKIP_REASONS.map(typeOption)}</optgroup>
              <option value={NOT_MARKED}>{t.mcNotMarked} ({typeCounts[NOT_MARKED] || 0})</option>
            </select>
          </section>

          <section>
            <h4>{t.mcPickerChapters}</h4>
            <div className="mcp-tree">
              <label className="mcp-row mcp-row-all">
                <Check state={stateOf(allLevelKeys)} label={t.mcAllChapters} onChange={() => toggleKeys(allLevelKeys)} />
                <span className="mcp-name">{t.mcAllChapters}</span>
              </label>
              {units.map(unit => {
                const keys = unit.levels.map(l => levelKey(unit.key, l.level))
                const open = expanded.has(unit.key) && unit.levels.length > 1
                const label = groupLabel(unit, medium, t)
                const subjectHead = multiSubject && unit.subject !== lastSubject
                lastSubject = unit.subject
                const unitCount = unit.items.filter(inFilters).length
                return (
                  <div key={unit.key}>
                    {subjectHead && <div className="mcp-subject">{t.subject[unit.subject] || unit.subject}</div>}
                    <div className="mcp-row">
                      <Check state={stateOf(keys)} label={label} onChange={() => toggleKeys(keys)} />
                      <button className="mcp-name mcp-unit" onClick={() => (unit.levels.length > 1 ? toggleExpanded(unit.key) : toggleKeys(keys))}>
                        <span>{label}</span>
                        {unit.levels.length > 1 && <ChevronRight size={15} className={`mcp-chev${open ? ' open' : ''}`} />}
                      </button>
                      <span className="mcp-count">{unitCount}</span>
                    </div>
                    {open && unit.levels.map(level => {
                      const key = levelKey(unit.key, level.level)
                      const name = levelName(unit.unitId, level.level, medium)
                      const badge = levelBadgeT(unit.unitId, level.level, medium)
                      return (
                        <label key={key} className="mcp-row mcp-row-level">
                          <Check state={excluded.has(key) ? 'none' : 'all'} label={badge} onChange={() => toggleKeys([key])} />
                          <span className="mcp-name">{badge}{name ? ` · ${name}` : ''}</span>
                          <span className="mcp-count">{level.items.filter(inFilters).length}</span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="mcp-foot">
          {rightToday > 0 && <div className="mcp-note">{t.mcRightToday(rightToday)}</div>}
          <button className="btn btn-primary mcp-start" disabled={selected.length === 0} onClick={() => onStart(selected)}>
            <RotateCcw size={16} /> {selected.length ? t.mcStart(selected.length) : t.mcNoneSelected}
          </button>
        </div>
      </div>
    </div>
  )
}
