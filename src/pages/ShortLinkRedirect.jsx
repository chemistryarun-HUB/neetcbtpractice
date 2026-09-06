import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { resolveShortLink } from '../lib/shortLinks'

// Deliberately public — the parent opening this from WhatsApp has no NEETCBT
// account at all, so this route sits outside ProtectedRoute entirely (see
// App.jsx). replace(), not href=, so a mistaken back-tap from the PDF doesn't
// land the parent back on this bare redirect screen.
export default function ShortLinkRedirect() {
  const { code } = useParams()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveShortLink(code).then(url => {
      if (cancelled) return
      if (url) window.location.replace(url)
      else setNotFound(true)
    }).catch(err => {
      // A lookup failure (network blip, RLS misconfigured) shouldn't strand
      // the parent on a silent spinner forever — surface the same friendly
      // message a genuinely-missing code gets.
      console.error('Short link lookup failed:', err)
      if (!cancelled) setNotFound(true)
    })
    return () => { cancelled = true }
  }, [code])

  if (notFound) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>This link isn't working.</p>
          <p style={{ fontSize: '0.875rem' }}>Please ask for the report to be sent again.</p>
        </div>
      </div>
    )
  }

  return <div className="loading-screen"><div className="spinner" /></div>
}
