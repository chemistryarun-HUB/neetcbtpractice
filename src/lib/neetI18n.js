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
    // Mistake Copy
    mistakeCopy: 'Mistake Copy',
    mistakeIntro: 'Every question you got wrong or left unattempted. Find out why, then fix it.',
    mcPending: 'Pending',
    mcCleared: 'Cleared',
    mcByChapter: 'Chapter-wise',
    mcByTest: 'Test-wise',
    mcFilterAll: 'All',
    mcFilterWrong: 'Wrong',
    mcFilterSkipped: 'Skipped',
    mcFilterRepeat: 'Repeat',
    mcFilterNoType: 'No Error Type',
    mcImageQuestion: 'Question with image',
    mcWrongTimes: n => `Wrong × ${n}`,
    mcSkipped: 'Skipped',
    mcRepeat: '⚠ Repeat',
    mcOneCorrect: '1 of 2 correct',
    mcClearedOn: d => `✅ Cleared on ${d}`,
    mcChecked: '✔ Checked',
    mcCheckedBy: (who, d) => `✔ Checked by ${who} on ${d}`,
    mcKeyUpdated: 'Answer key updated: this is graded with the corrected key.',
    mcEmptyAll: 'No mistakes yet. Wrong and skipped questions from your level tests will appear here.',
    mcEmptyPending: '🎉 Nothing pending. All your mistakes are cleared.',
    mcEmptyCleared: 'Nothing cleared yet. Get a question right on 2 different days to clear it.',
    mcEmptyFilter: 'No questions match this filter.',
    mcChapterDone: (done, total) => `${done} of ${total} cleared`,
    mcAttempt: n => `Attempt #${n}`,
    mcMarks: (score, max) => `Marks ${score} / ${max}`,
    mcRule: 'A question is Cleared when you get it right on 2 different days. A wrong answer starts the count again. Re-attempts do not change your score or level unlocks.',
    mcReattemptBtn: 'Re-attempt',
    mcReady: n => `${n} question${n === 1 ? '' : 's'} ready to re-attempt`,
    mcNoneReady: 'All done for today. Come back tomorrow',
    mcCtaHint: 'Pick all, or by chapter, level, Error Type, wrong or skipped',
    mcSelectType: 'Select type of error',
    mcPickerTitle: 'Choose questions to re-attempt',
    mcPickerStatus: 'Wrong or skipped',
    mcPickerChapters: 'Chapters and levels',
    mcBoth: 'Both',
    mcAllTypes: 'All types of error',
    mcNotMarked: 'Error type not selected yet',
    mcAllChapters: 'All chapters',
    mcStart: n => `Start re-attempt · ${n} question${n === 1 ? '' : 's'}`,
    mcNoneSelected: 'No questions match. Change your selection',
    mcRightToday: n => `${n} already right today ${n === 1 ? 'is' : 'are'} not included. ${n === 1 ? 'It comes' : 'They come'} back tomorrow.`,
    mcClose: 'Close',
    mcLeaveConfirm: 'Leave this re-attempt? Your answers here will not be saved.',
    mcSummary: 'Your mistakes',
    mcErrorType: 'Type of Error',
    mcSaveFailed: 'Could not save. Please try again.',
    mcErrorTypes: { conceptual: 'Conceptual', calculation: 'Calculation', reading: 'Reading / Oversight', time: 'Time Mismanagement', guesswork: 'Guesswork', silly: 'Silly Mistake', other: 'Other' },
    mcRetestTitle: 'Mistake re-attempt',
    mcRetestMarks: 'No marks: this does not change your score or level unlocks',
    mcRetestConfirm: n => `${n} question${n === 1 ? ' is' : 's are'} unanswered. Submit anyway?`,
    mcResultTitle: 'Re-attempt result',
    mcResultCorrect: 'Right',
    mcResultWrong: 'Wrong',
    mcResultSkipped: 'Not answered',
    mcResultCleared: '✅ Cleared',
    mcResultOneDay: '1 of 2 correct: try again on another day',
    mcResultReset: 'Count starts again',
    mcBack: 'Back to Mistake Copy',
    mcPdf: 'Download PDF',
    mcPdfBusy: (done, total) => `Making PDF ${done} / ${total}`,
    mcPdfNone: 'No questions to put in the PDF.',
    mcPdfTooMany: n => `More than ${n} questions: use the PDF button on one chapter or test.`,
    mrStudent: 'Student Name',
    mrTest: 'Test Name',
    mrDate: 'Date of Test',
    mrSubject: 'Subject',
    mrMarks: 'Marks Obtained',
    mrQuestion: 'Question No.',
    mrMyAnswer: 'My Answer',
    mrCorrectAnswer: 'Correct Answer',
    mrNotAttempted: 'Not attempted',
    mrOption: n => `Option ${n}`,
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
    mistakeCopy: 'ભૂલોની નોટ',
    mistakeIntro: 'તમે ખોટા કરેલા અથવા છોડેલા બધા પ્રશ્નો. કારણ શોધો અને ભૂલ સુધારો.',
    mcPending: 'બાકી',
    mcCleared: 'સુધરેલા',
    mcByChapter: 'પ્રકરણ મુજબ',
    mcByTest: 'ટેસ્ટ મુજબ',
    mcFilterAll: 'બધા',
    mcFilterWrong: 'ખોટા',
    mcFilterSkipped: 'છોડેલા',
    mcFilterRepeat: 'ફરી ખોટા',
    mcFilterNoType: 'ભૂલનો પ્રકાર બાકી',
    mcImageQuestion: 'ચિત્રવાળો પ્રશ્ન',
    mcWrongTimes: n => `ખોટા × ${n}`,
    mcSkipped: 'છોડેલો',
    mcRepeat: '⚠ ફરી ખોટો',
    mcOneCorrect: '2 માંથી 1 વાર સાચો',
    mcClearedOn: d => `✅ ${d} ના રોજ સુધર્યો`,
    mcChecked: '✔ તપાસેલો',
    mcCheckedBy: (who, d) => `✔ ${who} દ્વારા ${d} ના રોજ તપાસેલો`,
    mcKeyUpdated: 'જવાબ સુધારાયો છે: આ પ્રશ્ન સુધારેલા જવાબ મુજબ ગણાયો છે.',
    mcEmptyAll: 'હજી કોઈ ભૂલ નથી. લેવલ ટેસ્ટના ખોટા અને છોડેલા પ્રશ્નો અહીં દેખાશે.',
    mcEmptyPending: '🎉 કંઈ બાકી નથી. તમારી બધી ભૂલો સુધરી ગઈ છે.',
    mcEmptyCleared: 'હજી કંઈ સુધર્યું નથી. પ્રશ્ન 2 અલગ દિવસે સાચો કરવાથી તે સુધરેલો ગણાશે.',
    mcEmptyFilter: 'આ ફિલ્ટરમાં કોઈ પ્રશ્ન નથી.',
    mcChapterDone: (done, total) => `${total} માંથી ${done} સુધર્યા`,
    mcAttempt: n => `પ્રયત્ન #${n}`,
    mcMarks: (score, max) => `ગુણ ${score} / ${max}`,
    mcRule: 'પ્રશ્ન 2 અલગ દિવસે સાચો કરવાથી તે સુધરેલો ગણાય છે. ખોટો થાય તો ગણતરી ફરી શરૂ થાય છે. ફરી પ્રયત્નથી તમારો સ્કોર કે લેવલ બદલાતાં નથી.',
    mcReattemptBtn: 'ફરી પ્રયત્ન',
    mcReady: n => `${n} પ્રશ્નોનો ફરી પ્રયત્ન કરી શકાય`,
    mcNoneReady: 'આજનું પૂરું થયું. કાલે પાછા આવો',
    mcCtaHint: 'બધા પસંદ કરો, અથવા પ્રકરણ, લેવલ, ભૂલનો પ્રકાર, ખોટા કે છોડેલા મુજબ',
    mcSelectType: 'ભૂલનો પ્રકાર પસંદ કરો',
    mcPickerTitle: 'ફરી પ્રયત્ન માટે પ્રશ્નો પસંદ કરો',
    mcPickerStatus: 'ખોટા કે છોડેલા',
    mcPickerChapters: 'પ્રકરણ અને લેવલ',
    mcBoth: 'બંને',
    mcAllTypes: 'ભૂલના બધા પ્રકાર',
    mcNotMarked: 'ભૂલનો પ્રકાર હજી પસંદ નથી કર્યો',
    mcAllChapters: 'બધાં પ્રકરણ',
    mcStart: n => `ફરી પ્રયત્ન શરૂ કરો · ${n} પ્રશ્નો`,
    mcNoneSelected: 'કોઈ પ્રશ્ન મળતો નથી. પસંદગી બદલો',
    mcRightToday: n => `આજે સાચા થયેલા ${n} પ્રશ્નો આમાં નથી. તે કાલે પાછા આવશે.`,
    mcClose: 'બંધ કરો',
    mcLeaveConfirm: 'આ ફરી પ્રયત્ન છોડી દેવો છે? તમારા જવાબો સેવ નહીં થાય.',
    mcSummary: 'તમારી ભૂલો',
    mcErrorType: 'ભૂલનો પ્રકાર',
    mcSaveFailed: 'સેવ ન થયું. ફરી પ્રયત્ન કરો.',
    mcErrorTypes: { conceptual: 'સંકલ્પનાની ભૂલ', calculation: 'ગણતરીની ભૂલ', reading: 'વાંચવામાં ભૂલ', time: 'સમયનું આયોજન', guesswork: 'અનુમાન', silly: 'નાની ભૂલ', other: 'અન્ય' },
    mcRetestTitle: 'ભૂલોનો ફરી પ્રયત્ન',
    mcRetestMarks: 'ગુણ નથી: આનાથી તમારો સ્કોર કે લેવલ બદલાતાં નથી',
    mcRetestConfirm: n => `${n} પ્રશ્નોના જવાબ બાકી છે. છતાં સબમિટ કરવું છે?`,
    mcResultTitle: 'ફરી પ્રયત્નનું પરિણામ',
    mcResultCorrect: 'સાચા',
    mcResultWrong: 'ખોટા',
    mcResultSkipped: 'જવાબ બાકી',
    mcResultCleared: '✅ સુધરી ગયો',
    mcResultOneDay: '2 માંથી 1 વાર સાચો: બીજા દિવસે ફરી પ્રયત્ન કરો',
    mcResultReset: 'ગણતરી ફરી શરૂ',
    mcBack: 'ભૂલોની નોટ પર પાછા',
    mcPdf: 'PDF ડાઉનલોડ',
    mcPdfBusy: (done, total) => `PDF બને છે ${done} / ${total}`,
    mcPdfNone: 'PDF માટે કોઈ પ્રશ્ન નથી.',
    mcPdfTooMany: n => `${n} થી વધુ પ્રશ્નો છે: એક પ્રકરણ કે ટેસ્ટના PDF બટનનો ઉપયોગ કરો.`,
    mrStudent: 'વિદ્યાર્થીનું નામ',
    mrTest: 'ટેસ્ટનું નામ',
    mrDate: 'ટેસ્ટની તારીખ',
    mrSubject: 'વિષય',
    mrMarks: 'મેળવેલા ગુણ',
    mrQuestion: 'પ્રશ્ન નં.',
    mrMyAnswer: 'મારો જવાબ',
    mrCorrectAnswer: 'સાચો જવાબ',
    mrNotAttempted: 'જવાબ આપ્યો નથી',
    mrOption: n => `વિકલ્પ ${n}`,
  },
}

