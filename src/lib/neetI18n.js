// Student-side words of the level-wise NEET course in each medium. A student
// studies in one medium ('en' or 'gu', students.medium) and only ever sees
// questions written in it; this file gives them the screens in it too.
// Anything without a Gujarati entry falls back to English, so a unit or level
// added in constants.js shows up straight away and gets its Gujarati name here
// whenever one is written.
import { UNIT_LEVELS, isChapterTestLevel, unitNo } from './constants'

export const MEDIUMS = [
  { id: 'en', label: 'English' },
  { id: 'gu', label: 'ગુજરાતી' },
]
export const mediumLabel = m => MEDIUMS.find(x => x.id === m)?.label || 'English'
// The Excel "Medium" column and older rows say "Gujarati"/"English".
export function normMedium(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  return s === 'gu' || s === 'gujarati' || s === 'ગુજરાતી' ? 'gu' : 'en'
}

const STRINGS = {
  en: {
    logout: 'Logout',
    syllabus: subject => `${subject} Syllabus`,
    subject: { Chemistry: 'Chemistry', Physics: 'Physics', Biology: 'Biology' },
    unitsActive: n => `${n} unit${n !== 1 ? 's' : ''} active`,
    myPerformance: 'My Performance',
    practicePapers: 'Practice Papers',
    gsebPapers: 'GSEB Board Papers',
    howLevelsWork: 'How levels work',
    backToSyllabus: 'Back to Syllabus',
    unit: n => `Unit ${n}`,
    oneLevel: '1 level · always unlocked',
    levelsSummary: (n, last) => `${n} levels · Level 1 and ${last} always unlocked`,
    totalQuestions: 'Total questions',
    attempts: 'Attempts',
    questionsDone: 'Questions done',
    lectures: n => `${n} Lecture${n !== 1 ? 's' : ''}`,
    start: 'Start',
    continue: 'Continue',
    lockedToast: 'Complete previous levels to unlock this one',
    noUnits: 'No units are open in your medium yet.',
    // Test
    answered: 'Answered',
    of: n => `of ${n}`,
    isAnswered: '✓ Answered',
    notAnswered: 'Not answered',
    marking: '+4 for correct · −1 for wrong · 0 for skipped',
    previous: 'Previous',
    next: 'Next',
    clear: 'Clear',
    submit: '✓ Submit',
    submitting: 'Submitting...',
    confirmSubmit: n => `${n} question${n === 1 ? ' is' : 's are'} still unanswered (they score 0). Submit anyway?`,
    hintNav: 'prev / next',
    hintChoose: 'choose option',
    hintClear: 'clear',
    noQuestions: 'No questions available for this level yet.',
    // Result
    result: 'Result',
    attemptNo: n => `Attempt #${n}`,
    outOf: n => `out of ${n}`,
    score: 'score',
    correctPct: 'correct',
    time: 'time',
    unlocked: badge => `${badge} Unlocked!`,
    greatWork: pct => `Score ≥ ${pct}% — great work!`,
    scoreMore: 'Score more to unlock next level',
    needScore: (req, n, got) => `Need ${req}% score on attempt #${n}. You got ${got}%.`,
    correct: 'Correct',
    wrong: 'Wrong',
    skipped: 'Skipped',
    reviewAll: n => `Review all ${n} questions →`,
    practiceMore: 'Practice More',
    startNext: badge => `Start ${badge} →`,
  },
  gu: {
    logout: 'લૉગઆઉટ',
    syllabus: subject => `${subject} અભ્યાસક્રમ`,
    subject: { Chemistry: 'રસાયણવિજ્ઞાન', Physics: 'ભૌતિકવિજ્ઞાન', Biology: 'જીવવિજ્ઞાન' },
    unitsActive: n => `${n} એકમ સક્રિય`,
    myPerformance: 'મારું પરિણામ',
    practicePapers: 'પ્રેક્ટિસ પેપર્સ',
    gsebPapers: 'GSEB બોર્ડ પેપર્સ',
    howLevelsWork: 'લેવલ કેવી રીતે ખૂલે છે',
    backToSyllabus: 'અભ્યાસક્રમ પર પાછા',
    unit: n => `એકમ ${n}`,
    oneLevel: '1 લેવલ · હંમેશાં ખુલ્લું',
    levelsSummary: (n, last) => `${n} લેવલ · લેવલ 1 અને ${last} હંમેશાં ખુલ્લા`,
    totalQuestions: 'કુલ પ્રશ્નો',
    attempts: 'પ્રયત્નો',
    questionsDone: 'કરેલા પ્રશ્નો',
    lectures: n => `${n} લેક્ચર`,
    start: 'શરૂ કરો',
    continue: 'ચાલુ રાખો',
    lockedToast: 'આ લેવલ ખોલવા માટે પહેલાંના લેવલ પૂરા કરો',
    noUnits: 'તમારા માધ્યમમાં હજી કોઈ એકમ ખુલ્લો નથી.',
    answered: 'જવાબ આપ્યા',
    of: n => `/ ${n}`,
    isAnswered: '✓ જવાબ આપ્યો',
    notAnswered: 'જવાબ બાકી',
    marking: 'સાચા માટે +4 · ખોટા માટે −1 · છોડેલા માટે 0',
    previous: 'પાછળ',
    next: 'આગળ',
    clear: 'ભૂંસો',
    submit: '✓ સબમિટ',
    submitting: 'સબમિટ થાય છે...',
    confirmSubmit: n => `${n} પ્રશ્નોના જવાબ બાકી છે (તેના 0 ગુણ). છતાં સબમિટ કરવું છે?`,
    hintNav: 'પાછળ / આગળ',
    hintChoose: 'વિકલ્પ પસંદ કરો',
    hintClear: 'ભૂંસો',
    noQuestions: 'આ લેવલ માટે હજી પ્રશ્નો ઉપલબ્ધ નથી.',
    result: 'પરિણામ',
    attemptNo: n => `પ્રયત્ન #${n}`,
    outOf: n => `${n} માંથી`,
    score: 'સ્કોર',
    correctPct: 'સાચા',
    time: 'સમય',
    unlocked: badge => `${badge} ખૂલી ગયું!`,
    greatWork: pct => `સ્કોર ≥ ${pct}% — શાબાશ!`,
    scoreMore: 'આગળનું લેવલ ખોલવા વધુ સ્કોર કરો',
    needScore: (req, n, got) => `પ્રયત્ન #${n} માં ${req}% સ્કોર જોઈએ. તમારો સ્કોર ${got}% છે.`,
    correct: 'સાચા',
    wrong: 'ખોટા',
    skipped: 'છોડેલા',
    reviewAll: n => `બધા ${n} પ્રશ્નો જુઓ →`,
    practiceMore: 'ફરી પ્રેક્ટિસ',
    startNext: badge => `${badge} શરૂ કરો →`,
  },
}

