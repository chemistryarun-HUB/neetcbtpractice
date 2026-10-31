// Student-side words of the level-wise NEET course in each medium. A student
// studies in one medium ('en' or 'gu', students.medium) and only ever sees
// questions written in it; this file gives them the screens in it too.
// Anything without a Gujarati entry falls back to English, so a unit or level
// added in constants.js or subjects.js shows up straight away and gets its Gujarati name here
// whenever one is written.
import { UNIT_LEVELS, isChapterTestLevel, courseUnitId } from './constants'

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
    comingSoon: 'Coming soon',
    subjectSoon: sub => `${sub} practice is coming soon. Units will open as questions are added.`,
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
    comingSoon: 'ટૂંક સમયમાં',
    subjectSoon: sub => `${sub} ની પ્રેક્ટિસ ટૂંક સમયમાં. પ્રશ્નો ઉમેરાતાં એકમો ખૂલશે.`,
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

// Keyed by section heading (lib/subjects.js SYLLABUS_SECTIONS).
const GU_SECTIONS = {
  'Class 11': 'ધોરણ 11',
  'Class 12': 'ધોરણ 12',
}

// Keyed by practice unit id (courseUnitId: Physics chapter n is 100 + n,
// Biology chapter n is 200 + n).
// Names follow the GSEB Gujarati medium editions of the NCERT books.
const GU_PHYSICS_UNITS = [
  'એકમો અને માપન', 'સુરેખ પથ પર ગતિ', 'સમતલમાં ગતિ', 'ગતિના નિયમો',
  'કાર્ય, ઊર્જા અને પાવર', 'કણોનાં તંત્રો અને ચાકગતિ', 'ગુરુત્વાકર્ષણ',
  'ઘન પદાર્થોના યાંત્રિક ગુણધર્મો', 'તરલના યાંત્રિક ગુણધર્મો', 'દ્રવ્યના ઉષ્મીય ગુણધર્મો',
  'થરમૉડાયનેમિક્સ', 'વાયુઓનો ગતિવાદ', 'દોલનો', 'તરંગો',
  'વિદ્યુતભારો અને ક્ષેત્રો', 'સ્થિત વિદ્યુતસ્થિતિમાન અને કૅપેસિટન્સ', 'પ્રવાહ વિદ્યુત',
  'ગતિમાન વિદ્યુતભારો અને ચુંબકત્વ', 'ચુંબકત્વ અને દ્રવ્ય', 'વિદ્યુતચુંબકીય પ્રેરણ', 'પ્રત્યાવર્તી પ્રવાહ',
  'વિદ્યુતચુંબકીય તરંગો', 'કિરણ પ્રકાશશાસ્ત્ર અને પ્રકાશીય ઉપકરણો', 'તરંગ પ્રકાશશાસ્ત્ર',
  'વિકિરણ અને દ્રવ્યની દ્વૈત પ્રકૃતિ', 'પરમાણુઓ', 'ન્યુક્લિયસ',
  'સેમિકન્ડક્ટર ઇલેક્ટ્રૉનિક્સ: દ્રવ્યો, રચનાઓ અને સાદા પરિપથો',
]
// Biology chapter names as Arun supplied them (GSEB Gujarati medium books).
const GU_BIOLOGY_UNITS = [
  'સજીવ વિશ્વ', 'જૈવિક વર્ગીકરણ', 'વનસ્પતિ સૃષ્ટિ', 'પ્રાણીસૃષ્ટિ',
  'સપુષ્પી વનસ્પતિઓની બાહ્યાકારવિદ્યા', 'સપુષ્પી વનસ્પતિઓની અંતઃસ્થ રચના', 'પ્રાણીઓમાં રચનાકીય આયોજન',
  'કોષ : જીવનનો એકમ', 'જૈવઅણુઓ', 'કોષચક્ર અને કોષવિભાજન',
  'ઉચ્ચકક્ષાની વનસ્પતિઓમાં પ્રકાશસંશ્લેષણ', 'વનસ્પતિઓમાં શ્વસન', 'વનસ્પતિ વૃદ્ધિ અને વિકાસ',
  'શ્વાસોચ્છ્વાસ અને વાયુઓનું વિનિમય', 'દેહજળ અને પરિવહન', 'ઉત્સર્ગ પેદાશો અને તેનો નિકાલ',
  'પ્રચલન અને હલનચલન', 'ચેતાકીય નિયંત્રણ અને સહનિયમન', 'રાસાયણિક સહનિયમન અને સંકલન',
  'સપુષ્પી વનસ્પતિઓમાં લિંગીપ્રજનન', 'માનવ પ્રજનન', 'પ્રજનનિક સ્વાસ્થ્ય',
  'આનુવંશિકતા અને ભિન્નતાના સિદ્ધાંતો', 'આનુવંશિકતાનો આણ્વિય આધાર', 'ઉદ્‌વિકાસ',
  'માનવ-સ્વાસ્થ્ય અને રોગો', 'માનવ-કલ્યાણમાં સૂક્ષ્મજીવો',
  'બાયોટેક્નોલોજી : સિદ્ધાંતો અને પ્રક્રિયાઓ', 'બાયોટેક્નોલોજી અને તેના પ્રયોજનો',
  'સજીવો અને વસ્તી', 'નિવસંત્ર', 'જૈવ-વિવિધતા અને સંરક્ષણ',
]
const GU_UNITS = Object.fromEntries([
  ...GU_PHYSICS_UNITS.map((name, i) => [courseUnitId('Physics', i + 1), name]),
  ...GU_BIOLOGY_UNITS.map((name, i) => [courseUnitId('Biology', i + 1), name]),
])

