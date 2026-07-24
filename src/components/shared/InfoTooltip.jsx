import { useState, useRef, useEffect } from 'react'

// Small "i" badge that reveals more detail — on hover (desktop) and on tap
// (toggles open, closes on outside click, since mobile has no hover). A
// native `title` attribute can't show multi-line text this long in a
// readable way, hence a custom popover instead.
//
// `text` is the original single-string usage (level syllabus, capped narrow
// width). `content` takes arbitrary JSX instead, for richer multi-section
// previews (e.g. a practice paper's four subject syllabuses) — pair it with
// `wide` to get a taller, scrollable panel sized for that instead of the
// narrow single-line default, and `size="lg"` for a bigger, more
// thumb-friendly trigger on pages meant to be used on a phone.
export default function InfoTooltip({ text, content, align = 'center', wide = false, size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  if (!text && !content) return null

  return (
    <span ref={ref} className="info-tooltip" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
      <span className={`info-tooltip-trigger ${size === 'lg' ? 'lg' : ''}`} aria-label="Show details">i</span>
      <span className={`info-tooltip-panel align-${align} ${wide ? 'wide' : ''} ${open ? 'open' : ''}`}>{content || text}</span>
    </span>
  )
}