export const neetT = medium => STRINGS[medium] || STRINGS.en

// Keyed by section heading (lib/subjects.js SYLLABUS_SECTIONS).
const GU_SECTIONS = {
  'Class 11': 'ધોરણ 11',
  'Class 12': 'ધોરણ 12',
  'Mechanics 1': 'યંત્રશાસ્ત્ર 1',
  'Mechanics 2': 'યંત્રશાસ્ત્ર 2',
  'Thermodynamics': 'થરમૉડાયનેમિક્સ',
  'Electromagnetism': 'વિદ્યુતચુંબકત્વ',
  'Optics': 'પ્રકાશશાસ્ત્ર',
  'Modern Physics': 'આધુનિક ભૌતિકશાસ્ત્ર',
  'Miscellaneous Physics': 'પરચૂરણ ભૌતિકશાસ્ત્ર',
}

// Keyed by practice unit id (courseUnitId: Physics unit n is 100 + n,
// Biology chapter n is 200 + n).
// Physics follows Arun's 32-unit list; Biology the GSEB Gujarati medium books.
const GU_PHYSICS_UNITS = [
  // Mechanics 1
  'ભૌતિકશાસ્ત્રમાં ગણિત', 'એકમો અને પરિમાણ', 'એક પરિમાણમાં ગતિ', 'દ્વિ-પરિમાણમાં ગતિ',
  'ગતિના નિયમો', 'કાર્ય, પાવર અને ઊર્જા', 'દ્રવ્યમાન કેન્દ્ર, વેગમાન અને સંઘાત', 'ચાકગતિ',
  'ગુરુત્વાકર્ષણ',
  // Mechanics 2
  'ઘન પદાર્થોના યાંત્રિક ગુણધર્મો', 'તરલના યાંત્રિક ગુણધર્મો', 'દોલનો', 'તરંગો અને ધ્વનિ',
  // Thermodynamics
  'દ્રવ્યના ઉષ્મીય ગુણધર્મો', 'થરમૉડાયનેમિક્સ', 'વાયુઓનો ગતિવાદ',
  // Electromagnetism
  'સ્થિત વિદ્યુતશાસ્ત્ર', 'કૅપેસિટન્સ', 'પ્રવાહ વિદ્યુત', 'દ્રવ્યના ચુંબકીય ગુણધર્મો',
  'વિદ્યુતપ્રવાહની ચુંબકીય અસરો', 'વિદ્યુતચુંબકીય પ્રેરણ', 'પ્રત્યાવર્તી પ્રવાહ',
  // Optics
  'કિરણ પ્રકાશશાસ્ત્ર', 'તરંગ પ્રકાશશાસ્ત્ર',
  // Modern Physics
  'દ્રવ્યની દ્વૈત પ્રકૃતિ', 'પરમાણુ ભૌતિકશાસ્ત્ર', 'ન્યુક્લિયર ભૌતિકશાસ્ત્ર',
  // Miscellaneous Physics
  'વિદ્યુતચુંબકીય તરંગો', 'સેમિકન્ડક્ટર', 'સંદેશાવ્યવહાર પ્રણાલી', 'પ્રાયોગિક ભૌતિકશાસ્ત્ર',
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
  102: ['એકમો અને પારિમાણિક વિશ્લેષણ', 'ત્રુટિ વિશ્લેષણ', 'માપન સાધનો'],
  117: ['વિદ્યુતભાર અને કુલંબનો નિયમ', 'વિદ્યુતક્ષેત્ર અને ડાયપોલ', 'વિદ્યુત ફ્લક્સ અને ગૉસનો નિયમ', 'વિદ્યુતસ્થિતિમાન અને સ્થિતિઊર્જા'],
  118: ['વાહકો, કૅપેસિટર અને ડાઇઇલેક્ટ્રિક'],
  119: ['વિદ્યુતપ્રવાહ, ડ્રિફ્ટ વેગ અને ઓહ્મનો નિયમ', 'અવરોધ, અવરોધકતા અને જોડાણો', 'કોષ, emf અને આંતરિક અવરોધ', 'કિર્ચોફના નિયમો અને વ્હીટસ્ટન બ્રિજ', 'પોટેન્શિયોમીટર અને મીટરબ્રિજ', 'વિદ્યુત પાવર અને ઉષ્મીય અસર'],
  120: ['ચુંબકીય ડાયપોલ અને પૃથ્વીનું ચુંબકત્વ', 'ચુંબકીય દ્રવ્યો'],
  121: ['બાયો-સાવર્ટ અને ઍમ્પિયરનો નિયમ', 'ગતિમાન વિદ્યુતભાર અને વાહક પર બળ', 'લૂપ પર ટૉર્ક અને ગૅલ્વેનોમીટર'],
  122: ['ફેરેડે અને લેન્ઝના નિયમો', 'ગતિકીય emf અને ઘૂમરી પ્રવાહો', 'આત્મપ્રેરકત્વ અને અન્યોન્ય પ્રેરકત્વ'],
  123: ['AC પરિપથો અને અનુનાદ', 'AC માં પાવર અને ટ્રાન્સફૉર્મર'],
  124: ['પરાવર્તન અને ગોળીય અરીસા', 'વક્રીભવન, પૂર્ણ આંતરિક પરાવર્તન અને પ્રિઝમ', 'લેન્સ અને લેન્સમેકરનું સૂત્ર', 'પ્રકાશીય ઉપકરણો'],
  125: ['વ્યતિકરણ (હાઇગેન્સ અને YDSE)', 'વિવર્તન અને ધ્રુવીભવન'],
  127: ['રધરફર્ડ અને બોહર મૉડેલ', 'હાઇડ્રોજન વર્ણપટ'],
  128: ['ન્યુક્લિયસ, દળક્ષતિ અને બંધનઊર્જા', 'રેડિયોઍક્ટિવિટી અને ન્યુક્લિયર પ્રક્રિયાઓ'],
  129: ['વિદ્યુતચુંબકીય તરંગો અને ગુણધર્મો', 'વિદ્યુતચુંબકીય વર્ણપટ'],
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

// "Unit 17: Electrostatics" / "એકમ 17: સ્થિત વિદ્યુતશાસ્ત્ર"
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
