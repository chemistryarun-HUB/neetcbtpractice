import { Maximize2, Minimize2 } from 'lucide-react'

// The expand affordance for review modals. Hidden under 640px by CSS: a phone's
// modal is already the whole screen, so there is nothing to expand into and the
// button would be a control that visibly does nothing.
export default function ModalExpandButton({ expanded, onToggle }) {
  return (
    <button
      className="btn btn-ghost btn-sm modal-expand-btn"
      onClick={onToggle}
      title={expanded ? 'Shrink back down' : 'Expand to full width'}
      aria-label={expanded ? 'Shrink review' : 'Expand review'}
      aria-pressed={expanded}
    >
      {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
    </button>
  )
}
