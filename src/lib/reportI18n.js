// Every sentence a parent reads, in each language the report is offered in.
//
// These are written per language rather than translated string-by-string:
// Hindi and Gujarati put the verb last and mark politeness differently, so a
// literal translation of English sentence shapes reads stilted. Each block
// below is phrased the way that language would actually say it.
//
// Chapter and level NAMES stay in English throughout — that's how they appear
// in the app, in the lectures and in every NEET textbook, so translating them
// would make the report harder to match up with what the student sees.

export const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
]

const pct = n => `${Math.round(n)}%`

// ── English ──────────────────────────────────────────────────────────────
const en = {
  dir: 'ltr',
  fontStack: `'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
  reportTitle: 'Chapter Progress Report',
  alsoInThisLanguage: 'Also in English',
  brand: 'Computer based chemistry practice for NEET',
  levelsLine: n => `This chapter is divided into ${n} levels, arranged lecture-wise`,
  ago(d) {
    if (d == null) return '—'
    if (d <= 0) return 'today'
    if (d === 1) return 'yesterday'
    if (d < 30) return `${d} days ago`
    const m = Math.floor(d / 30)
    return m === 1 ? 'about a month ago' : `about ${m} months ago`
  },
  times(n) {
    const w = ['zero', 'once', 'twice', 'three times', 'four times', 'five times',
      'six times', 'seven times', 'eight times', 'nine times', 'ten times']
    return w[n] || `${n} times`
  },
  ordinal(n) {
    const w = ['', '1st', '2nd', '3rd']
    return w[n] || `${n}th`
  },
  status: {
    complete: 'Chapter complete', 'on-track': 'On track',
    stuck: 'Needs attention', paused: 'Paused', 'not-started': 'Not started',
  },
  headline(m) {
    const { latestClear: lc, nextLevel: nl, idleDays } = m.facts
    const who = (m.student.name || "").trim() || "The student"
    switch (m.status) {
      case 'not-started': return `${who} has not started this chapter yet. No test attempted so far.`
      case 'complete': return `${who} has cleared all ${m.unit.levelCount} levels. This chapter is complete.`
      case 'stuck': return `${lc ? `${who} cleared ${lc.badge}, ${this.ago(lc.days)}. ` : ''}${nl.badge} has been attempted ${this.times(nl.tries)}, but not cleared yet. Best score so far: ${pct(nl.bestPct)}.`
      case 'paused': return `${lc ? `Last cleared ${lc.badge}, ${this.ago(lc.days)}. ` : 'Started this unit, but no level cleared yet. '}There has been no practice in this unit for ${idleDays} days.`
      default: return lc
        ? `${who} cleared ${lc.badge}, ${this.ago(lc.days)}, in the ${this.ordinal(lc.onAttempt)} attempt, and is now working on ${nl ? nl.badge : 'the next level'}.`
        : `${who} has started practising, and is working towards ${nl ? nl.badge : 'the first level'}.`
    }
  },
  tiles: { cleared: 'levels cleared', questions: 'questions practised', tests: 'tests attempted', accuracy: 'accuracy', last: 'last practised' },
  levelByLevel: 'Level by level',
  levelState: {
    cleared: (t, l) => `Cleared ${t.ago(l.days)}${l.onAttempt > 1 ? `, on attempt ${l.onAttempt}` : ''}`,
    attempted: (t, l) => `Attempted ${t.times(l.tries)} · best ${pct(l.bestPct)}`,
    'not-reached': () => 'Not reached yet',
  },
  qsOf: (a, b) => `${a} of ${b} questions`,
  cctTitle: 'Complete Chapter Test',
  cctSub: n => `open from the start · covers all ${n} levels together`,
  cctQs: (a, b) => `${a} of ${b} questions attempted`,
  supportTitle: 'How parents can support',
  support: s => [
    `Please encourage daily practice of ${s.perTest} questions — that is one full test a day. Practising a little every day works far better than one long session in a week.`,
    `Once the faculty completes a lecture, that level should be cleared within ${s.clearWithinDays} days. Practising while the lecture is still fresh makes a big difference.`,
    `NEET is an exam of question practice, more than reading notes or watching videos. Understanding a topic and being able to answer questions on it are two different skills.`,
  ],
  howTitle: 'How to read this report',
  how: (s, n) => [
    `Each test has ${s.perTest} questions. Marking is the same as the real NEET exam: +${s.correct} for a correct answer, ${s.wrong} for a wrong answer, and 0 if left blank. So leaving a question blank is safer than guessing.`,
    `A level is "cleared" when the student scores ${s.firstBar}% or more on the first try. If they do not clear it, the pass mark is lowered for the next tries (down to ${s.easedBar}%). So trying again always helps.`,
    `Levels open one after another — clearing one opens the next. The Complete Chapter Test is open from the start and covers all ${n} levels together.`,
  ],
  msg(m, url) {
    const first = (m.student.name || '').trim().split(/\s+/)[0] || 'your child'
    const s = m.summary
    const date = m.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const L = [`Namaste! This is ${first}'s progress report for *${m.unit.label}* (NEET Chemistry), as on ${date}.`, '', this.headline(m), '']
    if (s.attempts > 0) {
      L.push(`• Levels cleared: ${s.levelsCleared} of ${s.ladderTotal}`)
      L.push(`• Practice done: ${s.attempts} test${s.attempts !== 1 ? 's' : ''}, ${s.questionsPractised} questions`)
      L.push(`• Accuracy: ${pct(s.accuracy)}`)
      L.push(`• Last practised: ${this.ago(s.lastActiveDays)}`, '')
    }
    L.push(`This unit has ${m.unit.levelCount} levels, arranged lecture-wise — each level follows one lecture taken by our chemistry faculty.`, '')
    L.push(`Please encourage daily practice of ${m.scheme.perTest} questions. NEET is an exam of question practice, more than reading notes or watching videos.`, '')
    L.push(`Full report: ${url}`, '', 'Please go through it with them. Happy to discuss anytime.')
    return L.join('\n')
  },
}

