// TEMPORARY. Finds out what happens to a tap on a device we can't inspect (an
// iPad where the Question Bank card does nothing). Off unless the page was opened
// with ?tapdebug=1, and it only watches: the panel ignores touches and nothing is
// sent anywhere. Delete this file and its call in main.jsx once that is solved.
export function installTapDebug() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('tapdebug')) sessionStorage.setItem('tapdebug', '1')
  if (!sessionStorage.getItem('tapdebug')) return

  const panel = document.createElement('div')
  panel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;pointer-events:none;background:rgba(17,24,39,0.93);color:#fff;font:12px/1.45 monospace;padding:8px 10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;max-height:45vh;overflow:hidden'
  const head = `${window.innerWidth}x${window.innerHeight} dpr${window.devicePixelRatio}\n${navigator.userAgent}`
  const lines = []
  const render = () => { panel.textContent = `${head}\n${lines.join('\n')}` }
  const log = line => {
    lines.unshift(line)
    lines.length = Math.min(lines.length, 9)
    render()
  }

  const name = el => {
    if (!el?.tagName) return 'none'
    const cls = String(el.className?.baseVal ?? el.className ?? '').trim().split(/\s+/)[0]
    const text = (el.innerText || '').trim().split('\n')[0].slice(0, 24)
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${text ? ` "${text}"` : ''}`
  }
  const link = el => el?.closest?.('a')?.getAttribute('href') || 'no link'
  const stack = (x, y) => document.elementsFromPoint(x, y).slice(0, 3).map(name).join(' > ')

  window.addEventListener('touchstart', e => {
    const t = e.touches[0]
    if (t) log(`START ${Math.round(t.clientX)},${Math.round(t.clientY)} ${stack(t.clientX, t.clientY)} | ${link(e.target)}`)
  }, { capture: true, passive: true })
  window.addEventListener('touchend', e => log(`END ${name(e.target)}`), { capture: true, passive: true })
  window.addEventListener('touchcancel', e => log(`CANCEL ${name(e.target)}`), { capture: true, passive: true })
  window.addEventListener('click', e => {
    log(`CLICK ${name(e.target)} | ${link(e.target)}`)
    setTimeout(() => log(`AFTER prevented=${e.defaultPrevented} page=${window.location.pathname}`), 300)
  }, true)
  window.addEventListener('error', e => log(`ERROR ${e.message}`))
  window.addEventListener('unhandledrejection', e => log(`REJECT ${e.reason?.message || e.reason}`))

  document.body.appendChild(panel)
  render()
}
