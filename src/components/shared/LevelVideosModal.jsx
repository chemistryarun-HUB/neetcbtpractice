import { useState } from 'react'
import { X, Play, ExternalLink } from 'lucide-react'
import { youtubeEmbedUrl, youtubeThumbUrl, youtubeWatchUrl } from '../../lib/youtube'
import { levelBadge } from '../../lib/constants'

/**
 * Lecture player a student opens from a level card before attempting that level.
 * Single video → just the player. Multiple → player plus a numbered playlist,
 * because a level's lectures are taught in order and jumping in at part 3 is
 * rarely what anyone wants.
 */
export default function LevelVideosModal({ unitId, levelId, levelName, videos, onClose, onStartTest }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = videos[activeIdx]
  if (!active) return null

  const isLast = activeIdx === videos.length - 1

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-video" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
              {levelBadge(unitId, levelId)} · {videos.length} lecture{videos.length !== 1 ? 's' : ''}
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{levelName}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '1rem 1.25rem' }}>
          <div className="video-frame">
            {/* key forces a fresh iframe per video — without it, switching playlist
                items only swaps the src and YouTube keeps the previous player state. */}
            <iframe
              key={active.id}
              src={youtubeEmbedUrl(active.youtube_id, { autoplay: activeIdx > 0 })}
              title={active.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-800)' }}>
              {videos.length > 1 && <span style={{ color: 'var(--gray-400)' }}>{activeIdx + 1}. </span>}
              {active.title}
            </div>
            <a href={youtubeWatchUrl(active.youtube_id)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Open in YouTube <ExternalLink size={12} />
            </a>
          </div>

          {videos.length > 1 && (
            <div className="video-playlist">
              {videos.map((v, i) => (
                <button key={v.id} className={`video-chip ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>
                  <span className="video-chip-thumb">
                    <img src={youtubeThumbUrl(v.youtube_id)} alt="" loading="lazy" />
                    {i === activeIdx && <span className="video-chip-playing"><Play size={12} fill="currentColor" /></span>}
                  </span>
                  <span className="video-chip-text">
                    <span className="video-chip-num">Part {i + 1}</span>
                    <span className="video-chip-title">{v.title}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>
            {!onStartTest
              ? 'Lectures are open to watch — the test unlocks once you clear the previous level.'
              : videos.length > 1 && !isLast
                ? `Watch at your own pace — ${videos.length - activeIdx - 1} more to go`
                : 'Watched it? Try the questions.'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            {onStartTest && <button className="btn btn-primary btn-sm" onClick={onStartTest}>Start Test →</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
