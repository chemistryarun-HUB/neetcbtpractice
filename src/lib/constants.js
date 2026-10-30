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
  {
    section: 'General Organic Chemistry (GOC)',
    units: [
      { id: 21, name: 'Nomenclature' },
      { id: 22, name: 'Isomerism' },
      { id: 23, name: 'Electron Displacement Effects' },
      // Added 2026-08-16, pushing the whole Organic Reaction Mechanisms
      // section below up by one (24→25 ... 35→36) — see the DB migration
      // this shipped with (renumbers unit text + qid on all affected rows;
      // level/topic/question content is untouched).
      { id: 24, name: 'Physical Properties' },
    ],
  },
  // Mechanism-wise organic course (modules 2-11 of 15; 12-15 not built yet).
  //
  // These are taught by REACTION MECHANISM rather than by NCERT chapter, so
  // each module is its own unit and carries a single level — the whole module
  // is one practice pool, deliberately, with no chapter test to combine levels
  // that don't exist. A single-level unit is always unlocked, so a student can
  // practise any module the day it is taught without clearing the ones before.
  //
  // Module 1 (Foundations: structure, IUPAC, isomerism, GOC) is NOT here — it
  // is the existing 'General Organic Chemistry (GOC)' section above,
  // which already holds all 498 organic questions, properly levelled.
  {
    section: 'Organic Reaction Mechanisms',
    units: [
      { id: 25, name: 'Free Radical Reactions' },
      { id: 26, name: 'Electrophilic Addition' },
      { id: 27, name: 'Electrophilic Aromatic Substitution' },
      { id: 28, name: 'Nucleophilic Substitution (SN1/SN2)' },
      { id: 29, name: 'Elimination (E1/E2)' },
      { id: 30, name: 'Aryl Halides & SNAr' },
      { id: 31, name: 'Nucleophilic Addition at Carbonyl' },
      { id: 32, name: 'Acyl Substitution' },
      { id: 33, name: 'α-Carbon Chemistry' },
      { id: 34, name: 'Oxidation & Reduction' },
      // Not mechanisms themselves — the two buckets the mechanism modules
      // can't absorb. Practical work has its own question style, and
      // Miscellaneous catches conversions that don't sit inside one module.
      { id: 35, name: 'Practical Organic Chemistry' },
      { id: 36, name: 'Miscellaneous Reactions' },
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
    { id: 6, name: 'Multilevel Questions',               topic: 'Miscellaneous' },
    { id: 7, name: 'Complete Chapter Test',       topic: 'Complete Chapter Test' },
  ],
  3: [
    { id: 1,  name: 'Ionic Bond / Lattice Enthalpy',        topic: "Kossel-Lewis approach to chemical bonding, Octet rule, Formation of ionic bonds, factors affecting the formation of ionic bonds, calculation of lattice enthalpy" },
    { id: 2,  name: 'Lewis Structure / Octet Exceptions',   topic: "Covalent bond, Lewis representation of simple molecules, Co-ordinate Covalent bond, Formal charge, Limitations of octet rule: Incomplete octet of the central atom, odd-electron molecule, The expanded octet" },
    { id: 3,  name: 'VSEPR & Molecular Shapes',             topic: "The valence shell electron pair repulsion theory, Shapes of simple molecules." },
    { id: 4,  name: "Dipole Moment / Fajan's Rule",         topic: "Polarity of bonds, Dipole moment and molecular structures, Percentage ionic character, Fajan's Rule" },
    { id: 5,  name: 'Bond Parameters / Resonance',          topic: "Bond parameters: Bond length, Bond angles, Bond enthalpy, Bond-order, Resonance structures" },
    { id: 6,  name: 'Valence Bond Theory',                  topic: "Valence bond theory: Orbital overlap concept, Directional properties of bonds, Overlapping of atomic orbitals, Types of overlapping and nature of covalent bonds. Strength of sigma & pi-bonds." },
    { id: 7,  name: 'Hybridisation',                        topic: "Hybridisation: Features and conditions, Types of hybridisation: sp, sp2, sp3, dsp2, sp3d, sp3d2, sp3d3" },
    { id: 8,  name: 'Molecular Orbital Theory',             topic: "Molecular orbital theory: Features, Linear combination of atomic orbitals, Conditions for the combination of atomic orbitals, Types of molecular orbitals, Energy level diagram for molecular orbitals, Electronic configuration and molecular behaviour, Bonding in some homonuclear diatomic molecule." },
    { id: 9,  name: 'Intermolecular Forces / H-bonding',    topic: "Intermolecular Forces: London dispersion forces (dispersion or induced dipole–induced dipole interactions), Dipole–dipole interactions, Hydrogen bonding, Dipole–induced dipole interactions, Ion–dipole interactions." },
    { id: 10, name: 'Multilevel Questions',                        topic: 'Miscellaneous' },
    { id: 11, name: 'Complete Chapter Test',                topic: 'Complete Chapter Test' },
  ],
  2: [
    { id: 1, name: 'Sub-atomic Particles',                topic: "Sub-atomic particles : Discovery of electron, Charge to mass ratio of electron, Charge on electron, Discovery of proton and neutron. Thomson model of atom, Rutherford's nuclear model of atom, Atomic and Mass number, Isobars and isotopes." },
    { id: 2, name: 'Electromagnetic Radiation',           topic: "Particle nature of electromagnetic radiation : Planck's quantum theory, Photoelectric effect, Dual behaviour of electromagnetic radiation." },
    { id: 3, name: 'Bohr\'s Model',                        topic: "Emission and absorption spectra, Line spectrum of hydrogen, Bohr's model for hydrogen atom, Explanation of Bohr's model." },
    { id: 4, name: 'Heisenberg\'s Uncertainty Principle',  topic: "Dual behaviour of matter, Heisenberg's uncertainty principle, Significance of uncertainty principle, Reason for the failure of the Bohr model." },
    { id: 5, name: 'Quantum Mechanics & Orbitals',         topic: "Quantum mechanics, Hydrogen atom and the Schrodinger equation, Orbitals and Quantum numbers, Shapes of atomic orbitals." },
    { id: 6, name: 'Electronic Configuration',             topic: "Energies of atomic orbitals, Filling of orbitals in atom : Aufbau principle, Pauli's exclusion principle, Hund's rule of maximum multiplicity,Electronic configuration of atoms, Causes of Stability of completely filled and half filled sub-shells." },
    { id: 7, name: 'Multilevel Questions',                        topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',                topic: 'Complete Chapter Test' },
  ],
  4: [
    { id: 1, name: 'Thermodynamic Terms & First Law',   topic: "Thermodynamic terms: System and surroundings, Types of system, The state of the system, The internal energy as a state function : Work & Heat, First law of thermodynamics" },
    { id: 2, name: 'Thermodynamic Processes & Enthalpy', topic: "Thermodynamic process, Reversible and irreversible process, pressure-volume work, Isothermal and free expansion of an ideal gas. Extensive and intensive properties, enthalpy H" },
    { id: 3, name: 'Heat Capacity & Calorimetry',       topic: "Heat capacity, Relation between Cv & Cp for an ideal gas; Calorimetry" },
    { id: 4, name: "Thermochemistry / Hess's Law",      topic: "Enthalpy and thermo chemical equation. Hess's law of constant heat summation, Enthalpy of combustion, Atomization, Bond-dissociation, Solution, Lattice and neutralisation." },
    { id: 5, name: 'Entropy & Free Energy',             topic: "Spontaneity and entropy, Second law of thermodynamics, Free energy change and criteria for spontaneity, Third law of thermodynamics." },
    { id: 6, name: 'Multilevel Questions',              topic: 'Miscellaneous' },
    { id: 7, name: 'Complete Chapter Test',             topic: 'Complete Chapter Test' },
  ],
  5: [
    { id: 1, name: 'Types of Solutions',                topic: "Types of solutions, Expressing concentration of solutions." },
    { id: 2, name: 'Solubility & Raoult\'s Law',         topic: "Solubility of a solid in a liquid and gas in a liquid (Henry-law), Vapour pressure of liquid solutions, Raoult's law for binary solutions. Ideal and non-ideal solutions" },
    { id: 3, name: 'Colligative Properties',             topic: "Colligative properties and determination of molar mass : Relative lowering of vapour pressure, Elevation of boiling            point, depression of freezing point Osmosis, Osmotic pressure, reverse osmosis Abnormal molar masses and van’t Hoff factor" },
    { id: 4, name: 'Multilevel Questions',                      topic: 'Miscellaneous' },
    { id: 5, name: 'Complete Chapter Test',              topic: 'Complete Chapter Test' },
  ],
  7: [
    { id: 1, name: 'Redox Reactions',                    topic: "Redox Reactions" },
    { id: 2, name: 'Electrochemical Cells',               topic: "Electrochemical cells - Electrolytic and Galvanic cells, different types of electrodes, electrode potentials including standard electrode potential, half-cell and cell reactions, emf of a Galvanic cell and its measurement." },
    { id: 3, name: 'Nernst Equation',                     topic: "Nernst equation and its applications; Relationship between cell potential and Gibbs' energy change." },
    { id: 4, name: 'Electrolysis & Faraday\'s Laws',      topic: "Electrolytic Cells and Electrolysis, Qualitative Aspects of Electrolysis, Quantitative Aspects of Electrolysis (Faradays Laws)" },
    { id: 5, name: 'Conductance & Kohlrausch\'s Law',     topic: "Electrolytic and metallic conduction, conductance in electrolytic solutions, molar conductivities and their variation with concentration: Kohlrausch’s law and its applications" },
    { id: 6, name: 'Cells, Batteries & Corrosion',        topic: "Cells and Batteries and Fuel Cell and Corrosion" },
    { id: 7, name: 'Multilevel Questions',                       topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',               topic: 'Complete Chapter Test' },
  ],
  8: [
    { id: 1, name: 'Rate of Reaction & Order',              topic: 'Rate of a chemical reaction, Factors influencing rate of reactions, Rate expression and rate constant, Order and molecularity of a reaction' },
    { id: 2, name: 'Integrated Rate Equations',              topic: 'Integrated rate equations for zero and first order reactions, determination of order of reaction, Pseudo first order reaction.' },
    { id: 3, name: 'Temperature Dependence & Catalysis',     topic: 'Temperature dependence of the rate of a reaction, Effect of catalyst, Collision theory of chemical reactions.' },
    { id: 4, name: 'Multilevel Questions',                          topic: 'Miscellaneous' },
    { id: 5, name: 'Complete Chapter Test',                  topic: 'Complete Chapter Test' },
  ],
  9: [
    { id: 1, name: 'Periodic Classification & Configuration', topic: "Genesis of periodic classification, Modern periodic law and the present form of the periodic table. Nomenclature of elements with atomic numbers > 100, Electronic configurations in periods, Groupwise electronic configuration, s, p, d & f-block elements, Metals, Non-metals and metalloids" },
    { id: 2, name: 'Periodic Trends - Physical Properties',   topic: "Periodic Trends in physical properties : Atomic radii, Ionisation enthalpy, Electron gain enthalpy, Electronegativity." },
    { id: 3, name: 'Periodic Trends - Chemical Properties',   topic: "Periodic trends in chemical properties : chemical reactivity, Oxidation states, Anomalous properties of second period elements." },
    { id: 4, name: 'Multilevel Questions',                           topic: 'Miscellaneous' },
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
    { id: 8, name: 'Multilevel Questions',                                    topic: 'Miscellaneous' },
    { id: 9, name: 'Complete Chapter Test',                            topic: 'Complete Chapter Test' },
  ],
  12: [
    { id: 1, name: "Werner's Theory & Terminology",        topic: "Werner's theory of coordination compounds, Definition of some important terms pertaining to coordination compounds" },
    { id: 2, name: 'Nomenclature',                          topic: 'Nomenclature of coordination compounds.' },
    { id: 3, name: 'Valence Bond Theory',                   topic: 'Valence bond theory of complex compounds' },
    { id: 4, name: 'Crystal Field Theory',                  topic: 'Crystal field theory, colour of coordination complexes, Jahn Teller effect, Trans effect' },
    { id: 5, name: 'Metal Carbonyls & Stability',           topic: 'Bonding in metal carbonyls & organometallics, Stability of coordination compounds, Importance & Application of coordination compounds' },
    { id: 6, name: 'Isomerism',                             topic: 'Isomerism in coordination compounds.' },
    { id: 7, name: 'Multilevel Questions',                         topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',                 topic: 'Complete Chapter Test' },
  ],
  21: [
    { id: 1, name: 'Basics of Organic Chemistry',                        topic: 'Basics of Organic Chemistry' },
    { id: 2, name: 'Nomenclature of Alkanes, Alkenes and Alkynes',  topic: 'Nomenclature of Alkanes, Alkenes and Alkynes' },
    { id: 3, name: 'Nomenclature of Compounds having One Functional Group', topic: 'Nomenclature of Compounds having One Functional Group' },
    { id: 4, name: 'Nomenclature of Compounds having Poly Functional Group', topic: 'Nomenclature of Compounds having Poly Functional Group' },
    { id: 5, name: 'Nomenclature of Aromatic Compounds',                 topic: 'Nomenclature of Aromatic Compounds' },
    // Matches Unit 22/23's own convention: Multilevel Questions stays a
    // named, non-final level with topic 'Miscellaneous' (what an Excel
    // upload's Topic column should read to land here), and Complete Chapter
    // Test is the separate, true last level.
    { id: 6, name: 'Multilevel Questions',        topic: 'Miscellaneous' },
    { id: 7, name: 'Complete Chapter Test',       topic: 'Complete Chapter Test' },
  ],
  22: [
    { id: 1, name: 'Structural Isomerism',      topic: 'Structural Isomerism' },
    { id: 2, name: 'Conformational Isomerism',  topic: 'Conformational Isomerism' },
    { id: 3, name: 'Geometrical Isomerism',     topic: 'Geometrical Isomerism' },
    { id: 4, name: 'Optical Isomerism',         topic: 'Optical Isomerism' },
    { id: 5, name: 'Multilevel Questions',             topic: 'Miscellaneous' },
    { id: 6, name: 'Complete Chapter Test',     topic: 'Complete Chapter Test' },
  ],
  23: [
    { id: 1, name: 'Inductive Effect and its Applications',
              topic: 'Inductive Effect and its Applications' },
    { id: 2, name: 'Resonance/Mesomerism, Resonance Energy, Aromaticity and its Applications',
              topic: 'Resonance/Mesomerism, Resonance Energy, Aromaticity and its Applications' },
    { id: 3, name: 'Resonance/Mesomeric Effect and its Applications',
              topic: 'Resonance/Mesomeric Effect and its Applications' },
    { id: 4, name: 'Hyperconjugation, Electromeric Effect and its Applications',
              topic: 'Hyperconjugation, Electromeric Effect and its Applications' },
    { id: 5, name: 'Acidic and Basic Strength',
              topic: 'Acidic and Basic Strength' },
    { id: 6, name: 'Electrophiles, Nucleophiles, Nucleophilicity, Solvent Effect and Types of Reactions',
              topic: 'Electrophiles, Nucleophiles, Nucleophilicity, Solvent Effect and Types of Reactions' },
    { id: 7, name: 'Multilevel Questions',             topic: 'Miscellaneous' },
    { id: 8, name: 'Complete Chapter Test',     topic: 'Complete Chapter Test' },
  ],
  // Unit 24 (Physical Properties, GOC) — one level, same shape as the
  // mechanism modules below: the whole unit is one pool, always unlocked,
  // no separate chapter test (there's nothing else to combine one level
  // with). name === topic, matching Unit 21's convention for a real chapter
  // unit — topic is what an Excel Topic column must read to land here.
  24: [
    { id: 1, name: 'Physical Properties', topic: 'Physical Properties' },
  ],
  // ── Mechanism-wise modules (units 25-34) ──────────────────────────────────
  // One level each, on purpose. The level `name` is the module's core idea —
  // the hook it is taught with — because the unit name already says what the
  // module is, and repeating it on the level card says nothing twice. `topic`
  // carries the full title and is what the ⓘ tooltip shows.
  //
  // Splitting any of these into real levels later is just editing the array
  // here and re-levelling that module's questions from the admin level
  // dropdown; nothing about starting flat forecloses it.
  25: [
    { id: 1, name: 'No charge — the simplest mechanism',
              topic: 'Free Radical Reactions — homolysis, initiation/propagation/termination, radical stability and selectivity.' },
  ],
  26: [
    { id: 1, name: 'Carbocation and its three fates',
              topic: 'Electrophilic Addition & Carbocation Chemistry — Markovnikov and anti-Markovnikov addition, carbocation stability and rearrangement.' },
  ],
  27: [
    { id: 1, name: 'Ring reactions, one directive rule',
              topic: 'Electrophilic Aromatic Substitution — nitration, halogenation, sulphonation, Friedel–Crafts; activating and deactivating groups, o/p and m direction.' },
  ],
  28: [
    { id: 1, name: 'The central mechanism',
              topic: 'Nucleophilic Substitution at sp³ (SN1/SN2) — mechanism, stereochemistry, kinetics; substrate, nucleophile, leaving group and solvent effects.' },
  ],
  29: [
    { id: 1, name: 'Same substrate, different outcome',
              topic: 'Elimination (E1/E2) and SN vs E competition — Zaitsev and Hofmann orientation, base strength and steric effects.' },
  ],
  30: [
    { id: 1, name: 'Why the ring resists',
              topic: 'Aryl Halides & Nucleophilic Aromatic Substitution — addition–elimination and benzyne routes, effect of activating groups.' },
  ],
  31: [
    { id: 1, name: 'C=O opens up',
              topic: 'Nucleophilic Addition at Carbonyl — addition of cyanide, bisulphite, alcohols, amines and Grignard reagents to aldehydes and ketones.' },
  ],
  32: [
    { id: 1, name: 'Add, then kick out',
              topic: 'Nucleophilic Addition–Elimination (Acyl Substitution) — reactivity order of acid derivatives, interconversion, hydrolysis and esterification.' },
  ],
  33: [
    { id: 1, name: 'α-H hai ya nahi?',
              topic: 'α-Carbon Chemistry (Enol/Enolate) — acidity of α-hydrogen, tautomerism, aldol and Cannizzaro, haloform reaction.' },
  ],
  34: [
    { id: 1, name: 'One ladder, one reagent table',
              topic: 'Oxidation & Reduction as One System — the oxidation ladder, common oxidising and reducing agents and what each one does.' },
  ],
  35: [
    { id: 1, name: 'Test it, separate it, identify it',
              topic: 'Practical Organic Chemistry — detection of extra elements (Lassaigne’s test), functional group identification, purification by crystallisation, distillation and chromatography, and the principles behind qualitative and quantitative analysis.' },
  ],
  36: [
    { id: 1, name: 'Everything that fits nowhere else',
              topic: 'Miscellaneous Reactions — named reactions and conversions that do not belong to a single mechanism module, plus mixed questions that cut across several of them.' },
  ],
}

// Kept for backward-compat with any existing imports
export const UNIT_11_LEVELS = UNIT_LEVELS[11]

// Levels of the other subjects, same shape as UNIT_LEVELS (unit numbers
// restart at 1 per subject — see lib/subjects.js). Filled in as authored.
// Physics levels, lecture-wise inside each chapter, then Multilevel and the
// Complete Chapter Test like every Chemistry unit. Topic doubles as the
// level's description in the "i" tooltip.
const physicsLevels = names => [
  ...names.map(([name, topic], i) => ({ id: i + 1, name, topic })),
  { id: names.length + 1, name: 'Multilevel Questions', topic: 'Miscellaneous' },
  { id: names.length + 2, name: 'Complete Chapter Test', topic: 'Complete Chapter Test' },
]
export const PHYSICS_UNIT_LEVELS = {
  15: physicsLevels([
    ["Electric Charge & Coulomb's Law", "Electric charge, conservation and quantisation of charge, Coulomb's law, force between multiple charges, superposition"],
    ['Electric Field & Dipole', 'Electric field due to a point charge and a dipole, electric field lines, dipole in a uniform field, torque'],
    ["Electric Flux & Gauss's Law", "Electric flux, Gauss's law and its applications: infinite wire, infinite plane sheet, thin spherical shell"],
  ]),
  16: physicsLevels([
    ['Electric Potential & Potential Energy', 'Electric potential, potential difference, potential due to a point charge and a dipole, equipotential surfaces, potential energy'],
    ['Conductors, Capacitors & Dielectrics', 'Conductors and insulators, dielectrics and polarisation, capacitors and capacitance, combinations, parallel plate capacitor, energy stored'],
  ]),
  17: physicsLevels([
    ["Current, Drift Velocity & Ohm's Law", "Electric current, drift velocity, mobility, current density, Ohm's law"],
    ['Resistance, Resistivity & Combinations', 'Resistance and resistivity, temperature dependence, series and parallel combinations'],
    ['Cells, EMF & Internal Resistance', 'EMF, internal resistance, potential difference, cells in series and parallel'],
    ["Kirchhoff's Laws & Wheatstone Bridge", "Kirchhoff's junction and loop rules, Wheatstone bridge"],
    ['Potentiometer & Meter Bridge', 'Metre bridge, potentiometer and their uses'],
    ['Electric Power & Heating', 'Electrical energy and power, heating effect of current'],
  ]),
  18: physicsLevels([
    ["Biot-Savart & Ampere's Law", "Biot-Savart law, field of a circular loop, Ampere's circuital law, straight wire, solenoid"],
    ['Force on Moving Charges & Conductors', 'Lorentz force, motion in a magnetic field, velocity selector, force between parallel currents'],
    ['Torque on Loop & Galvanometer', 'Torque on a current loop, moving coil galvanometer, conversion to ammeter and voltmeter'],
  ]),
  19: physicsLevels([
    ["Magnetic Dipole & Earth's Magnetism", "Current loop as a magnetic dipole, bar magnet, magnetic field lines, Gauss's law for magnetism"],
    ['Magnetic Materials', 'Para-, dia- and ferromagnetic substances, magnetisation, susceptibility, permeability'],
  ]),
  20: physicsLevels([
    ["Faraday's & Lenz's Laws", "Electromagnetic induction, magnetic flux, Faraday's law, Lenz's law"],
    ['Motional EMF & Eddy Currents', 'Motional EMF, eddy currents, back EMF'],
    ['Self & Mutual Inductance', 'Self inductance, mutual inductance, energy stored in an inductor'],
  ]),
  21: physicsLevels([
    ['AC Circuits & Resonance', 'Alternating current and voltage, peak and rms values, reactance and impedance, LCR series circuit, resonance'],
    ['Power in AC & Transformer', 'Power in AC circuits, power factor, wattless current, AC generator and transformer'],
  ]),
  22: physicsLevels([
    ['EM Waves & their Properties', 'Displacement current, electromagnetic waves and their characteristics, energy and momentum'],
    ['EM Spectrum', 'Electromagnetic spectrum and uses of each region'],
  ]),
  23: physicsLevels([
    ['Reflection & Spherical Mirrors', 'Reflection of light, spherical mirrors, mirror formula'],
    ['Refraction, TIR & Prism', 'Refraction, total internal reflection and its applications, prism'],
    ["Lenses & Lens Maker's Formula", "Refraction at spherical surfaces, lenses, thin lens formula, lens maker's formula, power, combination of lenses"],
    ['Optical Instruments', 'Microscope and astronomical telescope'],
  ]),
  24: physicsLevels([
    ['Interference (Huygens & YDSE)', "Wavefront and Huygens' principle, interference, Young's double slit experiment, coherent sources"],
    ['Diffraction & Polarisation', 'Diffraction due to a single slit, polarisation, plane polarised light'],
  ]),
  26: physicsLevels([
    ['Rutherford & Bohr Model', "Alpha-particle scattering, Rutherford's model, Bohr model, energy levels"],
    ['Hydrogen Spectrum', 'Hydrogen spectrum and spectral series'],
  ]),
  27: physicsLevels([
    ['Nucleus, Mass Defect & Binding Energy', 'Composition and size of the nucleus, isotopes, isobars, isotones, mass-energy relation, mass defect, binding energy'],
    ['Radioactivity & Nuclear Reactions', 'Radioactivity, alpha, beta and gamma, nuclear fission and fusion'],
  ]),
}
// Biology levels, topic-wise inside each NCERT chapter, then Multilevel and
// the Complete Chapter Test (same shape as Physics).
export const BIOLOGY_UNIT_LEVELS = {
  1: physicsLevels([
    ['What is Living?', 'Defining characters of living organisms: growth, reproduction, metabolism, cellular organisation, consciousness (response to stimuli)'],
    ['Biodiversity & Nomenclature', 'Diversity in the living world, need for classification, taxonomy and systematics, binomial nomenclature and its rules'],
    ['Taxonomic Categories & Hierarchy', 'Taxonomic hierarchy, concept of species, genus, family, order, class, phylum/division and kingdom, with examples (man, housefly, mango, wheat)'],
  ]),
}

// Student practice keys a unit by one number across subjects: Chemistry n,
// Physics 100 + n, Biology 200 + n. That number is what the test route,
// student_progress.unlocked_levels_by_unit, used_questions.unit_id and
// test_attempts.unit_id hold, so Physics chapter 15 and Chemistry unit 15
// never share progress. Questions themselves keep subject + "Unit 15 - ...".
export const COURSE_OFFSET = { Chemistry: 0, Physics: 100, Biology: 200 }
export const courseUnitId = (subject, unit) => (COURSE_OFFSET[subject || 'Chemistry'] ?? 0) + Number(unit)
export function fromCourseUnitId(id) {
  const n = Number(id)
  if (n > 200) return { subject: 'Biology', unit: n - 200 }
  if (n > 100) return { subject: 'Physics', unit: n - 100 }
  return { subject: 'Chemistry', unit: n }
}
// Every lookup keyed on a practice unit id (badges, CCT, next level, the
// performance screens) then finds Physics and Biology levels in UNIT_LEVELS.
for (const [subject, levels] of [['Physics', PHYSICS_UNIT_LEVELS], ['Biology', BIOLOGY_UNIT_LEVELS]]) {
  for (const [n, defs] of Object.entries(levels)) UNIT_LEVELS[courseUnitId(subject, n)] = defs
}
const LEVELS = { Chemistry: UNIT_LEVELS, Physics: PHYSICS_UNIT_LEVELS, Biology: BIOLOGY_UNIT_LEVELS }
export function levelDefsFor(subject, unitId) {
  return (LEVELS[subject || 'Chemistry'] || {})[Number(unitId)] || []
}

/**
 * Level ids defined for a unit. Falls back to a generic 1-9 range only for units
 * whose levels haven't been authored into UNIT_LEVELS yet, so an admin can still
 * file a question somewhere rather than being handed an empty dropdown.
 */
export function levelIdsFor(unitId) {
  const defs = UNIT_LEVELS[Number(unitId)] || []
  return defs.length > 0 ? defs.map(l => l.id) : [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

/**
 * The Complete Chapter Test (CCT) is always the last level of a unit, and it
 * behaves nothing like the sequential levels before it: it's unlocked from
 * day one (alongside Level 1) rather than earned by clearing a prior level,
 * and it draws its questions from every level of the unit combined instead
 * of having its own pool. Labeling it "Level 07" the same way as the levels
 * that ARE sequentially gated implies a numeric position it doesn't have —
 * hence the short "CCT" badge everywhere a level number is shown, paired
 * with an "i" tooltip carrying the full name (already the level's own
 * name/topic string in UNIT_LEVELS, so no separate copy to keep in sync).
 */
// A unit's LAST level is its Complete Chapter Test — it draws from every level
// of the unit, so it only means anything where there is more than one level to
// draw from. The mechanism modules (units 24-33) carry a single level each:
// without the length > 1 guard that one level counts as "last", and every badge
// in the app — syllabus card, test header, result screen, attempt review, the
// performance table and the parent PDF — would label it CCT instead of Level 1.
export function isChapterTestLevel(unitId, levelId, subject = 'Chemistry') {
  const defs = levelDefsFor(subject, unitId)
  return defs.length > 1 && defs[defs.length - 1].id === Number(levelId)
}

// Short display label for a level — "CCT" for the Complete Chapter Test,
// else "Level N" (optionally zero-padded to match a table's other numbers).
export function levelBadge(unitId, levelId, { pad = false, subject = 'Chemistry' } = {}) {
  if (isChapterTestLevel(unitId, levelId, subject)) return 'CCT'
  if (levelId == null) return 'Level —'
  return `Level ${pad ? String(levelId).padStart(2, '0') : levelId}`
}

/**
 * The level a student unlocks by clearing `levelId` in `unitId` — null when
 * they've just cleared the unit's last level, so there's nothing left to open.
 *
 * Replaces the old hardcoded `level < 9` checks, which silently refused to
 * unlock anything past level 9 and so stranded students on units with more
 * levels than that (Unit 3 has 11).
 */
export function nextLevelIdFor(unitId, levelId) {
  const defs = UNIT_LEVELS[Number(unitId)] || []
  const idx = defs.findIndex(l => l.id === Number(levelId))
  if (idx === -1) return null
  return defs[idx + 1]?.id ?? null
}

export const UNLOCK_THRESHOLDS = [
  { attempt: 1, score_pct: 60 },
  { attempt: 2, score_pct: 50 },
  { attempt: 3, score_pct: 40 },
]

// The bar gets easier through attempt 3, then holds there — attempt 4, 5,
// 100, etc. all still need to clear the same 40% as attempt 3. Attempts
// past the last defined entry used to fall through with no threshold at
// all, meaning a student who didn't clear in their first 3 tries could
// never unlock the next level again no matter how well they later scored.
export function thresholdPctFor(attemptNumber) {
  const exact = UNLOCK_THRESHOLDS.find(t => t.attempt === attemptNumber)
  if (exact) return exact.score_pct
  const last = UNLOCK_THRESHOLDS[UNLOCK_THRESHOLDS.length - 1]
  return attemptNumber > last.attempt ? last.score_pct : null
}

export const QUESTIONS_PER_ATTEMPT = 25
export const MARKS_CORRECT = 4
export const MARKS_WRONG = -1