export const neetT = medium => STRINGS[medium] || STRINGS.en

const GU_SECTIONS = {
  'Class 11 Physics': 'ધોરણ 11 ભૌતિકવિજ્ઞાન',
  'Class 12 Physics': 'ધોરણ 12 ભૌતિકવિજ્ઞાન',
}

const GU_UNITS = {
  101: 'એકમો અને માપન',
  102: 'ગતિવિજ્ઞાન',
  103: 'ગતિના નિયમો',
  104: 'કાર્ય, ઊર્જા અને પાવર',
  105: 'ચાકગતિ',
  106: 'ગુરુત્વાકર્ષણ',
  107: 'ઘન અને પ્રવાહીના ગુણધર્મો',
  108: 'ઉષ્માગતિશાસ્ત્ર',
  109: 'વાયુઓનો ગતિવાદ',
  110: 'દોલનો અને તરંગો',
  111: 'સ્થિતવિદ્યુતશાસ્ત્ર',
  112: 'પ્રવાહ વિદ્યુત',
  113: 'વિદ્યુતપ્રવાહની ચુંબકીય અસરો અને ચુંબકત્વ',
  114: 'વિદ્યુતચુંબકીય પ્રેરણ અને પ્રત્યાવર્તી પ્રવાહ',
  115: 'વિદ્યુતચુંબકીય તરંગો',
  116: 'પ્રકાશશાસ્ત્ર',
  117: 'વિકિરણ અને દ્રવ્યનો દ્વૈત સ્વભાવ',
  118: 'પરમાણુઓ અને ન્યુક્લિયસ',
  119: 'ઇલેક્ટ્રૉનિક ઉપકરણો',
  120: 'પ્રાયોગિક કૌશલ્ય',
}