// ── Hindi ────────────────────────────────────────────────────────────────
const hi = {
  dir: 'ltr',
  fontStack: `'Nirmala UI', 'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif`,
  reportTitle: 'अध्याय प्रगति रिपोर्ट',
  alsoInThisLanguage: 'यह रिपोर्ट हिन्दी में आगे के पेज पर',
  brand: 'NEET के लिए कंप्यूटर आधारित केमिस्ट्री अभ्यास',
  levelsLine: n => `यह अध्याय ${n} लेवल में बँटा है, जो लेक्चर के क्रम में लगाए गए हैं`,
  ago(d) {
    if (d == null) return '—'
    if (d <= 0) return 'आज'
    if (d === 1) return 'कल'
    if (d < 30) return `${d} दिन पहले`
    const m = Math.floor(d / 30)
    return m === 1 ? 'लगभग एक महीना पहले' : `लगभग ${m} महीने पहले`
  },
  times(n) {
    if (n === 1) return 'एक बार'
    if (n === 2) return 'दो बार'
    if (n === 3) return 'तीन बार'
    if (n === 4) return 'चार बार'
    if (n === 5) return 'पाँच बार'
    return `${n} बार`
  },
  ordinal(n) {
    const w = ['', 'पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे', 'सातवें', 'आठवें', 'नौवें', 'दसवें']
    return w[n] || `${n}वें`
  },
  status: {
    complete: 'अध्याय पूरा', 'on-track': 'सही दिशा में',
    stuck: 'ध्यान देने की ज़रूरत', paused: 'अभ्यास रुका हुआ', 'not-started': 'शुरू नहीं किया',
  },
  headline(m) {
    const { latestClear: lc, nextLevel: nl, idleDays } = m.facts
    const who = (m.student.name || "").trim() || "The student"
    switch (m.status) {
      case 'not-started': return `${who} ने अभी यह अध्याय शुरू नहीं किया है। अब तक कोई टेस्ट नहीं दिया गया।`
      case 'complete': return `${who} ने सभी ${m.unit.levelCount} लेवल क्लियर कर लिए हैं। यह अध्याय पूरा हो गया है।`
      case 'stuck': return `${lc ? `${who} ने ${lc.badge}, ${this.ago(lc.days)} क्लियर किया था। ` : ''}${nl.badge} — ${this.times(nl.tries)} किया गया, लेकिन अभी क्लियर नहीं हुआ। अब तक का सबसे अच्छा स्कोर: ${pct(nl.bestPct)}।`
      case 'paused': return `${lc ? `आख़िरी बार ${lc.badge}, ${this.ago(lc.days)} क्लियर हुआ था। ` : 'यूनिट शुरू तो हुई, पर अभी कोई लेवल क्लियर नहीं हुआ। '}पिछले ${idleDays} दिनों से इस यूनिट में कोई अभ्यास नहीं हुआ है।`
      default: return lc
        ? `${who} ने ${lc.badge}, ${this.ago(lc.days)}, ${this.ordinal(lc.onAttempt)} प्रयास में क्लियर किया, और अब ${nl ? nl.badge : 'अगले लेवल'} पर काम कर रहे हैं।`
        : `${who} ने अभ्यास शुरू कर दिया है, और ${nl ? nl.badge : 'पहले लेवल'} की तैयारी कर रहे हैं।`
    }
  },
  tiles: { cleared: 'लेवल क्लियर', questions: 'प्रश्न हल किए', tests: 'टेस्ट दिए', accuracy: 'सटीकता', last: 'आख़िरी अभ्यास' },
  levelByLevel: 'लेवल के अनुसार प्रगति',
  levelState: {
    cleared: (t, l) => `${t.ago(l.days)} क्लियर${l.onAttempt > 1 ? `, प्रयास ${l.onAttempt} में` : ''}`,
    attempted: (t, l) => `${t.times(l.tries)} प्रयास · सर्वश्रेष्ठ ${pct(l.bestPct)}`,
    'not-reached': () => 'अभी तक नहीं पहुँचे',
  },
  qsOf: (a, b) => `${b} में से ${a} प्रश्न`,
  cctTitle: 'कम्प्लीट चैप्टर टेस्ट',
  cctSub: n => `शुरू से खुला · पूरे ${n} लेवल को कवर करता है`,
  cctQs: (a, b) => `${b} में से ${a} प्रश्न हल किए`,
  supportTitle: 'अभिभावक कैसे मदद कर सकते हैं',
  support: s => [
    `कृपया हर दिन ${s.perTest} प्रश्नों के अभ्यास के लिए प्रोत्साहित करें — यानी रोज़ एक पूरा टेस्ट। हफ़्ते में एक बार लंबी पढ़ाई से बेहतर है रोज़ थोड़ा-थोड़ा अभ्यास।`,
    `फैकल्टी का लेक्चर पूरा होने के बाद उस लेवल को ${s.clearWithinDays} दिन के अंदर क्लियर कर लेना चाहिए। लेक्चर ताज़ा रहते हुए अभ्यास करने से बहुत फ़र्क पड़ता है।`,
    `NEET नोट्स पढ़ने या वीडियो देखने से ज़्यादा प्रश्नों के अभ्यास की परीक्षा है। विषय समझ लेना और उस पर प्रश्न हल कर पाना — ये दो अलग बातें हैं।`,
  ],
  howTitle: 'यह रिपोर्ट कैसे पढ़ें',
  how: (s, n) => [
    `हर टेस्ट में ${s.perTest} प्रश्न होते हैं। मार्किंग असली NEET परीक्षा जैसी है: सही उत्तर पर +${s.correct}, ग़लत उत्तर पर ${s.wrong}, और खाली छोड़ने पर 0। इसलिए अंदाज़े से उत्तर देने के बजाय प्रश्न खाली छोड़ना बेहतर है।`,
    `कोई लेवल तब "क्लियर" माना जाता है जब पहले ही प्रयास में ${s.firstBar}% या उससे ज़्यादा अंक आएँ। अगर पहली बार में न हो, तो अगले प्रयासों में पास होने की सीमा घटा दी जाती है (${s.easedBar}% तक)। इसलिए दोबारा कोशिश करना हमेशा फ़ायदेमंद है।`,
    `लेवल एक के बाद एक खुलते हैं — एक क्लियर होने पर अगला खुलता है। कम्प्लीट चैप्टर टेस्ट शुरू से ही खुला रहता है और पूरे ${n} लेवल को एक साथ कवर करता है।`,
  ],
  msg(m, url) {
    const first = (m.student.name || '').trim().split(/\s+/)[0] || 'आपके बच्चे'
    const s = m.summary
    const date = m.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const L = [`नमस्ते! यह ${first} की *${m.unit.label}* (NEET केमिस्ट्री) की प्रगति रिपोर्ट है, दिनांक ${date}।`, '', this.headline(m), '']
    if (s.attempts > 0) {
      L.push(`• लेवल क्लियर: ${s.ladderTotal} में से ${s.levelsCleared}`)
      L.push(`• अभ्यास: ${s.attempts} टेस्ट, ${s.questionsPractised} प्रश्न`)
      L.push(`• सटीकता: ${pct(s.accuracy)}`)
      L.push(`• आख़िरी अभ्यास: ${this.ago(s.lastActiveDays)}`, '')
    }
    L.push(`यह यूनिट ${m.unit.levelCount} लेवल में बँटी है, जो लेक्चर के क्रम में लगाए गए हैं। हर लेवल हमारे केमिस्ट्री फैकल्टी के एक लेक्चर पर आधारित है।`, '')
    L.push(`कृपया रोज़ ${m.scheme.perTest} प्रश्नों के अभ्यास के लिए प्रोत्साहित करें। NEET नोट्स पढ़ने या वीडियो देखने से ज़्यादा प्रश्नों के अभ्यास की परीक्षा है।`, '')
    L.push(`पूरी रिपोर्ट: ${url}`, '', 'कृपया इसे उनके साथ बैठकर देखें। किसी भी समय बात कर सकते हैं।')
    return L.join('\n')
  },
}

