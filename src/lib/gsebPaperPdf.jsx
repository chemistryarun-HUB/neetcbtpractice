// A GSEB board paper as a PDF to save or print: A4 pages in two columns with a
// rule between them like the printed paper, Part A (MCQs) and Part B (written,
// section by section) each starting on a new page, and an optional answer key.
//
// The browser lays the pages out and each one is captured as an image
// (html2canvas → jsPDF), as reportPdf.js does: KaTeX maths, mhchem and the
// redrawn structures come out exactly as on screen, which jsPDF's own text
// drawing cannot do. The cost is text that isn't selectable.
//
// Questions are never split across a column: each one is measured at column
// width first, then placed whole, top to bottom, left column then right.
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import MathText, { ensureKatex } from '../components/shared/MathText'
import { supabase } from './supabase'
import { GSEB_SUBJECT_LABELS, paperExam, partBRules, ruleLabel, chapterName, minutesFor } from './gseb'
import { byYearThenNumber } from './gsebBank'
import { optionEntries, correctOptionKey } from './questionOptions'

// A4 at 96 px per inch; all sizes below are CSS px.
const PAGE = { w: 794, h: 1123, margin: 40, foot: 30, gap: 30 }
const INNER_W = PAGE.w - 2 * PAGE.margin
const COL_W = (INNER_W - PAGE.gap) / 2
const INNER_H = PAGE.h - 2 * PAGE.margin - PAGE.foot
const SCALE = 2 // ~190 dpi: sharp on paper, about 300 KB a page
const LETTERS = ['A', 'B', 'C', 'D']

const hours = min => min % 60 ? `${min} Minutes` : `${min / 60} Hour${min === 60 ? '' : 's'}`

// Short options sit four or two to a line, long ones one per line. This is a
// first guess from the text; fitOptions() corrects it once they are drawn.
const plain = t => String(t || '').replace(/\\[a-zA-Z]+/g, '').replace(/[${}_^\\]/g, '').trim()
function optionCols(opts) {
  if (opts.some(o => o.image)) return 2
  const longest = Math.max(...opts.map(o => plain(o.text).length))
  return longest <= 9 ? 4 : longest <= 22 ? 2 : 1
}

// An option that wraps or spills out of its cell moves the question to fewer
// options per line (4 → 2 → 1). Returns whether anything changed.
function fitOptions(root) {
  let changed = false
  root.querySelectorAll('.pp-opts.n4, .pp-opts.n2').forEach(box => {
    if (box.querySelector('img')) return
    const cramped = [...box.querySelectorAll('.pp-ot')].some(cell => {
      const tops = new Set([...cell.firstElementChild.getClientRects()].map(r => Math.round(r.top)))
      return tops.size > 1 || cell.scrollWidth > cell.clientWidth + 1 ||
        [...cell.querySelectorAll('.katex')].some(k => k.getBoundingClientRect().width > cell.clientWidth + 1 || mathWraps(k))
    })
    if (!cramped) return
    box.classList.replace(box.classList.contains('n4') ? 'n4' : 'n2', box.classList.contains('n4') ? 'n2' : 'n1')
    changed = true
  })
  return changed
}

// KaTeX breaks a long formula into pieces (.base) that wrap like words; two
// pieces with no vertical overlap sit on different lines.
function mathWraps(k) {
  const rects = [...k.querySelectorAll('.katex-html > .base, .katex-html > .katex-base')].map(b => b.getBoundingClientRect())
  return rects.length > 1 && Math.max(...rects.map(r => r.top)) >= Math.min(...rects.map(r => r.bottom)) - 1
}

// A formula too long to break (one big \ce{}) is scaled down to its column.
function shrinkMath(root) {
  root.querySelectorAll('.katex').forEach(k => {
    const room = k.closest('.pp-ot, .pp-body, .pp-head')?.clientWidth
    const w = k.getBoundingClientRect().width
    if (room && w > room) k.style.fontSize = `${Math.max(0.55, room / w) * 1.05}em`
  })
}

