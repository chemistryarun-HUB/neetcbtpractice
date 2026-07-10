import { useState, useRef, useEffect } from 'react'

// Small "i" badge that reveals the full syllabus text for a level — on hover
// (desktop) and on tap (toggles open, closes on outside click, since mobile
// has no hover). A native `title` attribute can't show multi-line text this
// long in a readable way, hence a custom popover instead.
export default function InfoTooltip({ text, align = 'center' }) {
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

  if (!text) return null

  return (
    <span ref={ref} className="info-tooltip" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
      <span className="info-tooltip-trigger" aria-label="Show full syllabus">i</span>
      <span className={`info-tooltip-panel align-${align} ${open ? 'open' : ''}`}>{text}</span>
    </span>
  )
}
