// The Mistake Copy as a PDF: one header per test, then each question with its
// options and Error Type.
//
// Captured with html2canvas like the GSEB paper PDF, for the same reason: the
// browser shapes Gujarati and KaTeX correctly, jsPDF on its own can't.
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ensureKatex } from '../components/shared/MathText'
import QuestionView from '../components/shared/QuestionView'
import { correctOptionKey } from './questionOptions'
import { orderOptionsForReview } from './optionShuffle'
import { groupByTest, testDate, testMarks } from './mistakeCopy'
import { levelBadgeT, neetT, unitName } from './neetI18n'
import { fromCourseUnitId, practiceUnitName } from './subjects'

// A4 at 96 px per inch.
const PAGE = { w: 794, h: 1123, margin: 38, foot: 26 }
const INNER_H = PAGE.h - 2 * PAGE.margin - PAGE.foot
const SCALE = 2

function isChosenBy(selected) {
  return opt => !!selected && (selected === opt.key || (opt.text !== '' && selected === opt.text))
}

function answerLabel(options, isChosen, t) {
  const i = options.findIndex(isChosen)
  return i < 0 ? t.mrNotAttempted : t.mrOption(i + 1)
}

function TestHeader({ student, group, medium, t }) {
  const { attempt } = group.test
  const { unit } = fromCourseUnitId(group.unitId)
  const name = `${t.unit(unit)} · ${unitName({ name: practiceUnitName(group.unitId) }, group.unitId, medium)} · ${levelBadgeT(group.unitId, attempt.level, medium)} · ${t.mcAttempt(group.test.position)}`
  const marks = testMarks(attempt)
  return (
    <div className="mr-head">
      <div className="mr-title">{t.mistakeCopy}</div>
      <div className="mr-info">
        <div><span>{t.mrStudent}:</span> {student.name}</div>
        <div><span>{t.mrDate}:</span> {testDate(attempt)}</div>
        <div className="mr-wide"><span>{t.mrTest}:</span> {name}</div>
        <div><span>{t.mrSubject}:</span> {t.subject[group.subject] || group.subject}</div>
        <div><span>{t.mrMarks}:</span> {marks.score} / {marks.max}</div>
      </div>
    </div>
  )
}

function QuestionBlock({ item, number, t, reveal }) {
  const options = orderOptionsForReview(item.q, item.lastMistake.optionOrder)
  const chosen = isChosenBy(item.lastMistake.selected)
  const correctKey = correctOptionKey(item.q)
  const errorType = item.entry?.error_type
  return (
    <div className="mr-question">
      <div className="mr-label">{t.mrQuestion} {number} <code>{item.q.qid}</code></div>
      <QuestionView q={item.q} mode={reveal ? 'review' : 'student'} size="compact" options={options} isChosen={chosen} />
      {reveal && (
        <div className="mr-answers">
          <div><span>{t.mrMyAnswer}:</span> {answerLabel(options, chosen, t)}</div>
          <div><span>{t.mrCorrectAnswer}:</span> {answerLabel(options, o => o.key === correctKey, t)}</div>
        </div>
      )}
      <div className="mr-error"><span>{t.mcErrorType}:</span> {errorType ? t.mcErrorTypes[errorType] : '—'}</div>
    </div>
  )
}

async function settle(el) {
  el.getBoundingClientRect()
  const imgs = [...el.querySelectorAll('img')]
  await Promise.race([
    Promise.all([document.fonts?.ready, ...imgs.map(img => img.decode().catch(() => {}))]),
    new Promise(r => setTimeout(r, 10000)),
  ])
  await new Promise(r => setTimeout(r, 30))
}

// `reveal` is the teacher's copy. A student's sheet leaves both answers out, same
// as the question card on screen.
export async function saveMistakePdf({ student, items, medium, reveal = false, onProgress }) {
  const t = neetT(medium)
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas'), ensureKatex()])

  // Oldest test first. The header stays glued to its first question, so a page
  // never ends on a header alone.
  const blocks = []
  for (const group of groupByTest(items).reverse()) {
    group.items.forEach((item, i) => {
      blocks.push(
        <div key={`${group.key}-${item.q.id}`}>
          {i === 0 && <TestHeader student={student} group={group} medium={medium} t={t} />}
          <QuestionBlock item={item} number={i + 1} t={t} reveal={reveal} />
        </div>,
      )
    })
  }

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(
      <div className="mr" style={{ width: PAGE.w - 2 * PAGE.margin }} lang={medium}>
        {blocks.map((block, i) => <div key={i} data-i={i} className="mr-block">{block}</div>)}
      </div>
    ))
    await settle(host)

    const nodes = [...host.querySelectorAll('[data-i]')]
    const pages = [[]]
    let used = 0
    for (const node of nodes) {
      const height = node.getBoundingClientRect().height
      if (used + height > INNER_H && pages[pages.length - 1].length) {
        pages.push([])
        used = 0
      }
      pages[pages.length - 1].push(node)
      used += height
    }

    const pageEls = pages.map((page, p) => {
      const el = document.createElement('div')
      el.className = 'mr mr-page'
      el.lang = medium
      el.style.cssText = `width:${PAGE.w}px;height:${PAGE.h}px;padding:${PAGE.margin}px;box-sizing:border-box;position:relative;overflow:hidden;`
      for (const node of page) el.appendChild(node.cloneNode(true))
      const foot = document.createElement('div')
      foot.className = 'mr-foot'
      foot.textContent = `${student.name}   ·   ${p + 1} / ${pages.length}`
      el.appendChild(foot)
      return el
    })
    root.unmount() // html2canvas copies the whole document per page: keep it small
    host.replaceChildren()

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    onProgress?.(0, pageEls.length)
    for (let p = 0; p < pageEls.length; p++) {
      const el = pageEls[p]
      host.appendChild(el)
      await settle(el)
      const canvas = await html2canvas(el, {
        scale: SCALE, backgroundColor: '#ffffff', useCORS: true, logging: false, width: PAGE.w, height: PAGE.h, windowWidth: PAGE.w,
        ignoreElements: n => n.id === 'root', // the app behind
      })
      el.remove()
      if (p) doc.addPage()
      doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
      onProgress?.(p + 1, pageEls.length)
    }
    const clean = String(student.name || 'student').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
    doc.save(`Mistake-Copy-${clean || 'student'}.pdf`)
  } finally {
    root.unmount() // a second unmount is a no-op
    host.remove()
  }
}
