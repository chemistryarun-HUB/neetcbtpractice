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

export function hasMath(text) {
  return typeof text === 'string' && /(?<!\\)\$/.test(text)
}

export default function MathText({ text, style, className }) {
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
