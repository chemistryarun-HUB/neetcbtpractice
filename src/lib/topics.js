// Syllabus lookups shared by every screen that shows or edits a question.
// Topic is derived from (unit, level) via UNIT_LEVELS — the DB `topic` column is
// kept in sync with this on every save, so level is always the single source of
// truth for topic.
import { UNIT_LEVELS, NEET_CHEMISTRY_SYLLABUS } from './constants'

// Unit names must match the `unit` column stored in the DB (partial ilike match
// is used for filtering). Derived from NEET_CHEMISTRY_SYLLABUS (the single
// source of truth for section/unit names) rather than hand-copied — the copy
// this replaced drifted out of sync whenever a unit was added elsewhere.
export const CHEMISTRY_UNITS = NEET_CHEMISTRY_SYLLABUS.flatMap(s => s.units)

// Leading unit number from the free-text `unit` column ("Unit 11 - ...").
export function unitIdOf(unitString) {
  return Number((unitString || '').match(/^Unit\s+(\d+)/i)?.[1]) || null
}

// Short display name of a level, e.g. "Conformational Isomerism".
export function deriveTopic(unitString, level) {
  const unitId = unitIdOf(unitString)
  if (!unitId) return ''
  return (UNIT_LEVELS[unitId] || []).find(l => l.id === Number(level))?.name || ''
}

// Full syllabus text for a level (as opposed to deriveTopic's short display
// name) — shown in the "i" tooltips.
export function deriveFullTopic(unitString, level) {
  const unitId = unitIdOf(unitString)
  if (!unitId) return ''
  return (UNIT_LEVELS[unitId] || []).find(l => l.id === Number(level))?.topic || ''
}