// Level names per practice unit id, in the same order as its levels.
// Multilevel and the CCT are added for every unit below rather than repeated.
const GU_LEVELS = {
  115: ['વિદ્યુતભાર અને કુલંબનો નિયમ', 'વિદ્યુતક્ષેત્ર અને ડાયપોલ', 'વિદ્યુત ફ્લક્સ અને ગૉસનો નિયમ'],
  116: ['વિદ્યુતસ્થિતિમાન અને સ્થિતિઊર્જા', 'વાહકો, કૅપેસિટર અને ડાઇઇલેક્ટ્રિક'],
  117: ['વિદ્યુતપ્રવાહ, ડ્રિફ્ટ વેગ અને ઓહ્મનો નિયમ', 'અવરોધ, અવરોધકતા અને જોડાણો', 'કોષ, emf અને આંતરિક અવરોધ', 'કિર્ચોફના નિયમો અને વ્હીટસ્ટન બ્રિજ', 'પોટેન્શિયોમીટર અને મીટરબ્રિજ', 'વિદ્યુત પાવર અને ઉષ્મીય અસર'],
  118: ['બાયો-સાવર્ટ અને ઍમ્પિયરનો નિયમ', 'ગતિમાન વિદ્યુતભાર અને વાહક પર બળ', 'લૂપ પર ટૉર્ક અને ગૅલ્વેનોમીટર'],
  119: ['ચુંબકીય ડાયપોલ અને પૃથ્વીનું ચુંબકત્વ', 'ચુંબકીય દ્રવ્યો'],
  120: ['ફેરેડે અને લેન્ઝના નિયમો', 'ગતિકીય emf અને ઘૂમરી પ્રવાહો', 'આત્મપ્રેરકત્વ અને અન્યોન્ય પ્રેરકત્વ'],
  121: ['AC પરિપથો અને અનુનાદ', 'AC માં પાવર અને ટ્રાન્સફૉર્મર'],
  122: ['વિદ્યુતચુંબકીય તરંગો અને ગુણધર્મો', 'વિદ્યુતચુંબકીય વર્ણપટ'],
  123: ['પરાવર્તન અને ગોળીય અરીસા', 'વક્રીભવન, પૂર્ણ આંતરિક પરાવર્તન અને પ્રિઝમ', 'લેન્સ અને લેન્સમેકરનું સૂત્ર', 'પ્રકાશીય ઉપકરણો'],
  124: ['વ્યતિકરણ (હાઇગેન્સ અને YDSE)', 'વિવર્તન અને ધ્રુવીભવન'],
  126: ['રધરફર્ડ અને બોહર મૉડેલ', 'હાઇડ્રોજન વર્ણપટ'],
  127: ['ન્યુક્લિયસ, દળક્ષતિ અને બંધનઊર્જા', 'રેડિયોઍક્ટિવિટી અને ન્યુક્લિયર પ્રક્રિયાઓ'],
  // Biology (practice unit 200 + n)
  201: ['સજીવ વિશ્વ'],
}
const GU_COMMON_LEVELS = {
  'Multilevel Questions': 'મલ્ટિલેવલ પ્રશ્નો',
  'Complete Chapter Test': 'સંપૂર્ણ પ્રકરણ ટેસ્ટ',
}

export function sectionName(section, medium) {
  return (medium === 'gu' && GU_SECTIONS[section]) || section
}

// `unit` is a syllabus unit ({ id: chapter number, name }) and `key` its
// practice unit id (courseUnitId).
export function unitName(unit, key, medium) {
  return (medium === 'gu' && GU_UNITS[key]) || unit.name
}

// "Unit 15: Electric Charges and Fields" / "એકમ 15: વિદ્યુતભારો અને ક્ષેત્રો"
export function unitTitle(unit, key, medium) {
  return `${neetT(medium).unit(unit.id)}: ${unitName(unit, key, medium)}`
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
