// Renders a chapter progress report (see studentReport.js) into a PDF.
//
// Design brief: a parent opens this on a phone, inside WhatsApp, in ten
// seconds between other things. So it leads with a plain-English verdict,
// carries status in colour so the shape is readable before a word is, and
// keeps everything actionable above the explanatory small print.
import { jsPDF } from 'jspdf'
import { statusMeta, timesWord } from './studentReport'

const INK = { r: 31, g: 41, b: 55 }
const MUTED = { r: 107, g: 114, b: 128 }
const BRAND = { r: 26, g: 86, b: 219 }
const GOOD = { r: 21, g: 128, b: 61 }
const WARN = { r: 180, g: 83, b: 9 }
const FAINT = { r: 156, g: 163, b: 175 }
const LINE = { r: 229, g: 231, b: 235 }

const A4 = { w: 210, h: 297 }
const M = 14
const CONTENT_W = A4.w - M * 2

const toneColor = tone => (tone === 'good' ? GOOD : WARN)

export function buildReportPdf(model) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0
  const set = c => doc.setTextColor(c.r, c.g, c.b)
  const fill = c => doc.setFillColor(c.r, c.g, c.b)
  const draw = c => doc.setDrawColor(c.r, c.g, c.b)

  function footer() {
    doc.setFontSize(7.5); set(MUTED); doc.setFont('helvetica', 'normal')
    doc.text('NEETCBT — Chemistry practice for NEET', M, A4.h - 9)
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, A4.w - M, A4.h - 9, { align: 'right' })
  }
  function ensure(space) {
    if (y + space > A4.h - 18) { footer(); doc.addPage(); y = M }
  }
  function heading(text) {
    ensure(16)
    set(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(text, M, y); y += 2
    draw(LINE); doc.setLineWidth(0.4); doc.line(M, y, A4.w - M, y); y += 6
  }

  // ── Header band ──
  fill(BRAND)
  doc.rect(0, 0, A4.w, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  doc.text('NEETCBT · Chemistry practice for NEET', M, 11)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('Chapter Progress Report', M, 19.5)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text(model.student.name || '—', M, 30)
  // Roll number is deliberately not printed: a parent knows their own child,
  // and it's an app login identifier that only adds clutter to a report meant
  // to be read in ten seconds.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  const meta = [model.student.class, model.student.neet_year ? `NEET ${model.student.neet_year}` : null]
    .filter(Boolean).join('   ·   ')
  if (meta) doc.text(meta, M, 34.5)
  doc.setFontSize(8)
  doc.text(
    model.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    A4.w - M, 11, { align: 'right' },
  )
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
  const chapter = doc.splitTextToSize(model.unit.label, 96)
  doc.text(chapter, A4.w - M, 20.5, { align: 'right' })

  y = 46

  // ── Verdict band: the one sentence that must land ──
  const sm = statusMeta(model.status)
  const tone = toneColor(sm.tone)
  const hl = doc.splitTextToSize(model.headline, CONTENT_W - 12)
  const bandH = 11 + hl.length * 4.6
  doc.setFillColor(248, 250, 252)
  draw(LINE); doc.setLineWidth(0.3)
  doc.roundedRect(M, y, CONTENT_W, bandH, 2, 2, 'FD')
  fill(tone)
  doc.rect(M, y, 1.6, bandH, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  const pillW = doc.getTextWidth(sm.label) + 6
  doc.roundedRect(M + 5, y + 3, pillW, 5.4, 1.3, 1.3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(sm.label, M + 5 + pillW / 2, y + 6.8, { align: 'center' })
  set(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
  doc.text(hl, M + 5, y + 13)
  y += bandH + 7

  // ── Summary tiles ──
  const s = model.summary
  const tiles = [
    { big: `${s.levelsCleared} / ${s.ladderTotal}`, small: 'levels cleared' },
    { big: `${s.questionsPractised}`, small: 'questions practised' },
    { big: `${s.accuracy.toFixed(0)}%`, small: 'accuracy' },
    { big: s.lastActiveLabel, small: 'last practised', tight: true },
  ]
  const tw = (CONTENT_W - 18) / 4
  tiles.forEach((t, i) => {
    const x = M + i * (tw + 6)
    doc.setFillColor(248, 250, 252); draw(LINE); doc.setLineWidth(0.3)
    doc.roundedRect(x, y, tw, 20, 2, 2, 'FD')
    set(BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(t.tight ? 10 : 14)
    doc.text(String(t.big), x + tw / 2, y + 11, { align: 'center' })
    set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text(t.small, x + tw / 2, y + 16.2, { align: 'center' })
  })
  y += 25

  // Benchmark: an average, never a rank. A rank tells a parent their child is
  // 47th, which shames without informing.
  if (s.classAccuracy != null && s.attempts > 0) {
    const diff = s.accuracy - s.classAccuracy
    set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    doc.text(
      Math.abs(diff) < 1
        ? `Class average in this chapter is ${s.classAccuracy.toFixed(0)}% — right in line with the class.`
        : `Class average in this chapter is ${s.classAccuracy.toFixed(0)}% — ${Math.abs(diff).toFixed(0)} points ${diff > 0 ? 'above' : 'below'} it.`,
      M, y,
    )
    y += 7
  }

  // ── Level by level ──
  heading('Level by level')
  // States the shape of the unit before the table, so a parent knows what
  // they're looking at — and names the lectures, which is the single most
  // useful thing a parent can act on when their child is stuck.
  ensure(12)
  set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  const intro = doc.splitTextToSize(
    `This unit is divided into ${model.unit.levelCount} levels. Each level has its own video lecture by our chemistry faculty, available in the app. A level opens only after the level before it is cleared.`,
    CONTENT_W,
  )
  doc.text(intro, M, y)
  y += intro.length * 3.9 + 3

  const rowH = 8.4
  for (const l of model.levels) {
    ensure(rowH + 2)
    const isCleared = l.state === 'cleared'
    const isTried = l.state === 'attempted'
    const c = isCleared ? GOOD : isTried ? WARN : FAINT

    fill(c)
    if (isCleared) doc.circle(M + 2, y - 1, 1.7, 'F')
    else { draw(c); doc.setLineWidth(0.4); doc.circle(M + 2, y - 1, 1.7, 'S') }

    set(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text(l.badge, M + 6, y)
    set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(doc.splitTextToSize(l.name, 52)[0], M + 22, y)

    // Status phrase — the "cleared Level 2 five days ago, on attempt 2" line.
    let phrase
    if (isCleared) phrase = `Cleared ${l.ago}${l.onAttempt > 1 ? `, on attempt ${l.onAttempt}` : ''}`
    else if (isTried) phrase = `Attempted ${timesWord(l.tries)} · best ${l.bestPct.toFixed(0)}%`
    else phrase = 'Not reached yet'
    set(isCleared ? GOOD : isTried ? WARN : FAINT)
    doc.setFont('helvetica', isCleared || isTried ? 'bold' : 'normal'); doc.setFontSize(8)
    doc.text(phrase, M + 80, y)

    if (l.seen != null && l.total != null && l.total > 0) {
      set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      doc.text(`${l.seen} of ${l.total} questions`, A4.w - M, y, { align: 'right' })
    }
    y += rowH
  }

  // Chapter test reported apart from the ladder — it's open from day one, so
  // listing it as a rung would misrepresent how far they've climbed.
  if (model.cct) {
    ensure(rowH + 6)
    y += 1.5
    draw(LINE); doc.setLineWidth(0.3); doc.line(M, y - 3.5, A4.w - M, y - 3.5)
    const done = model.cct.state === 'cleared'
    set(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text('Complete Chapter Test', M + 6, y + 1)
    set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text(`open from the start · covers all ${model.unit.levelCount} levels`, M + 48, y + 1)
    set(done ? GOOD : FAINT); doc.setFont('helvetica', done ? 'bold' : 'normal'); doc.setFontSize(8)
    doc.text(done ? 'Cleared' : model.cct.tries > 0 ? `Attempted ${timesWord(model.cct.tries)}` : 'Not attempted', M + 105, y + 1)
    if (model.cct.seen != null && model.cct.total) {
      set(MUTED); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
      doc.text(`${model.cct.seen} of ${model.cct.total} questions`, A4.w - M, y + 1, { align: 'right' })
    }
    y += rowH + 1
  }
  y += 4

  // ── What will help now ──
  if (model.actions.length) {
    heading('What will help now')
    model.actions.forEach((a, i) => {
      const wrapped = doc.splitTextToSize(a, CONTENT_W - 8)
      ensure(wrapped.length * 4.4 + 4)
      fill(BRAND); doc.circle(M + 1.8, y - 1.2, 1.8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5)
      doc.text(String(i + 1), M + 1.8, y - 0.1, { align: 'center' })
      set(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(wrapped, M + 6.5, y)
      y += wrapped.length * 4.4 + 2.5
    })
    y += 3
  }

  // ── How to read this ──
  const sc = model.scheme
  const explain = [
    `Each test has ${sc.perTest} questions. Marking is the same as the real NEET exam: +${sc.correct} for a correct answer, ${sc.wrong} for a wrong answer, and 0 if left blank. So leaving a question blank is safer than guessing.`,
    `A level is "cleared" when the student scores ${sc.firstBar}% or more on the first try. If they do not clear it, the pass mark is lowered for the next tries (down to ${sc.easedBar}%). So trying again always helps.`,
    `Levels open one after another — clearing one opens the next. The Complete Chapter Test is open from the start and covers all ${model.unit.levelCount} levels together.`,
  ]
  const lines = explain.flatMap(t => doc.splitTextToSize(t, CONTENT_W - 8))
  const boxH = 9 + lines.length * 3.8
  ensure(boxH + 4)
  doc.setFillColor(248, 250, 252); draw(LINE); doc.setLineWidth(0.3)
  doc.roundedRect(M, y, CONTENT_W, boxH, 2, 2, 'FD')
  set(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('How to read this report', M + 4, y + 6)
  set(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text(lines, M + 4, y + 10.5)
  y += boxH + 6

  footer()
  return doc
}

export function reportPdfBlob(model) {
  return buildReportPdf(model).output('blob')
}

export function reportFileName(model) {
  const clean = t => (t || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${clean(model.student.name) || 'student'}-${clean(model.unit.name).slice(0, 32)}-${model.generatedAt.toISOString().slice(0, 10)}.pdf`
}
