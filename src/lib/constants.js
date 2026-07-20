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
    { id: 1, name: 'Basic Concept of Chemistry',  topic: "Law of conservation of mass, Law of definite proportions, Law of multiple proportions, Gay Lussac's law of gaseous volumes, Avogadro law, Dalton's atomic theory." },
    { id: 2, name: 'Mole Concept',                topic: 'Atomic mass, Average atomic mass, Molecular mass, Formula mass, Mole concept, Molar mass, Percentage composition, Empirical formula' },
    { id: 3, name: 'Stoichiometry',               topic: 'Stoichiometry and Stoichiometric calculations, limiting reagents, Percentage purity, Percentage yield.' },
    { id: 4, name: 'Concentration Terms',         topic: 'Molarity, Molality, Mole-fraction, Mass percentage or weight percentage, weight by volume percentage, volume by volume percentage, ppm, Strength' },
    { id: 5, name: 'Equivalent Concept',          topic: 'Equivalent mass, Normality, Law of chemical equivalence, Mixing of solutions, Dilution of solutions.' },
    { id: 6, name: 'Miscellaneous',               topic: 'Miscellaneous' },
    { id: 7, name: 'Complete Chapter Test',       topic: 'Complete Chapter Test' },
  ],
  2: [
    { id: 1, name: 'Sub-atomic Particles',                topic: "Sub-atomic particles : Discovery of electron, Charge to mass ratio of electron, Charge on electron, Discovery of proton and neutron. Thomson model of atom, Rutherford's nuclear model of atom, Atomic and Mass number, Isobars and isotopes." },
    { id: 2, name: 'Electromagnetic Radiation',           topic: "Particle nature of electromagnetic radiation : Planck's quantum theory, Photoelectric effect, Dual behaviour of electromagnetic radiation." },
    { id: 3, name: 'Bohr\'s Model',                        topic: "Emission and absorption spectra, Line spectrum of hydrogen, Bohr's model for hydrogen atom, Explanation of Bohr's model." },
    { id: 4, name: 'Heisenberg\'s Uncertainty Principle',  topic: "Dual behaviour of matter, Heisenberg's uncertainty principle, Significance of uncertainty principle, Reason for the failure of the Bohr model." },
    { id: 5, name: 'Quantum Mechanics & Orbitals',         topic: "Quantum mechanics, Hydrogen atom and the Schrodinger equation, Orbitals and Quantum numbers, Shapes of atomic orbitals." },
    { id: 6, name: 'Electronic Configuration',             topic: "Energies of atomic orbitals, Filling of orbitals in atom : Aufbau principle, Pauli's exclusion principle, Hund's rule of maximum multiplicity,Electronic configuration of atoms, Causes of Stability of completely filled and half filled sub-shells." },
    { id: 7, name: 'Miscellaneous',                        topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',                topic: 'Complete Chapter Test' },
  ],
  5: [
    { id: 1, name: 'Types of Solutions',                topic: "Types of solutions, Expressing concentration of solutions." },
    { id: 2, name: 'Solubility & Raoult\'s Law',         topic: "Solubility of a solid in a liquid and gas in a liquid (Henry-law), Vapour pressure of liquid solutions, Raoult's law for binary solutions. Ideal and non-ideal solutions" },
    { id: 3, name: 'Colligative Properties',             topic: "Colligative properties and determination of molar mass : Relative lowering of vapour pressure, Elevation of boiling            point, depression of freezing point Osmosis, Osmotic pressure, reverse osmosis Abnormal molar masses and van’t Hoff factor" },
    { id: 4, name: 'Miscellaneous',                      topic: 'Miscellaneous' },
    { id: 5, name: 'Complete Chapter Test',              topic: 'Complete Chapter Test' },
  ],
  7: [
    { id: 1, name: 'Redox Reactions',                    topic: "Redox Reactions" },
    { id: 2, name: 'Electrochemical Cells',               topic: "Electrochemical cells - Electrolytic and Galvanic cells, different types of electrodes, electrode potentials including standard electrode potential, half-cell and cell reactions, emf of a Galvanic cell and its measurement." },
    { id: 3, name: 'Nernst Equation',                     topic: "Nernst equation and its applications; Relationship between cell potential and Gibbs' energy change." },
    { id: 4, name: 'Electrolysis & Faraday\'s Laws',      topic: "Electrolytic Cells and Electrolysis, Qualitative Aspects of Electrolysis, Quantitative Aspects of Electrolysis (Faradays Laws)" },
    { id: 5, name: 'Conductance & Kohlrausch\'s Law',     topic: "Electrolytic and metallic conduction, conductance in electrolytic solutions, molar conductivities and their variation with concentration: Kohlrausch’s law and its applications" },
    { id: 6, name: 'Cells, Batteries & Corrosion',        topic: "Cells and Batteries and Fuel Cell and Corrosion" },
    { id: 7, name: 'Miscellaneous',                       topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',               topic: 'Complete Chapter Test' },
  ],
  9: [
    { id: 1, name: 'Periodic Classification & Configuration', topic: "Genesis of periodic classification, Modern periodic law and the present form of the periodic table. Nomenclature of elements with atomic numbers > 100, Electronic configurations in periods, Groupwise electronic configuration, s, p, d & f-block elements, Metals, Non-metals and metalloids" },
    { id: 2, name: 'Periodic Trends - Physical Properties',   topic: "Periodic Trends in physical properties : Atomic radii, Ionisation enthalpy, Electron gain enthalpy, Electronegativity." },
    { id: 3, name: 'Periodic Trends - Chemical Properties',   topic: "Periodic trends in chemical properties : chemical reactivity, Oxidation states, Anomalous properties of second period elements." },
    { id: 4, name: 'Miscellaneous',                           topic: 'Miscellaneous' },
    { id: 5, name: 'Complete Chapter Test',                   topic: 'Complete Chapter Test' },
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
  12: [
    { id: 1, name: "Werner's Theory & Terminology",        topic: "Werner's theory of coordination compounds, Definition of some important terms pertaining to coordination compounds" },
    { id: 2, name: 'Nomenclature',                          topic: 'Nomenclature of coordination compounds.' },
    { id: 3, name: 'Valence Bond Theory',                   topic: 'Valence bond theory of complex compounds' },
    { id: 4, name: 'Crystal Field Theory',                  topic: 'Crystal field theory, colour of coordination complexes, Jahn Teller effect, Trans effect' },
    { id: 5, name: 'Metal Carbonyls & Stability',           topic: 'Bonding in metal carbonyls & organometallics, Stability of coordination compounds, Importance & Application of coordination compounds' },
    { id: 6, name: 'Isomerism',                             topic: 'Isomerism in coordination compounds.' },
    { id: 7, name: 'Miscellaneous',                         topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',                 topic: 'Complete Chapter Test' },
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
