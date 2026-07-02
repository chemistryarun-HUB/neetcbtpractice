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
      { id: 11, name: 'd & f Block Elements' },
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
      { id: 18, name: 'Organic Compounds Containing Nitrogen' },
      { id: 19, name: 'Biomolecules' },
      { id: 20, name: 'Principles Related to Practical Chemistry' },
    ],
  },
]

// ── Per-unit level definitions ────────────────────────────────────────────────
// Each entry: { id: levelNumber, name: displayName, topic: exactTopicInExcel }
// Level 1 and the last level are always unlocked for students automatically.
// To add a new unit: copy an existing block and fill in the correct level names
// and the EXACT topic strings as they appear in the "Topic" column of your Excel.
// ─────────────────────────────────────────────────────────────────────────────
export const UNIT_LEVELS = {
  1: [
    { id: 1, name: 'Basic Concept of Chemistry',  topic: 'Basic Concept of Chemistry' },
    { id: 2, name: 'Mole Concept',                topic: 'Mole Concept' },
    { id: 3, name: 'Stoichiometry',               topic: 'Stoichiometry' },
    { id: 4, name: 'Concentration Terms',         topic: 'Concentration Terms' },
    { id: 5, name: 'Equivalent Concept',          topic: 'Equivalent Concept' },
    { id: 6, name: 'Complete Chapter Test',       topic: 'Complete Chapter Test' },
  ],
  11: [
    { id: 1, name: 'Transition Elements Intro',                        topic: 'Transition Elements: General Introduction, Electronic Configuration, Occurrence and Characteristics' },
    { id: 2, name: 'General Trends in Properties',                     topic: 'Transition Elements: General Trends in Properties' },
    { id: 3, name: 'Oxides and Oxoanions',                             topic: 'Transition Elements: Oxides and Oxoanions of Metals' },
    { id: 4, name: 'KMnO₄',                                           topic: 'Preparation, Properties and Uses of KMnO₄' },
    { id: 5, name: 'K₂Cr₂O₇',                                        topic: 'Preparation, Properties and Uses of K₂Cr₂O₇' },
    { id: 6, name: 'Lanthanoids',                                      topic: 'Lanthanoids: Electronic Configuration, Oxidation States and Lanthanoid Contraction' },
    { id: 7, name: 'Actinoids',                                        topic: 'Actinoids: Electronic Configuration and Oxidation States' },
    { id: 8, name: 'Miscellaneous',                                    topic: 'Miscellaneous' },
    { id: 9, name: 'Complete Chapter Test',                            topic: 'Complete Chapter Test' },
  ],
  // Add more units here as you upload questions for them:
  // 2: [
  //   { id: 1, name: 'Bohr Model', topic: 'Bohr Model' },
  //   ...
  // ],
}

// Kept for backward-compat with any existing imports
export const UNIT_11_LEVELS = UNIT_LEVELS[11]

export const UNLOCK_THRESHOLDS = [
  { attempt: 1, score_pct: 60 },
  { attempt: 2, score_pct: 50 },
  { attempt: 3, score_pct: 40 },
]

export const QUESTIONS_PER_ATTEMPT = 25
export const MARKS_CORRECT = 4
export const MARKS_WRONG = -1