// Level names per unit, in the same order as UNIT_LEVELS. Multilevel and the
// CCT are added for every unit below rather than repeated here.
const GU_LEVELS = {
  111: ['વિદ્યુતભાર અને કુલંબનો નિયમ', 'વિદ્યુતક્ષેત્ર અને ડાયપોલ', 'વિદ્યુત ફ્લક્સ અને ગૉસનો નિયમ', 'વિદ્યુતસ્થિતિમાન અને સ્થિતિઊર્જા', 'વાહકો, કૅપેસિટર અને ડાઇઇલેક્ટ્રિક'],
  112: ['વિદ્યુતપ્રવાહ, ડ્રિફ્ટ વેગ અને ઓહ્મનો નિયમ', 'અવરોધ, અવરોધકતા અને જોડાણો', 'કોષ, emf અને આંતરિક અવરોધ', 'કિર્ચોફના નિયમો અને વ્હીટસ્ટન બ્રિજ', 'પોટેન્શિયોમીટર અને મીટરબ્રિજ', 'વિદ્યુત પાવર અને ઉષ્મીય અસર'],
  113: ['બાયો-સાવર્ટ અને ઍમ્પિયરનો નિયમ', 'ગતિમાન વિદ્યુતભાર અને વાહક પર બળ', 'લૂપ પર ટૉર્ક અને ગૅલ્વેનોમીટર', 'ચુંબકીય ડાયપોલ અને પૃથ્વીનું ચુંબકત્વ', 'ચુંબકીય દ્રવ્યો'],
  114: ['ફેરેડે અને લેન્ઝના નિયમો', 'ગતિકીય emf અને ઘૂમરી પ્રવાહો', 'આત્મપ્રેરકત્વ અને અન્યોન્ય પ્રેરકત્વ', 'AC પરિપથો અને અનુનાદ', 'AC માં પાવર અને ટ્રાન્સફૉર્મર'],
  115: ['વિદ્યુતચુંબકીય તરંગો અને ગુણધર્મો', 'વિદ્યુતચુંબકીય વર્ણપટ'],
  116: ['પરાવર્તન અને ગોળીય અરીસા', 'વક્રીભવન, પૂર્ણ આંતરિક પરાવર્તન અને પ્રિઝમ', 'લેન્સ અને લેન્સમેકરનું સૂત્ર', 'પ્રકાશીય ઉપકરણો', 'વ્યતિકરણ (હાઇગેન્સ અને YDSE)', 'વિવર્તન અને ધ્રુવીભવન'],
  118: ['રધરફર્ડ અને બોહર મૉડેલ', 'હાઇડ્રોજન વર્ણપટ', 'ન્યુક્લિયસ, દળક્ષતિ અને બંધનઊર્જા', 'રેડિયોઍક્ટિવિટી અને ન્યુક્લિયર પ્રક્રિયાઓ'],
}
const GU_COMMON_LEVELS = {
  'Multilevel Questions': 'મલ્ટિલેવલ પ્રશ્નો',
  'Complete Chapter Test': 'સંપૂર્ણ પ્રકરણ ટેસ્ટ',
}

export function sectionName(section, medium) {
  return (medium === 'gu' && GU_SECTIONS[section]) || section
}

export function unitName(unit, medium) {
  return (medium === 'gu' && GU_UNITS[unit.id]) || unit.name
}

// "Unit 11: Electrostatics" / "એકમ 11: સ્થિતવિદ્યુતશાસ્ત્ર"
export function unitTitle(unit, medium) {
  return `${neetT(medium).unit(unit.no ?? unitNo(unit.id))}: ${unitName(unit, medium)}`
}

export function levelName(unitId, levelId, medium) {
  const def = (UNIT_LEVELS[Number(unitId)] || []).find(l => l.id === Number(levelId))
  if (!def) return ''
  if (medium !== 'gu') return def.name
  return GU_LEVELS[Number(unitId)]?.[Number(levelId) - 1] || GU_COMMON_LEVELS[def.name] || def.name
}

// levelBadge() in the student's medium: "CCT" stays as is in both.
export function levelBadgeT(unitId, levelId, medium) {
  if (isChapterTestLevel(unitId, levelId)) return 'CCT'
  return medium === 'gu' ? `લેવલ ${levelId ?? '—'}` : `Level ${levelId ?? '—'}`
}
