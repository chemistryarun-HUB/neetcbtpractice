// Renders a student report model (see studentReport.js) into a PDF.
//
// Design brief: a parent opens this on a phone, in WhatsApp, probably in ten
// seconds between other things. So it leads with a plain-English verdict per
// chapter, uses colour to carry status at a glance, and keeps everything a
// parent can act on above the explanatory small print — never the reverse.
import { jsPDF } from 'jspdf'
import { unitHeadline, statusMeta } from './studentReport'

const INK = { r: 31, g: 41, b: 55 }
const MUTED = { r: 107, g: 114, b: 128 }
const BRAND = { r: 26, g: 86, b: 219 }
const GOOD = { r: 21, g: 128, b: 61 }
const WARN = { r: 180, g: 83, b: 9 }
const LINE = { r: 229, g: 231, b: 235 }

const A4 = { w: 210, h: 297 }
const M = 14                       // page margin
const CONTENT_W = A4.w - M * 2

function toneColor(tone) { return tone === 'good' ? GOOD : WARN }

export function buildReportPdf(model) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const set = (c) => doc.setTextColor(c.r, c.g, c.b)
  const fill = (c) => doc.setFillColor(c.r, c.g, c.b)
  const draw = (c) => doc.setDrawColor(c.r, c.g, c.b)

  // Starts a new page when the next block wouldn't fit, so a section never
  // splits across the fold with its heading orphaned on the previous page.
  function ensure(space) {
    if (y + space > A4.h - 18) {
      footer()
      doc.addPage()
      y = M
      return true
    }
    return false
  }

  function footer() {
    const page = doc.internal.getNumberOfPages()
    doc.setFontSize(7.5)
    set(MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text('NEETCBT — Chemistry practice for NEET', M, A4.h - 9)
    doc.text(`Page ${page}`, A4.w - M, A4.h - 9, { align: 'right' })
  }

  // ── Header band ──
  fill(BRAND)
  doc.rect(0, 0, A4.w, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Progress Report', M, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('NEETCBT · Chemistry practice for NEET', M, 20.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(model.student.name || '—', M, 29)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const meta = [
    model.student.roll_number ? `Roll ${model.student.roll_number}` : null,
    model.student.class || null,
    model.student.neet_year ? `NEET ${model.student.neet_year}` : null,
  ].filter(Boolean).join('   ·   ')
  doc.text(meta, A4.w - M, 29, { align: 'right' })
  doc.setFontSize(8)
  doc.text(
    model.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    A4.w - M, 20.5, { align: 'right' },
  )

  y = 44

  // ── Summary tiles ──
  const s = model.summary
  const tiles = [
    { big: `${s.totalLevelsCleared}`, small: `of ${s.totalLevelsAvailable} levels cleared` },
    { big: `${s.questionsPractised}`, small: 'questions practised' },
    { big: `${s.accuracy.toFixed(0)}%`, small: 'accuracy' },
    { big: s.lastActiveLabel, small: 'last practised', small_font: true },
  ]
  const tw = (CONTENT_W - 6 * 3) / 4
  tiles.forEach((t, i) => {
    const x = M + i * (tw + 6)
    doc.setFillColor(248, 250, 252)
    draw(LINE); doc.setLineWidth(0.3)
    doc.roundedRect(x, y, tw, 20, 2, 2, 'FD')
    set(BRAND)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(t.small_font ? 10 : 15)
    doc.text(String(t.big), x + tw / 2, y + (t.small_font ? 10 : 11), { align: 'center' })
    set(MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(t.small, x + tw / 2, y + 16, { align: 'center' })
  })
  y += 26

  // Benchmark line — average, never a rank (see studentReport.js).
  if (s.classAccuracy != null) {
    const diff = s.accuracy - s.classAccuracy
    const aboveBy = Math.abs(diff).toFixed(0)
    set(MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const line = Math.abs(diff) < 1
      ? `Class average accuracy is ${s.classAccuracy.toFixed(0)}% — right in line with the class.`
      : diff > 0
        ? `Class average accuracy is ${s.classAccuracy.toFixed(0)}% — ${aboveBy} points above the class average.`
        : `Class average accuracy is ${s.classAccuracy.toFixed(0)}% — ${aboveBy} points below the class average.`
    doc.text(line, M, y)
    y += 7
  }

  // ── Chapter-by-chapter ──
  ensure(20)
  set(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Chapter by chapter', M, y)
  y += 2
  draw(LINE); doc.setLineWidth(0.4)
  doc.line(M, y, A4.w - M, y)
  y += 6

  if (model.units.length === 0) {
    set(MUTED); doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
    doc.text('No chapters attempted yet.', M, y)
    y += 8
  }

  for (const u of model.units) {
    const meta2 = statusMeta(u.status)
    const headline = unitHeadline(u)
    const wrapped = doc.splitTextToSize(headline, CONTENT_W - 8)
    const blockH = 13 + wrapped.length * 4
    ensure(blockH + 4)

    // Status stripe down the left edge carries the verdict pre-attentively —
    // a parent skimming sees the amber blocks before reading a word.
    fill(toneColor(meta2.tone))
    doc.rect(M, y - 3.5, 1.4, blockH, 'F')

    set(INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(u.name, M + 4, y)

    // Status pill, right-aligned
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const pillW = doc.getTextWidth(meta2.label) + 6
    const c = toneColor(meta2.tone)
    doc.setFillColor(c.r, c.g, c.b)
    doc.roundedRect(A4.w - M - pillW, y - 3.6, pillW, 5.2, 1.2, 1.2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(meta2.label, A4.w - M - pillW / 2, y, { align: 'center' })

    y += 4.5
    set(MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(wrapped, M + 4, y)
    y += wrapped.length * 4

    // Progress bar for the sequential ladder
    const barW = CONTENT_W - 8
    const pct = u.ladderTotal > 0 ? u.clearedCount / u.ladderTotal : 0
    doc.setFillColor(233, 236, 241)
    doc.roundedRect(M + 4, y, barW, 2.6, 1.3, 1.3, 'F')
    if (pct > 0) {
      fill(toneColor(meta2.tone))
      doc.roundedRect(M + 4, y, Math.max(barW * pct, 2), 2.6, 1.3, 1.3, 'F')
    }
    y += 5
    set(MUTED)
    doc.setFontSize(7.5)
    const bits = [
      `${u.clearedCount} of ${u.ladderTotal} levels`,
      `${u.attempts} test${u.attempts !== 1 ? 's' : ''}`,
      `${u.questionsDone} questions`,
      `${u.accuracy.toFixed(0)}% accuracy`,
    ]
    if (u.cctCleared) bits.push('Chapter test cleared')
    doc.text(bits.join('   ·   '), M + 4, y)
    y += 7
  }

  // ── What to focus on next ──
  ensure(30)
  y += 2
  set(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('What to focus on next', M, y)
  y += 2
  draw(LINE); doc.setLineWidth(0.4)
  doc.line(M, y, A4.w - M, y)
  y += 6

  model.actions.forEach((a, i) => {
    const wrapped = doc.splitTextToSize(a, CONTENT_W - 8)
    ensure(wrapped.length * 4.4 + 4)
    fill(BRAND)
    doc.circle(M + 1.6, y - 1.2, 1.6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(String(i + 1), M + 1.6, y - 0.1, { align: 'center' })
    set(INK)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(wrapped, M + 6, y)
    y += wrapped.length * 4.4 + 2.5
  })

  // ── How to read this ──
  ensure(34)
  y += 4
  doc.setFillColor(248, 250, 252)
  draw(LINE); doc.setLineWidth(0.3)
  const sc = model.scheme
  const explain = [
    `Each test is ${sc.perTest} questions, marked like the real NEET exam: +${sc.correct} for a correct answer, ${sc.wrong} for a wrong one, 0 for one left blank.`,
    `A level counts as "cleared" when the student scores at least ${sc.firstBar}% on their first try. If they don't clear it, the bar eases on later attempts (down to ${sc.easedBar}%), so persistence is rewarded rather than punished.`,
    'Levels unlock in order — each one opens the next. The Chapter Test is open from the start and mixes questions from the whole chapter.',
  ]
  const lines = explain.flatMap(t => doc.splitTextToSize(t, CONTENT_W - 8))
  const boxH = 8 + lines.length * 3.8
  doc.roundedRect(M, y, CONTENT_W, boxH, 2, 2, 'FD')
  set(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('How to read this report', M + 4, y + 5.5)
  set(MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(lines, M + 4, y + 10)
  y += boxH + 6

  footer()
  return doc
}

export function reportPdfBlob(model) {
  return buildReportPdf(model).output('blob')
}

export function reportFileName(model) {
  const safe = (model.student.name || 'student').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const d = model.generatedAt.toISOString().slice(0, 10)
  return `${safe}-progress-${d}.pdf`
}
