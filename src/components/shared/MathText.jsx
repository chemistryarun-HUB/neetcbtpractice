import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Renders question/option text with LaTeX between $…$ (inline) or $$…$$
// (own line). Chemistry uses mhchem: $\ce{CH3CH=CHCO2CH3 ->[LiAlH4] CH3CH=CHCH2OH}$,
// maths/physics plain LaTeX: $\frac{1}{2}mv^2$, $10^{-3}$, $\sqrt{2gh}$.
//
// KaTeX (~270 KB) is loaded only the first time a text actually contains a
// "$", so the bank's thousands of plain-text questions cost nothing extra.
// Until it arrives the raw text shows, which is still readable.

let katexMod = null
let loading = null
function loadKatex() {
  if (!loading) {
    loading = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(async ([k]) => {
      await import('katex/contrib/mhchem')
      katexMod = k.default || k
      return katexMod
    })
  }
  return loading
}

// For MathText rendered off screen that must show its maths on the first
// render (the paper PDF): resolves once KaTeX and its CSS are in.
export const ensureKatex = loadKatex

// "$$…$$" first, then "$…$". A backslash-escaped \$ stays a literal dollar.
const SPLIT = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$])+?(?<!\\)\$)/g

// Text with LaTeX commands but no "$" — what ChatGPT and most equation tools
// paste — is rendered without the author adding dollars. Only the maths runs
// are wrapped, so English around them stays ordinary, wrapping text:
//   "\ce{A -> B}. The first step is an aldol" -> "$\ce{A -> B}.$ The first step is an aldol"
// and a sentence typed as \text{…} is shown as plain text.
const LATEX_LINE = /\\(?:text|textbf|textit|frac|dfrac|tfrac|xrightarrow|xleftarrow|ce|pu|sqrt|mathrm|mathbf|overset|underset|rightarrow|leftarrow|rightleftharpoons|longrightarrow|Delta|alpha|beta|gamma|theta|lambda|mu|pi|sigma|omega|times|cdot|degree|circ|int|sum|lim|log|ln|sin|cos|tan|left|right|vec|hat|bar|pm|le|ge|neq|approx|infty|partial|quad|qquad)(?![a-zA-Z])/
const MATH_CHAR = /[0-9=+\-*/().,:;'<>|!~^_&]/

// End index of a balanced {…} or […] group starting at s[i].
function groupEnd(s, i) {
  const open = s[i], close = open === '{' ? '}' : ']'
  let depth = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue }
    if (s[j] === open) depth++
    else if (s[j] === close && --depth === 0) return j + 1
  }
  return s.length
}

// A short letter run (≤3) that is not an everyday English word is a maths
// symbol (P, x, mv, mgh); anything else ends the maths run.
const STOP = new Set('a an and the of to in on at by as or if it is be are was for has its not but can all two one use per via so we he she you how why who'.split(' '))
const wordEnd = (s, i) => { let j = i; while (/[a-zA-Z]/.test(s[j] || '')) j++; return j }
function isSymbol(s, i) {
  const w = s.slice(i, wordEnd(s, i))
  return w.length === 1 ? true : w.length <= 3 && !STOP.has(w.toLowerCase())
}

// End index of the maths run that starts with the command at s[i].
function mathRun(s, i) {
  let j = i
  while (j < s.length) {
    const c = s[j]
    if (c === '\\' && /[a-zA-Z]/.test(s[j + 1] || '')) {
      j++
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++
      while (s[j] === '{' || s[j] === '[') j = groupEnd(s, j)
    } else if (c === '\\') {
      j += 2                                      // \\ \, \{ …
    } else if (c === '{') {
      j = groupEnd(s, j)
    } else if ((c === '_' || c === '^') && s[j + 1] === '{') {
      j = groupEnd(s, j + 1)
    } else if (c === ' ') {
      // Keep going across a space only if maths follows it.
      let k = j
      while (s[k] === ' ') k++
      const n = s[k]
      if (n === '\\' || (n && MATH_CHAR.test(n) && n !== '.' && n !== ',') ||
          (n && /[a-zA-Z]/.test(n) && isSymbol(s, k))) j = k
      else break
    } else if (MATH_CHAR.test(c)) {
      j++
    } else if (/[a-zA-Z]/.test(c) && isSymbol(s, j)) {
      j = wordEnd(s, j)                           // maths symbol: P, Q, x, mv, mgh
    } else break
  }
  return j
}