function Head({ board = 'GSEB · Std 12 Science · Board Paper', title, sub, time, marks, note }) {
  return (
    <div className="pp-head">
      <div className="pp-board">{board}</div>
      <div className="pp-title">{title}</div>
      {sub && <div className="pp-sub">{sub}</div>}
      <div className="pp-meta"><span>Time: {time}</span><span>Total Marks: {marks}</span></div>
      {note && <div className="pp-note">{note}</div>}
    </div>
  )
}

// A question pulled out of its paper says where it came from.
const Tag = ({ tag }) => tag ? <div className="pp-tag">[{tag}]</div> : null

function Mcq({ q, no, tag }) {
  const opts = optionEntries(q)
  return (
    <div className="pp-q">
      <span className="pp-no">{no}.</span>
      <div className="pp-body">
        <MathText text={q.question} />
        {q.question_image && <img src={q.question_image} alt="" className="pp-img" />}
        <div className={`pp-opts n${optionCols(opts)}`}>
          {opts.map((o, i) => (
            <div key={o.key} className="pp-opt">
              <span className="pp-ol">({LETTERS[i]})</span>
              <span className="pp-ot"><span>{o.text && <MathText text={o.text} />}</span>{o.image && <img src={o.image} alt="" className="pp-img" />}</span>
            </div>
          ))}
        </div>
        <Tag tag={tag} />
      </div>
    </div>
  )
}

function Written({ no, text, image, tag }) {
  return (
    <div className="pp-q">
      <span className="pp-no">{no}.</span>
      <div className="pp-body">
        {text ? <MathText text={text} /> : <em>No model answer added.</em>}
        {image && <img src={image} alt="" className="pp-img" />}
        <Tag tag={tag} />
      </div>
    </div>
  )
}

function Key({ sub, items }) {
  return (
    <div className="pp-head">
      <div className="pp-title">ANSWER KEY</div>
      <div className="pp-sub">{sub}</div>
      <div className="pp-key">
        {items.map(({ q, no }) => {
          const k = correctOptionKey(q)
          return <span key={q.id}><b>{no}</b> {k ? LETTERS[Number(k.slice(-1)) - 1] : '–'}</span>
        })}
      </div>
    </div>
  )
}

const Section = ({ title, rule }) => <div className="pp-sec"><b>{title}</b>{rule && <span>{rule}</span>}</div>

/*
 * What goes on the pages, independent of where the questions came from:
 *
 *   { footer, keySub,
 *     parts: [{ head: <Head> props, groups: [{ title?, rule?, mcq: bool, items: [{ q, no, tag? }] }] }] }
 *
 * Each part starts a new page. The answer key (when asked for) lists every
 * MCQ, then the model answers of the written questions.
 */
function sheetBlocks({ parts, keySub }, withKey) {
  const blocks = []
  const mcqs = [], written = []
  for (const part of parts) {
    const groups = part.groups.filter(g => g.items.length)
    if (!groups.length) continue
    blocks.push({ kind: 'full', breakBefore: true, el: <Head {...part.head} /> })
    for (const g of groups) {
      if (g.title) blocks.push({ kind: 'col', keep: true, el: <Section title={g.title} rule={g.rule} /> })
      for (const it of g.items) {
        blocks.push({ kind: 'col', el: g.mcq ? <Mcq {...it} /> : <Written no={it.no} text={it.q.question} image={it.q.question_image} tag={it.tag} /> })
        ;(g.mcq ? mcqs : written).push(it)
      }
    }
  }
  if (withKey) {
    if (mcqs.length) blocks.push({ kind: 'full', breakBefore: true, el: <Key sub={keySub} items={mcqs} /> })
    const answered = written.filter(({ q }) => q.answer || q.answer_image)
    if (answered.length) {
      blocks.push({ kind: 'col', keep: true, breakBefore: !mcqs.length, el: <Section title="MODEL ANSWERS · WRITTEN QUESTIONS" /> })
      answered.forEach(({ q, no }) => blocks.push({ kind: 'col', el: <Written no={no} text={q.answer} image={q.answer_image} /> }))
    }
  }
  return blocks
}

