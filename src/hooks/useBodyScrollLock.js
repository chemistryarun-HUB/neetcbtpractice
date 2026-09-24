import { useEffect } from 'react'

/**
 * Freeze the page behind a full-screen overlay while it's mounted.
 *
 * The overlay scrolls on its own; without this, a flick that runs past the end
 * of a question scrolls the page underneath instead — on a phone, the "it
 * moves the wrong thing" complaint.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}
