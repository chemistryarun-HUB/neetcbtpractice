// Turns the report HTML into a PDF carrying every language, one after another.
//
// Why not draw the PDF directly: jsPDF's core fonts are Latin-only, and even
// with a Devanagari or Gujarati font embedded it performs no OpenType shaping,
// so matras and conjuncts come out in the wrong order (कि renders as क ि).
// The browser shapes those scripts correctly, so rendering the markup and
// capturing it is the only way to get Hindi and Gujarati right client-side.
// The cost is raster rather than selectable text, a fair trade for a one-page
// report read on a phone.
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { buildReportHtml, REPORT_WIDTH_PX } from './reportHtml'
import { t } from './reportI18n'

const A4 = { w: 210, h: 297 }   // mm

// Order matters — English first, then Hindi, then Gujarati.
export const REPORT_LANGS = ['en', 'hi', 'gu']

// Renders one language offscreen and returns its canvas. Positioned offscreen
// rather than display:none — html2canvas cannot measure a hidden element, so
// it has to be laid out but out of sight.
async function renderLang(model, lang, langHint) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${REPORT_WIDTH_PX}px;background:#fff;z-index:-1;`
  const shell = document.createElement('div')
  shell.innerHTML = buildReportHtml(model, lang, { langHint })
  host.appendChild(shell)
  document.body.appendChild(host)
  try {
    // Capturing before webfonts settle renders Devanagari in a fallback face,
    // so wait for font readiness and give layout a couple of frames.
    //
    // Both waits are raced against a timer, because neither is guaranteed to
    // settle: requestAnimationFrame does NOT fire while a tab is hidden, so an
    // admin who clicks send and switches tabs — which is exactly what happens,
    // since sending opens WhatsApp in a new tab — would otherwise hang here
    // forever, with the spinner stuck and no error. Proceeding a few frames
    // early is harmless; hanging is not.
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise(r => setTimeout(r, 3000)),
    ]).catch(() => {})
    await Promise.race([
      new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
      new Promise(r => setTimeout(r, 300)),
    ])
    return await html2canvas(shell, {
      scale: 2,                 // keeps small type crisp without bloating the file
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: REPORT_WIDTH_PX,
    })
  } finally {
    document.body.removeChild(host)
  }
}

// Places a canvas onto the doc, starting a new page, and slicing if the
// content is taller than one page rather than scaling it down — type stays
// the same size across pages.
// A page of this report is almost exactly A4-shaped, so its height lands within
// a couple of pixels of the page either way. Without a tolerance it overflows
// by ~2px and slices off a nearly blank page — in a three-language document
// that means a blank sheet wedged between English and Hindi. Anything within
// 8% is scaled down to fit instead; the shrink is imperceptible and far better
// than a stray page.
const FIT_TOLERANCE = 1.08

function placeCanvas(doc, canvas, isFirstPage) {
  const imgW = A4.w
  const imgH = (canvas.height / canvas.width) * imgW
  if (!isFirstPage) doc.addPage()
  if (imgH <= A4.h) {
    doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST')
    return
  }
  if (imgH <= A4.h * FIT_TOLERANCE) {
    const w = imgW * (A4.h / imgH)
    doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', (A4.w - w) / 2, 0, w, A4.h, undefined, 'FAST')
    return
  }
  const pxPerMm = canvas.width / imgW
  const sliceH = Math.floor(A4.h * pxPerMm)
  for (let y = 0, part = 0; y < canvas.height; y += sliceH, part++) {
    const h = Math.min(sliceH, canvas.height - y)
    const c = document.createElement('canvas')
    c.width = canvas.width
    c.height = h
    c.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (part > 0) doc.addPage()
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, imgW, h / pxPerMm, undefined, 'FAST')
  }
}

/**
 * One PDF containing the report in every language, English first.
 *
 * A single file rather than three means one upload, one link, and a parent who
 * reads only Gujarati doesn't need to be sent a different file from the one
 * their spouse reads.
 *
 * Must run in a browser — html2canvas needs a live DOM.
 */
export async function reportPdfBlob(model) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  for (let i = 0; i < REPORT_LANGS.length; i++) {
    const lang = REPORT_LANGS[i]
    // Only the first page advertises the other languages — by the time a
    // reader is on the Hindi page they've already found their language.
    const hint = i === 0 ? REPORT_LANGS.slice(1).map(l => t(l).alsoInThisLanguage).join('   ·   ') : null
    const canvas = await renderLang(model, lang, hint)
    placeCanvas(doc, canvas, i === 0)
  }
  return doc.output('blob')
}

export function reportFileName(model) {
  const clean = x => (x || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${clean(model.student.name) || 'student'}-${clean(model.unit.name).slice(0, 32)}-${model.generatedAt.toISOString().slice(0, 10)}.pdf`
}

export function reportMessage(model, url, lang = 'en') {
  return t(lang).msg(model, url)
}