function wrapLine(line) {
  if (/(?<!\\)\$/.test(line) || !LATEX_LINE.test(line)) return line
  // A LaTeX line break at the end is just the newline that already follows.
  let s = line.replace(/\s*\\\\\s*$/, '')
  // Sentences typed as \text{…}/\textbf{…} (3+ words) at the top level of
  // the line become plain text; \text inside a formula (an arrow label,
  // a subscript) is left alone.
  s = s.replace(/\\text(?:bf|it|rm)?\{([^{}]*)\}/g, (m, inner, at) => {
    let depth = 0
    for (let k = 0; k < at; k++) { if (s[k] === '{' || s[k] === '[') depth++; else if (s[k] === '}' || s[k] === ']') depth-- }
    return depth === 0 && (inner.match(/[A-Za-z]{2,}/g) || []).length >= 3 ? ` ${inner.trim()} ` : m
  })
  if (!LATEX_LINE.test(s)) return s.replace(/ {2,}/g, ' ').trim()
  let out = '', i = 0
  while (i < s.length) {
    if (s[i] === '\\' && /[a-zA-Z]/.test(s[i + 1] || '')) {
      const end = mathRun(s, i)
      const run = s.slice(i, end).trimEnd()
      // Trailing space keeps a closing "\" from escaping the "$".
      out += `$${run} $` + s.slice(i + run.length, end)
      i = end
    } else out += s[i++]
  }
  return out.replace(/ {2,}/g, ' ').trim()
}

function autoWrap(text) {
  if (typeof text !== 'string' || !text.includes('\\')) return text
  return text.split('\n').map(wrapLine).join('\n')
}

export function hasMath(text) {
  return typeof text === 'string' && /(?<!\\)\$/.test(autoWrap(text))
}

export default function MathText({ text: raw, style, className }) {
  const text = autoWrap(raw)
  const needs = hasMath(text)
  const [, setReady] = useState(!!katexMod)

  useEffect(() => {
    if (needs && !katexMod) {
      let alive = true
      loadKatex().then(() => alive && setReady(true)).catch(() => {})
      return () => { alive = false }
    }
  }, [needs])

  const base = { whiteSpace: 'pre-wrap', ...style }
  if (!needs || !katexMod) return <span className={className} style={base}>{text}</span>

  const parts = text.split(SPLIT)
  return (
    <span className={className} style={base}>
      {parts.map((part, i) => {
        if (!part) return null
        const display = part.startsWith('$$') && part.endsWith('$$') && part.length > 4
        const inline = !display && part.startsWith('$') && part.endsWith('$') && part.length > 2
        if (!display && !inline) return <span key={i}>{part.replace(/\\\$/g, '$')}</span>
        const tex = display ? part.slice(2, -2) : part.slice(1, -1)
        const html = katexMod.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' })
        return <MathSpan key={i} html={html} display={display} />
      })}
    </span>
  )
}

// Live render of any $…$ maths under the box being typed in, so a typo in the
// LaTeX shows up here rather than on a student's screen.
export function MathPreview({ text }) {
  if (!hasMath(text)) return null
  return (
    <div style={{ marginTop: '0.3rem', padding: '0.4rem 0.6rem', background: '#fff', border: '1px dashed var(--gray-300)', borderRadius: 6, fontSize: '0.9rem' }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', marginRight: '0.4rem' }}>PREVIEW</span>
      <MathText text={text} />
    </div>
  )
}

// One rendered equation. It wraps at its arrows/operators where KaTeX allows;
// only when it is still wider than the card does it get a sideways scroll —
// switching that on always made Windows draw an empty scrollbar under short
// formulas whose glyphs overhang their box by a few pixels.
function MathSpan({ html, display }) {
  const ref = useRef(null)
  const [scroll, setScroll] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setScroll(el.scrollWidth - el.clientWidth > 24)
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [html])
  return (
    <span ref={ref} className="math-span"
      style={{ display: display ? 'block' : 'inline-block', maxWidth: '100%', verticalAlign: 'middle',
        overflowX: scroll ? 'auto' : 'visible', overflowY: scroll ? 'hidden' : 'visible' }}
      dangerouslySetInnerHTML={{ __html: html }} />
  )
}
