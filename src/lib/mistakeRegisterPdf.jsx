// The Mistake Copy as a printable Error Analysis Register, in the institute's
// format: one header per test, then each question's statement, answers, error
// type and notes. Whatever the student hasn't typed comes out as ruled blank
// lines, so the sheet can be finished by hand and signed by the teacher.
//
// Captured with html2canvas like the GSEB paper PDF, for the same reason: the
// browser shapes Gujarati and KaTeX correctly, jsPDF on its own can't.
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import MathText, { ensureKatex } from '../components/shared/MathText'
import QuestionView from '../components/shared/QuestionView'
import { correctOptionKey } from './questionOptions'
import { orderOptionsForReview } from './optionShuffle'
import { ERROR_TYPES, groupByTest, testDate, testMarks } from './mistakeCopy'
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

function NoteBlock({ label, value, lines = 2 }) {
  return (
    <div className="mr-note">
      <div className="mr-label">{label}</div>
      {value
        ? <div className="mr-written"><MathText text={value} /></div>
        : Array.from({ length: lines }, (_, i) => <div key={i} className="mr-line" />)}
    </div>
  )
}

function TestHeader({ student, group, medium, t }) {
  const { attempt } = group.test
  const { unit } = fromCourseUnitId(group.unitId)
  const name = `${t.unit(unit)} · ${unitName({ name: practiceUnitName(group.unitId) }, group.unitId, medium)} · ${levelBadgeT(group.unitId, attempt.level, medium)} · ${t.mcAttempt(group.test.position)}`
  const marks = testMarks(attempt)
  return (
    <div className="mr-head">
      <div className="mr-title">{t.mrTitle}</div>
      <div className="mr-tagline">{t.mrTagline}</div>
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

function QuestionBlock({ item, number, t }) {
  const options = orderOptionsForReview(item.q, item.lastMistake.optionOrder)
  const chosen = isChosenBy(item.lastMistake.selected)
  const correctKey = correctOptionKey(item.q)
  return (
    <div className="mr-question">
      <div className="mr-label">{t.mrQuestion} {number} <code>{item.q.qid}</code></div>
      <QuestionView q={item.q} mode="review" size="compact" options={options} isChosen={chosen} />
      <div className="mr-answers">
        <div><span>{t.mrMyAnswer}:</span> {answerLabel(options, chosen, t)}</div>
        <div><span>{t.mrCorrectAnswer}:</span> {answerLabel(options, o => o.key === correctKey, t)}</div>
      </div>
    </div>
  )
}

function AnalysisBlock({ item, t }) {
  const { entry } = item
  return (
    <div className="mr-analysis">
      <div className="mr-label">{t.mcErrorType}</div>
      <div className="mr-types">
        {ERROR_TYPES.map(type => (
          <span key={type} className={`mr-type${entry?.error_type === type ? ' on' : ''}`}>
            <i />{t.mcErrorTypes[type]}{type === 'other' && entry?.error_other ? `: ${entry.error_other}` : ''}
          </span>
        ))}
      </div>
      <NoteBlock label={t.mcReason} value={entry?.reason} />
      <NoteBlock label={t.mcSolution} value={entry?.solution} lines={3} />
      <NoteBlock label={t.mcLearning} value={entry?.learning} />
      <NoteBlock label={t.mcPrevention} value={entry?.prevention} />
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

export async function saveMistakeRegisterPdf({ student, items, medium, onProgress }) {
  const t = neetT(medium)
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas'), ensureKatex()])

  // A register reads oldest test first. The header stays glued to its first
  // question, so a page never ends on a header alone.
  const blocks = []
  const groups = groupByTest(items).reverse()
  for (const group of groups) {
    group.items.forEach((item, i) => {
      blocks.push(
        <div key={`${group.key}-${item.q.id}`}>
          {i === 0 && <TestHeader student={student} group={group} medium={medium} t={t} />}
          <QuestionBlock item={item} number={i + 1} t={t} />
        </div>,
        <AnalysisBlock key={`${group.key}-${item.q.id}-a`} item={item} t={t} />,
      )
    })
    blocks.push(<div key={`${group.key}-sign`} className="mr-sign"><span>{t.mrSignature}:</span><i /></div>)
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
    doc.save(`Error-Analysis-Register-${clean || 'student'}.pdf`)
  } finally {
    root.unmount() // a second unmount is a no-op
    host.remove()
  }
}