// ── Gujarati ─────────────────────────────────────────────────────────────
const gu = {
  dir: 'ltr',
  fontStack: `'Nirmala UI', 'Noto Sans Gujarati', 'Shruti', 'Segoe UI', sans-serif`,
  reportTitle: 'પ્રકરણ પ્રગતિ અહેવાલ',
  alsoInThisLanguage: 'આ અહેવાલ ગુજરાતીમાં આગળના પાના પર',
  brand: 'NEET માટે કમ્પ્યુટર આધારિત કેમિસ્ટ્રી અભ્યાસ',
  levelsLine: n => `આ પ્રકરણ ${n} લેવલમાં વહેંચાયેલું છે, જે લેક્ચર પ્રમાણે ગોઠવેલા છે`,
  ago(d) {
    if (d == null) return '—'
    if (d <= 0) return 'આજે'
    if (d === 1) return 'ગઈકાલે'
    if (d < 30) return `${d} દિવસ પહેલાં`
    const m = Math.floor(d / 30)
    return m === 1 ? 'આશરે એક મહિના પહેલાં' : `આશરે ${m} મહિના પહેલાં`
  },
  times(n) {
    if (n === 1) return 'એક વાર'
    if (n === 2) return 'બે વાર'
    if (n === 3) return 'ત્રણ વાર'
    if (n === 4) return 'ચાર વાર'
    if (n === 5) return 'પાંચ વાર'
    return `${n} વાર`
  },
  ordinal(n) {
    const w = ['', 'પહેલા', 'બીજા', 'ત્રીજા', 'ચોથા', 'પાંચમા', 'છઠ્ઠા', 'સાતમા', 'આઠમા', 'નવમા', 'દસમા']
    return w[n] || `${n}મા`
  },
  status: {
    complete: 'પ્રકરણ પૂર્ણ', 'on-track': 'સાચી દિશામાં',
    stuck: 'ધ્યાન આપવાની જરૂર', paused: 'અભ્યાસ અટક્યો', 'not-started': 'શરૂ કર્યું નથી',
  },
  headline(m) {
    const { latestClear: lc, nextLevel: nl, idleDays } = m.facts
    const who = (m.student.name || "").trim() || "The student"
    switch (m.status) {
      case 'not-started': return `${who} એ હજી આ પ્રકરણ શરૂ કર્યું નથી. અત્યાર સુધી કોઈ ટેસ્ટ આપ્યો નથી.`
      case 'complete': return `${who} એ બધા ${m.unit.levelCount} લેવલ ક્લિયર કરી લીધા છે. આ પ્રકરણ પૂર્ણ થયું છે.`
      case 'stuck': return `${lc ? `${who} એ ${lc.badge}, ${this.ago(lc.days)} ક્લિયર કર્યું હતું. ` : ''}${nl.badge} — ${this.times(nl.tries)} પ્રયાસ કર્યો, પણ હજી ક્લિયર થયું નથી. અત્યાર સુધીનો શ્રેષ્ઠ સ્કોર: ${pct(nl.bestPct)}.`
      case 'paused': return `${lc ? `છેલ્લે ${lc.badge}, ${this.ago(lc.days)} ક્લિયર થયું હતું. ` : 'યુનિટ શરૂ થયું, પણ હજી કોઈ લેવલ ક્લિયર થયું નથી. '}છેલ્લા ${idleDays} દિવસથી આ યુનિટમાં કોઈ અભ્યાસ થયો નથી.`
      default: return lc
        ? `${who} એ ${lc.badge}, ${this.ago(lc.days)}, ${this.ordinal(lc.onAttempt)} પ્રયાસમાં ક્લિયર કર્યું, અને હવે ${nl ? nl.badge : 'આગળના લેવલ'} પર કામ કરે છે.`
        : `${who} એ અભ્યાસ શરૂ કરી દીધો છે, અને ${nl ? nl.badge : 'પહેલા લેવલ'} ની તૈયારી કરે છે.`
    }
  },
  tiles: { cleared: 'લેવલ ક્લિયર', questions: 'પ્રશ્નોનો અભ્યાસ', tests: 'ટેસ્ટ આપ્યા', accuracy: 'ચોકસાઈ', last: 'છેલ્લો અભ્યાસ' },
  levelByLevel: 'લેવલ પ્રમાણે પ્રગતિ',
  levelState: {
    cleared: (t, l) => `${t.ago(l.days)} ક્લિયર${l.onAttempt > 1 ? `, પ્રયાસ ${l.onAttempt} માં` : ''}`,
    attempted: (t, l) => `${t.times(l.tries)} પ્રયાસ · શ્રેષ્ઠ ${pct(l.bestPct)}`,
    'not-reached': () => 'હજી પહોંચ્યા નથી',
  },
  qsOf: (a, b) => `${b} માંથી ${a} પ્રશ્નો`,
  cctTitle: 'કમ્પ્લીટ ચેપ્ટર ટેસ્ટ',
  cctSub: n => `શરૂઆતથી ખુલ્લો · આખા ${n} લેવલને આવરી લે છે`,
  cctQs: (a, b) => `${b} માંથી ${a} પ્રશ્નોનો અભ્યાસ`,
  supportTitle: 'વાલી કઈ રીતે મદદ કરી શકે',
  support: s => [
    `કૃપા કરીને દરરોજ ${s.perTest} પ્રશ્નોના અભ્યાસ માટે પ્રોત્સાહિત કરો — એટલે કે રોજ એક આખો ટેસ્ટ. અઠવાડિયે એક વાર લાંબો અભ્યાસ કરવા કરતાં રોજ થોડો અભ્યાસ ઘણો સારો છે.`,
    `ફેકલ્ટીનું લેક્ચર પૂરું થયા પછી તે લેવલ ${s.clearWithinDays} દિવસમાં ક્લિયર કરી લેવું જોઈએ. લેક્ચર તાજું હોય ત્યારે અભ્યાસ કરવાથી ઘણો ફરક પડે છે.`,
    `NEET એ નોટ્સ વાંચવા કે વીડિયો જોવા કરતાં પ્રશ્નોના અભ્યાસની પરીક્ષા છે. વિષય સમજવો અને તેના પર પ્રશ્નો ઉકેલી શકવા — એ બે અલગ બાબતો છે.`,
  ],
  howTitle: 'આ અહેવાલ કઈ રીતે વાંચવો',
  how: (s, n) => [
    `દરેક ટેસ્ટમાં ${s.perTest} પ્રશ્નો હોય છે. માર્કિંગ ખરી NEET પરીક્ષા જેવું જ છે: સાચા જવાબ પર +${s.correct}, ખોટા જવાબ પર ${s.wrong}, અને ખાલી છોડવા પર 0. તેથી અટકળથી જવાબ આપવા કરતાં પ્રશ્ન ખાલી છોડવો વધુ સલામત છે.`,
    `કોઈ લેવલ ત્યારે "ક્લિયર" ગણાય જ્યારે પહેલા જ પ્રયાસમાં ${s.firstBar}% કે તેથી વધુ ગુણ આવે. જો પહેલી વારમાં ન થાય, તો પછીના પ્રયાસોમાં પાસ થવાની મર્યાદા ઘટાડવામાં આવે છે (${s.easedBar}% સુધી). તેથી ફરી પ્રયાસ કરવો હંમેશા ફાયદાકારક છે.`,
    `લેવલ એક પછી એક ખૂલે છે — એક ક્લિયર થાય એટલે આગળનું ખૂલે. કમ્પ્લીટ ચેપ્ટર ટેસ્ટ શરૂઆતથી જ ખુલ્લો હોય છે અને આખા ${n} લેવલને એકસાથે આવરી લે છે.`,
  ],
  msg(m, url) {
    const first = (m.student.name || '').trim().split(/\s+/)[0] || 'તમારા બાળક'
    const s = m.summary
    const date = m.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const L = [`નમસ્તે! આ ${first} નો *${m.unit.label}* (NEET કેમિસ્ટ્રી) નો પ્રગતિ અહેવાલ છે, તારીખ ${date}.`, '', this.headline(m), '']
    if (s.attempts > 0) {
      L.push(`• લેવલ ક્લિયર: ${s.ladderTotal} માંથી ${s.levelsCleared}`)
      L.push(`• અભ્યાસ: ${s.attempts} ટેસ્ટ, ${s.questionsPractised} પ્રશ્નો`)
      L.push(`• ચોકસાઈ: ${pct(s.accuracy)}`)
      L.push(`• છેલ્લો અભ્યાસ: ${this.ago(s.lastActiveDays)}`, '')
    }
    L.push(`આ યુનિટ ${m.unit.levelCount} લેવલમાં વહેંચાયેલું છે, જે લેક્ચર પ્રમાણે ગોઠવેલા છે. દરેક લેવલ આપણા કેમિસ્ટ્રી ફેકલ્ટીના એક લેક્ચર પર આધારિત છે.`, '')
    L.push(`કૃપા કરીને દરરોજ ${m.scheme.perTest} પ્રશ્નોના અભ્યાસ માટે પ્રોત્સાહિત કરો. NEET એ નોટ્સ વાંચવા કે વીડિયો જોવા કરતાં પ્રશ્નોના અભ્યાસની પરીક્ષા છે.`, '')
    L.push(`સંપૂર્ણ અહેવાલ: ${url}`, '', 'કૃપા કરીને તેમની સાથે બેસીને જુઓ. કોઈ પણ સમયે વાત કરી શકો છો.')
    return L.join('\n')
  },
}

export const T = { en, hi, gu }
export const t = lang => T[lang] || T.en
