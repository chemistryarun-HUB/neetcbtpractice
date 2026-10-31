// Subjects and their units. A Biology unit IS an NCERT chapter (Class 11 first,
// then Class 12 continuing the numbering); Physics uses Arun's 32-unit list.
//
// Unit numbers restart at 1 in every subject, so a unit is only meaningful
// together with its subject. Chemistry keeps its own syllabus + levels in
// constants.js; Physics and Biology have units only for now — their levels are
// added to PHYSICS_UNIT_LEVELS / BIOLOGY_UNIT_LEVELS in constants.js as they
// are authored (same shape as UNIT_LEVELS).
import { NEET_CHEMISTRY_SYLLABUS, levelDefsFor, fromCourseUnitId } from './constants'
export { COURSE_OFFSET, courseUnitId, fromCourseUnitId } from './constants'

const u = names => names.map((name, i) => ({ id: i + 1, name }))

// Physics follows Arun's 32-unit list (2026-10-31), grouped Mechanics 1 ...
// Miscellaneous rather than NCERT chapter order. See PHYSICS_SECTIONS below.
export const PHYSICS_UNITS = u([
  // Mechanics 1
  'Mathematics in Physics', 'Units and Dimensions', 'Motion In One Dimension', 'Motion In Two Dimensions',
  'Laws of Motion', 'Work Power Energy', 'Center of Mass Momentum and Collision', 'Rotational Motion',
  'Gravitation',
  // Mechanics 2
  'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Oscillations', 'Waves and Sound',
  // Thermodynamics
  'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory of Gases',
  // Electromagnetism
  'Electrostatics', 'Capacitance', 'Current Electricity', 'Magnetic Properties of Matter',
  'Magnetic Effects of Current', 'Electromagnetic Induction', 'Alternating Current',
  // Optics
  'Ray Optics', 'Wave Optics',
  // Modern Physics
  'Dual Nature of Matter', 'Atomic Physics', 'Nuclear Physics',
  // Miscellaneous Physics
  'Electromagnetic Waves', 'Semiconductors', 'Communication System', 'Experimental Physics',
])

export const BIOLOGY_UNITS = u([
  // Class 11
  'The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom',
  'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Structural Organisation in Animals',
  'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle and Cell Division',
  'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth and Development',
  'Breathing and Exchange of Gases', 'Body Fluids and Circulation', 'Excretory Products and their Elimination',
  'Locomotion and Movement', 'Neural Control and Coordination', 'Chemical Coordination and Integration',
  // Class 12
  'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health',
  'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution',
  'Human Health and Disease', 'Microbes in Human Welfare',
  'Biotechnology: Principles and Processes', 'Biotechnology and its Applications',
  'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation',
])

export const CHEMISTRY_UNITS = NEET_CHEMISTRY_SYLLABUS.flatMap(s => s.units)

// Subjects that can hold questions. Mathematics is listed in the admin tools
// but not active yet.
export const ACTIVE_SUBJECTS = ['Chemistry', 'Physics', 'Biology']
export const ALL_SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Mathematics']
export const isActiveSubject = s => ACTIVE_SUBJECTS.includes(s)

// Question-ID prefix per subject (Chemistry's NCU… is historical).
export const QID_PREFIX = { Chemistry: 'NCU', Physics: 'NPH', Biology: 'NBU' }

export const UNITS_BY_SUBJECT = { Chemistry: CHEMISTRY_UNITS, Physics: PHYSICS_UNITS, Biology: BIOLOGY_UNITS }

export const unitsFor = subject => UNITS_BY_SUBJECT[subject || 'Chemistry'] || []
export const levelsFor = levelDefsFor

// Name of a practice unit id (see courseUnitId): 117 -> "Electrostatics".
export function practiceUnitName(id) {
  const { subject, unit } = fromCourseUnitId(id)
  return unitsFor(subject).find(x => x.id === unit)?.name || `Unit ${unit}`
}
// "Unit 15" for Chemistry, "Physics · Unit 15" otherwise.
export function practiceUnitNo(id) {
  const { subject, unit } = fromCourseUnitId(id)
  return subject === 'Chemistry' ? `Unit ${unit}` : `${subject} · Unit ${unit}`
}
export const unitLabelOf = (subject, unitId) => {
  const unit = unitsFor(subject).find(x => x.id === Number(unitId))
  return unit ? `Unit ${unit.id} - ${unit.name}` : ''
}

// Section grouping for the student syllabus view: Chemistry has its own
// Physical / Inorganic / Organic sections in NEET_CHEMISTRY_SYLLABUS, Physics
// Arun's Mechanics 1 ... Miscellaneous groups, Biology Class 11 / Class 12.
const byRange = (units, groups) => groups.map(([section, from, to]) => (
  { section, units: units.filter(x => x.id >= from && x.id <= to) }
))
const PHYSICS_SECTIONS = byRange(PHYSICS_UNITS, [
  ['Mechanics 1', 1, 9], ['Mechanics 2', 10, 13], ['Thermodynamics', 14, 16],
  ['Electromagnetism', 17, 23], ['Optics', 24, 25], ['Modern Physics', 26, 28],
  ['Miscellaneous Physics', 29, 32],
])
const byClass = (units, last11) => [
  { section: 'Class 11', units: units.filter(x => x.id <= last11) },
  { section: 'Class 12', units: units.filter(x => x.id > last11) },
]
export const SYLLABUS_SECTIONS = {
  Chemistry: NEET_CHEMISTRY_SYLLABUS,
  Physics: PHYSICS_SECTIONS,
  Biology: byClass(BIOLOGY_UNITS, 19),
}