const subjectTitle = subject => GSEB_SUBJECT_LABELS[subject]?.toUpperCase() || ''
const sourceTag = q => q.paper ? `GSEB ${paperExam(q.paper)}` : null
const totalOf = rules => rules.reduce((t, r) => t + (r.attempt ?? r.to - r.from + 1) * (r.marks || 0), 0)

// One board paper, as printed: Part A, then Part B section by section.
function paperSheet(paper, mcq, subjective, { partA = true, partB = true }) {
  const a = partA ? mcq : []
  const b = partB ? subjective : []
  const rules = paper.part_b_rules?.length ? paper.part_b_rules : partBRules(b)
  const title = `${subjectTitle(paper.subject)}${paper.paper_code ? ` (${paper.paper_code})` : ''}`
  return {
    footer: `NEETCBT · ${GSEB_SUBJECT_LABELS[paper.subject]} · ${paperExam(paper)}`,
    keySub: `${GSEB_SUBJECT_LABELS[paper.subject]} · ${paperExam(paper)} · Part A`,
    parts: [
      { head: { title, sub: `${paperExam(paper)} · Part A (MCQ)`, time: hours(paper.duration_min || 60), marks: a.length,
          note: `Part A has ${a.length} multiple choice questions (Q. 1 to ${a.length}), 1 mark each. Choose the correct option.` },
        groups: [{ mcq: true, items: a.map(q => ({ q, no: q.q_no })) }] },
      { head: { title, sub: `${paperExam(paper)} · Part B (Written)`, time: '2 Hours', marks: totalOf(rules) || '–',
          note: 'Write the answers in your answer book. Each section says how many of its questions to answer.' },
        groups: b.length ? rules.map(r => ({
          title: r.section ? `SECTION ${r.section}` : null, rule: r.section ? ruleLabel(r) : null,
          items: b.filter(q => !r.section || q.section === r.section).map(q => ({ q, no: q.q_no })),
        })) : [] },
    ],
  }
}

const MARKS = [2, 3, 4]

/**
 * One chapter across every paper: its MCQs newest paper first, numbered 1..N,
 * then its written questions grouped by marks. Each question names its paper.
 * Questions must carry `paper` (see fetchGsebBank).
 */
function chapterSheet({ subject, chapter, mcq, subjective, partA = true, partB = true }) {
  const name = `Ch ${chapter}. ${chapterName(subject, chapter)}`
  const a = partA ? [...mcq].sort(byYearThenNumber) : []
  const b = partB ? [...subjective].sort(byYearThenNumber) : []
  const years = [...new Set([...a, ...b].map(q => q.paper?.year).filter(Boolean))].sort()
  const span = years.length ? `GSEB ${years[0]}${years.length > 1 ? `–${years[years.length - 1]}` : ''}` : 'GSEB'
  const groups = MARKS.map(m => b.filter(q => q.marks === m)).concat([b.filter(q => !MARKS.includes(q.marks))])
  const bMarks = b.reduce((t, q) => t + (q.marks || 0), 0)
  let n = 0
  const board = 'GSEB · Std 12 Science · Chapter-wise Board Questions'
  return {
    footer: `NEETCBT · ${GSEB_SUBJECT_LABELS[subject]} · ${name}`,
    keySub: `${GSEB_SUBJECT_LABELS[subject]} · ${name} · MCQs`,
    parts: [
      { head: { board, title: subjectTitle(subject), sub: `${name} · MCQs`, time: hours(minutesFor(a.length)), marks: a.length,
          note: `${a.length} multiple choice questions from the ${span} board papers, newest first, 1 mark each. The paper each one came from is shown under it.` },
        groups: [{ mcq: true, items: a.map((q, i) => ({ q, no: i + 1, tag: sourceTag(q) })) }] },
      { head: { board, title: subjectTitle(subject), sub: `${name} · Written questions`, time: hours(Math.max(30, Math.ceil(bMarks * 1.5 / 10) * 10)), marks: bMarks,
          note: `${b.length} written questions from the ${span} board papers, grouped by marks.` },
        groups: groups.map((qs, gi) => ({
          title: qs.length ? (MARKS[gi] ? `${MARKS[gi]}-MARK QUESTIONS` : 'OTHER QUESTIONS') : null,
          rule: MARKS[gi] && qs.length ? `${qs.length} question${qs.length === 1 ? '' : 's'} · ${MARKS[gi]} marks each` : null,
          items: qs.map(q => ({ q, no: ++n, tag: sourceTag(q) })),
        })) },
    ],
  }
}

