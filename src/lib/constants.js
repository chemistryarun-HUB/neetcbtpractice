export const ADMIN_EMAIL = 'admin@neetcbt.in'
export const ADMIN_PASSWORD = 'Admin@2025'

export const NEET_CHEMISTRY_SYLLABUS = [
  {
    section: 'Physical Chemistry',
    units: [
      { id: 1,  name: 'Some Basic Concepts in Chemistry' },
      { id: 2,  name: 'Atomic Structure' },
      { id: 3,  name: 'Chemical Bonding and Molecular Structure' },
      { id: 4,  name: 'Chemical Thermodynamics' },
      { id: 5,  name: 'Solutions' },
      { id: 6,  name: 'Equilibrium' },
      { id: 7,  name: 'Redox Reactions and Electrochemistry' },
      { id: 8,  name: 'Chemical Kinetics' },
    ],
  },
  {
    section: 'Inorganic Chemistry',
    units: [
      { id: 9,  name: 'Classification of Elements and Periodicity in Properties' },
      { id: 10, name: 'p-Block Elements' },
      { id: 11, name: 'd- and f-Block Elements', active: true },
      { id: 12, name: 'Coordination Compounds' },
    ],
  },
  {
    section: 'Organic Chemistry',
    units: [
      { id: 13, name: 'Purification and Characterisation of Organic Compounds' },
      { id: 14, name: 'Some Basic Principles of Organic Chemistry' },
      { id: 15, name: 'Hydrocarbons' },
      { id: 16, name: 'Organic Compounds Containing Halogens' },
      { id: 17, name: 'Organic Compounds Containing Oxygen' },
    ],
  },
]

export const UNIT_11_LEVELS = [
  { id: 1, name: 'Transition Elements Intro' },
  { id: 2, name: 'General Trends in Properties' },
  { id: 3, name: 'Oxides and Oxoanions' },
  { id: 4, name: 'KMnO₄' },
  { id: 5, name: 'K₂Cr₂O₇' },
  { id: 6, name: 'Lanthanoids' },
  { id: 7, name: 'Actinoids' },
  { id: 8, name: 'Miscellaneous' },
  { id: 9, name: 'Complete Chapter Test' },
]

export const UNLOCK_THRESHOLDS = [
  { attempt: 1, score_pct: 60 },
  { attempt: 2, score_pct: 50 },
  { attempt: 3, score_pct: 40 },
]

export const QUESTIONS_PER_ATTEMPT = 25
export const MARKS_CORRECT = 4
export const MARKS_WRONG = -1
