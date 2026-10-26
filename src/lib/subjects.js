// Subjects and their units. A unit IS an NCERT chapter (Class 11 first, then
// Class 12 continuing the numbering), per the rationalised 2023 books.
//
// Unit numbers restart at 1 in every subject, so a unit is only meaningful
// together with its subject. Chemistry keeps its own syllabus + levels in
// constants.js; Physics and Biology have units only for now — their levels are
// added to PHYSICS_UNIT_LEVELS / BIOLOGY_UNIT_LEVELS in constants.js as they
// are authored (same shape as UNIT_LEVELS).
import { NEET_CHEMISTRY_SYLLABUS, levelDefsFor } from './constants'

const u = names => names.map((name, i) => ({ id: i + 1, name }))

export const PHYSICS_UNITS = u([
  // Class 11
  'Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion',
  'Work, Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation',
  'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter',
  'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves',
  // Class 12
  'Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity',
  'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction', 'Alternating Current',
  'Electromagnetic Waves', 'Ray Optics and Optical Instruments', 'Wave Optics',
  'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei',
  'Semiconductor Electronics: Materials, Devices and Simple Circuits',
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
export const QID_PREFIX = { Chemistry: 'NCU', Physics: 'NPH', Biology: 'NBI' }

export const UNITS_BY_SUBJECT = { Chemistry: CHEMISTRY_UNITS, Physics: PHYSICS_UNITS, Biology: BIOLOGY_UNITS }

export const unitsFor = subject => UNITS_BY_SUBJECT[subject || 'Chemistry'] || []
export const levelsFor = levelDefsFor
export const unitLabelOf = (subject, unitId) => {
  const unit = unitsFor(subject).find(x => x.id === Number(unitId))
  return unit ? `Unit ${unit.id} - ${unit.name}` : ''
}