/**
 * A paper built in the generator: one head, Section A MCQs, then a section
 * per mark value, numbered straight through like GsebPrintSheet.
 */
function customSheet({ subject, title, minutes, mcq, subjective, showYear }) {
  const marks = MARKS.filter(m => subjective[m]?.length)
  const total = mcq.length + marks.reduce((t, m) => t + m * subjective[m].length, 0)
  const tag = q => showYear ? sourceTag(q) : null
  let n = 0
  return {
    footer: `NEETCBT · ${GSEB_SUBJECT_LABELS[subject]} · ${title}`,
    keySub: `${GSEB_SUBJECT_LABELS[subject]} · ${title}`,
    parts: [{
      head: { board: `GSEB · Std 12 Science · ${GSEB_SUBJECT_LABELS[subject]}`, title: String(title || 'Test').toUpperCase(),
        time: hours(minutes || 60), marks: total, note: 'Answer every question. Marks for each section are shown at its head.' },
      groups: [
        { mcq: true, title: mcq.length && marks.length ? 'SECTION A' : null, rule: `Choose the correct option (${mcq.length} × 1 = ${mcq.length} marks)`,
          items: mcq.map(q => ({ q, no: ++n, tag: tag(q) })) },
        ...marks.map((m, i) => ({
          title: `SECTION ${'BCDE'[i]}`, rule: `Answer the following (${subjective[m].length} × ${m} = ${subjective[m].length * m} marks)`,
          items: subjective[m].map(q => ({ q, no: ++n, tag: tag(q) })),
        })),
      ],
    }],
  }
}

// Fills columns top to bottom, left then right, a new page when both are full.
function paginate(blocks, heights) {
  const pages = []
  let page = null
  const newPage = () => { page = { full: [], top: 0, cols: [[], []], used: [0, 0], col: 0 }; pages.push(page) }
  const finish = () => page && balance(page)
  blocks.forEach((b, i) => {
    const h = heights[i]
    if (!page || b.breakBefore) { finish(); newPage() }
    if (b.kind === 'full') {
      if (page.cols[0].length || page.top + h > INNER_H) { finish(); newPage() }
      page.full.push(i)
      page.top += h
      return
    }
    const need = b.keep && heights[i + 1] ? h + heights[i + 1] : h
    for (;;) {
      const room = INNER_H - page.top - page.used[page.col]
      if (need <= room || page.used[page.col] === 0) break // too tall for any column: give it a fresh one
      if (page.col === 0) page.col = 1
      else { finish(); newPage() }
    }
    page.cols[page.col].push(i)
    page.used[page.col] += h
  })
  finish()
  // A part that ends part-way down a page reads better split evenly.
  function balance(p) {
    const items = [...p.cols[0], ...p.cols[1]]
    if (p.cols[1].length && p.used[1] > INNER_H - p.top - 40) return // a full page stays as filled
    let best = null
    for (let k = 1; k <= items.length; k++) {
      if (blocks[items[k - 1]].keep) continue
      const left = items.slice(0, k).reduce((t, i) => t + heights[i], 0)
      const right = items.slice(k).reduce((t, i) => t + heights[i], 0)
      if (left > INNER_H - p.top || right > INNER_H - p.top) continue
      const score = Math.max(left, right)
      if (!best || score < best.score) best = { k, score, left, right }
    }
    if (best && items.length > 1) {
      p.cols = [items.slice(0, best.k), items.slice(best.k)]
      p.used = [best.left, best.right]
    }
  }
  return pages
}

