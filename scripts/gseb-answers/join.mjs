// Puts back on one line the equations that were split over two or three lines
// for the old two-column PDF (Arun, 2026-11-20: "equations should be in one row";
// the PDF is now one column).
const ARROW = /^\$\\ce\{\s*(->|<=>|<->|<=>>|<<=>)/
export function joinEquations(text) {
  const lines = text.split('\n')
  const out = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    const prevCe = prev !== undefined && /\\ce\{[^$]*\}\$$/.test(prev) && /^\$\\ce\{/.test(prev.slice(prev.lastIndexOf('$', prev.length - 2)))
    const whole = /^\$\\ce\{.*\}\$$/.test(line) && !line.slice(1, -1).includes('$')
    if (prevCe && whole && (ARROW.test(line) || /(->|<=>)(\[[^\]]*\])*\}\$$/.test(prev))) {
      out[out.length - 1] = prev.slice(0, -2) + ' ' + line.slice(5)
      continue
    }
    const plus = line.match(/^\$\+ \\ce\{(.*)\}\$$/)
    if (prevCe && plus) { out[out.length - 1] = prev.slice(0, -2) + ' + ' + plus[1] + '}$'; continue }
    out.push(line)
  }
  return out.join('\n')
}
