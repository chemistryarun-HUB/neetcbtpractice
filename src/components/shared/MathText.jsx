import { useEffect, useState } from 'react'

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

// "$$…$$" first, then "$…$". A backslash-escaped \$ stays a literal dollar.
const SPLIT = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$])+?(?<!\\)\$)/g

// A line with no "$" but with LaTeX commands in it (\frac{, \text{,
// \xrightarrow{, \ce{ …) — what ChatGPT and most equation tools paste — is
// treated as one maths line, so pasted LaTeX works without adding dollars.
const LATEX_LINE = /\\(?:text|frac|dfrac|tfrac|xrightarrow|xleftarrow|ce|pu|sqrt|mathrm|mathbf|overset|underset|rightarrow|leftarrow|rightleftharpoons|longrightarrow|Delta|alpha|beta|gamma|theta|lambda|mu|pi|sigma|omega|times|cdot|degree|circ|int|sum|lim|log|ln|sin|cos|tan|left|right|vec|hat|bar|pm|le|ge|neq|approx|infty|partial)(?![a-zA-Z])/
function autoWrap(text) {
  if (typeof text !== 'string' || !text.includes('\\')) return text
  const isTex = line => !/(?<!\\)\$/.test(line) && LATEX_LINE.test(line)
  const lines = text.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (!isTex(lines[i])) { out.push(lines[i]); continue }
    // Consecutive LaTeX lines are one equation (a "\\" at a line end is a
    // LaTeX line break, so the next line belongs to the same block).
    const group = [lines[i].trim()]
    while (i + 1 < lines.length && lines[i + 1].trim() &&
           (isTex(lines[i + 1]) || /\\\\\s*$/.test(lines[i]))) {
      group.push(lines[++i].trim())
    }
    // Trailing space keeps a closing "\\" from escaping the "$".
    out.push(`$${group.join(' ')} $`)
  }
  return out.join('\n')
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
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
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