async function settle(el) {
  el.getBoundingClientRect() // lay out first, so the fonts and images it needs start loading
  const imgs = [...el.querySelectorAll('img')]
  await Promise.race([
    Promise.all([document.fonts?.ready, ...imgs.map(img => img.decode().catch(() => {}))]),
    new Promise(r => setTimeout(r, 10000)),
  ])
  await new Promise(r => setTimeout(r, 30))
}

function buildPage(page, nodes, index, total, footer) {
  const el = document.createElement('div')
  el.className = 'pp-page'
  for (const i of page.full) el.appendChild(nodes[i].cloneNode(true))
  if (page.cols[0].length) {
    const cols = document.createElement('div')
    cols.className = 'pp-cols'
    cols.style.height = `${INNER_H - page.top}px`
    cols.style.gap = `${PAGE.gap}px`
    for (const list of page.cols) {
      const col = document.createElement('div')
      col.className = 'pp-col'
      col.style.width = `${COL_W}px`
      list.forEach(i => col.appendChild(nodes[i].cloneNode(true)))
      cols.appendChild(col)
    }
    el.appendChild(cols)
  }
  const foot = document.createElement('div')
  foot.className = 'pp-foot'
  const left = document.createElement('span'), right = document.createElement('span')
  left.textContent = footer
  right.textContent = `Page ${index + 1} of ${total}`
  foot.append(left, right)
  el.appendChild(foot)
  return el
}

/**
 * Builds the PDF and returns it as a jsPDF document. Must run in a browser.
 * onProgress(done, total) is called as each page is captured.
 */
export function gsebPaperPdf({ paper, mcq = [], subjective = [], partA = true, partB = true, withKey = false, onProgress }) {
  return sheetPdf(paperSheet(paper, mcq, subjective, { partA, partB }), { withKey, onProgress })
}

async function sheetPdf(sheet, { withKey = false, onProgress } = {}) {
  const blocks = sheetBlocks(sheet, withKey)
  if (!blocks.length) throw new Error('Nothing to put in the PDF.')
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas'), ensureKatex()])
  await Promise.all(['15px KaTeX_Main', 'bold 15px KaTeX_Main', 'italic 15px KaTeX_Main'].map(f => document.fonts?.load(f).catch(() => {})))

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(
      <div className="pp">
        <div style={{ width: INNER_W }}>{blocks.map((b, i) => b.kind === 'full' && <div key={i} data-i={i} className="pp-b">{b.el}</div>)}</div>
        <div style={{ width: COL_W }}>{blocks.map((b, i) => b.kind === 'col' && <div key={i} data-i={i} className="pp-b">{b.el}</div>)}</div>
      </div>
    ))
    await settle(host)
    for (let pass = 0; pass < 2 && fitOptions(host); pass++) { /* again: 4 → 2 can still be cramped */ }
    shrinkMath(host)
    await settle(host)
    const nodes = []
    host.querySelectorAll('[data-i]').forEach(n => { nodes[Number(n.dataset.i)] = n })
    const pages = paginate(blocks, nodes.map(n => n.getBoundingClientRect().height))
    const pageEls = pages.map((page, p) => buildPage(page, nodes, p, pages.length, sheet.footer))
    root.unmount() // html2canvas copies the whole document per page: keep it small
    host.replaceChildren()

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    for (let p = 0; p < pageEls.length; p++) {
      const el = pageEls[p]
      host.appendChild(el)
      await settle(el)
      const canvas = await html2canvas(el, {
        scale: SCALE, backgroundColor: '#ffffff', useCORS: true, logging: false, width: PAGE.w, height: PAGE.h, windowWidth: PAGE.w,
        ignoreElements: n => n.id === 'root', // the app behind the dialog
      })
      el.remove()
      if (p) doc.addPage()
      doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
      onProgress?.(p + 1, pages.length)
    }
    return doc
  } finally {
    root.unmount() // a second unmount is a no-op
    host.remove()
  }
}

