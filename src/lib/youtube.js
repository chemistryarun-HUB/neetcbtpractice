// Helpers for the level-wise lecture videos (see AdminVideos / LevelVideosModal).
//
// Admins paste whatever YouTube hands them — the address bar, the Share button's
// short link, sometimes an embed snippet — so accept every shape rather than
// asking them to hand-extract the 11-character video ID.

const URL_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
]

const BARE_ID = /^[A-Za-z0-9_-]{11}$/

/** Returns the 11-char video ID, or null if nothing recognisable is in `input`. */
export function parseYouTubeId(input) {
  const raw = (input || '').trim()
  if (!raw) return null
  if (BARE_ID.test(raw)) return raw
  for (const re of URL_PATTERNS) {
    const m = raw.match(re)
    if (m) return m[1]
  }
  return null
}

/**
 * `rel=0` keeps YouTube's post-roll suggestions inside the same channel instead
 * of sending a student off to unrelated videos the moment a lecture ends.
 */
export function youtubeEmbedUrl(id, { autoplay = false } = {}) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  if (autoplay) params.set('autoplay', '1')
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function youtubeThumbUrl(id) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}

export function youtubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`
}

/** unit/level → videos[], sorted the way the admin arranged them. */
export function groupVideosByUnitLevel(rows) {
  const map = {}
  for (const v of rows || []) {
    if (!map[v.unit_id]) map[v.unit_id] = {}
    if (!map[v.unit_id][v.level]) map[v.unit_id][v.level] = []
    map[v.unit_id][v.level].push(v)
  }
  for (const levels of Object.values(map)) {
    for (const list of Object.values(levels)) {
      list.sort((a, b) => (a.sort_order - b.sort_order) || a.title.localeCompare(b.title))
    }
  }
  return map
}
