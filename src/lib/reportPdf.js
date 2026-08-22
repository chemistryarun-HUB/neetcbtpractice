// Turns the report HTML into a PDF by photographing it with html2canvas and
// placing the image into a jsPDF page.
//
// Why not draw the PDF directly: jsPDF's core fonts are Latin-only, and even
// with a Devanagari or Gujarati font embedded it performs no OpenType shaping,
// so matras and conjuncts come out in the wrong order (कि renders as क ि).
// The browser shapes those scripts correctly, so rendering the markup and
// capturing it is the only way to get Hindi and Gujarati right client-side.
// The cost is raster rather than selectable text, which is a fair trade for a
// one-page report read on a phone.
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { buildReportHtml, REPORT_WIDTH_PX } from './reportHtml'
import { t } from './reportI18n'

const A4 = { w: 210, h: 297 }   // mm

/**
 * Renders the report offscreen and returns a PDF Blob.
 * Must run in a browser — html2canvas needs a live DOM.
 */
export async function reportPdfBlob(model, lang = 'en') {
  const host = document.createElement('div')
  // Positioned offscreen rather than display:none — html2canvas cannot measure
  // a hidden element, so it has to be laid out but out of sight.
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${REPORT_WIDTH_PX}px;background:#fff;z-index:-1;`
  const shell = document.createElement('div')
  shell.innerHTML = buildReportHtml(model, lang)
  // innerHTML of a full document keeps the <style>; move body children up so
  // the markup lays out inside our host.
  host.appendChild(shell)
  document.body.appendChild(host)

  try {
    // Give the browser a frame to apply fonts and gradients before capture,
    // and wait on webfont readiness where the API exists — capturing too early
    // renders Devanagari in a fallback face.
    if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* not fatal */ } }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    const canvas = await html2canvas(shell, {
      scale: 2,                 // 2x keeps small type crisp without bloating the file
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: REPORT_WIDTH_PX,
    })

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const imgW = A4.w
    const imgH = (canvas.height / canvas.width) * imgW
    const pageH = A4.h

    if (imgH <= pageH) {
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST')
    } else {
      // Taller than one page: slice the canvas rather than scaling the whole
      // report down, so type stays the same size across pages.
      const pxPerMm = canvas.width / imgW
      const sliceH = Math.floor(pageH * pxPerMm)
      for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
        const h = Math.min(sliceH, canvas.height - y)
        const part = document.createElement('canvas')
        part.width = canvas.width
        part.height = h
        part.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
        if (page > 0) doc.addPage()
        doc.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, h / pxPerMm, undefined, 'FAST')
      }
    }
    return doc.output('blob')
  } finally {
    document.body.removeChild(host)
  }
}

export function reportFileName(model, lang = 'en') {
  const clean = x => (x || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const suffix = lang === 'en' ? '' : `-${lang}`
  return `${clean(model.student.name) || 'student'}-${clean(model.unit.name).slice(0, 32)}${suffix}-${model.generatedAt.toISOString().slice(0, 10)}.pdf`
}

export function reportMessage(model, url, lang = 'en') {
  return t(lang).msg(model, url)
}