const clean = x => String(x || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')

export function gsebPdfFileName(paper, { partA = true, partB = true, withKey = false } = {}) {
  const part = partA && partB ? '' : partA ? 'Part-A' : 'Part-B'
  return [`GSEB-${GSEB_SUBJECT_LABELS[paper.subject]}`, paper.year, clean(paperExam(paper).split(' · ')[1]), part, withKey && 'with-Key']
    .filter(Boolean).join('-') + '.pdf'
}

/** Fetches the paper's questions, builds the PDF and saves it. */
export async function downloadGsebPaperPdf(paper, opts = {}) {
  let { mcq, subjective } = opts
  if (!mcq || !subjective) {
    const [m, s] = await Promise.all([
      supabase.from('gseb_questions').select('*').eq('paper_id', paper.id).order('q_no'),
      supabase.from('gseb_subjective').select('*').eq('paper_id', paper.id).order('q_no'),
    ])
    if (m.error) throw m.error
    if (s.error) throw s.error
    mcq = m.data
    subjective = s.data
  }
  const doc = await gsebPaperPdf({ ...opts, paper, mcq, subjective })
  doc.save(gsebPdfFileName(paper, opts))
}


/**
 * The questions of one chapter, from every paper of the subject. Published
 * papers only, unless includeDrafts (the admin sees drafts in their counts).
 */
export async function fetchGsebChapter(subject, chapter, { includeDrafts = false } = {}) {
  let req = supabase.from('gseb_papers').select('id, subject, year, session, set_no, medium, paper_code').eq('subject', subject)
  if (!includeDrafts) req = req.eq('is_published', true)
  const { data: papers, error } = await req
  if (error) throw error
  if (!papers.length) return { mcq: [], subjective: [] }
  const ids = papers.map(p => p.id)
  const byId = Object.fromEntries(papers.map(p => [p.id, p]))
  const [m, s] = await Promise.all([
    supabase.from('gseb_questions').select('*').in('paper_id', ids).eq('chapter_no', chapter),
    supabase.from('gseb_subjective').select('*').in('paper_id', ids).eq('chapter_no', chapter),
  ])
  if (m.error) throw m.error
  if (s.error) throw s.error
  const tag = q => ({ ...q, paper: byId[q.paper_id] })
  return { mcq: m.data.map(tag), subjective: s.data.map(tag) }
}

/** Chapter-wise PDF: fetches the chapter's questions when not given, then saves. */
export async function downloadGsebChapterPdf({ subject, chapter, includeDrafts, mcq, subjective, partA = true, partB = true, withKey = false, onProgress }) {
  if (!mcq || !subjective) ({ mcq, subjective } = await fetchGsebChapter(subject, chapter, { includeDrafts }))
  const doc = await sheetPdf(chapterSheet({ subject, chapter, mcq, subjective, partA, partB }), { withKey, onProgress })
  const part = partA && partB ? '' : partA ? 'MCQ' : 'Written'
  doc.save([`GSEB-${GSEB_SUBJECT_LABELS[subject]}`, `Ch${chapter}`, clean(chapterName(subject, chapter)), part, withKey && 'with-Key'].filter(Boolean).join('-') + '.pdf')
}

/** The generator's paper ({ mcq, subjective: { 2: [], 3: [], 4: [] } }) as a PDF. */
export async function downloadGsebCustomPdf({ subject, title, minutes, paper, showYear = true, withKey = false, onProgress }) {
  const doc = await sheetPdf(customSheet({ subject, title, minutes, mcq: paper.mcq, subjective: paper.subjective, showYear }), { withKey, onProgress })
  doc.save([`GSEB-${GSEB_SUBJECT_LABELS[subject]}`, clean(title) || 'Test', withKey && 'with-Key'].filter(Boolean).join('-') + '.pdf')
}
