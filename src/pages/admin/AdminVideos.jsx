import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check, X, ExternalLink } from 'lucide-react'
import Topbar from '../../components/shared/Topbar'
import InfoTooltip from '../../components/shared/InfoTooltip'
import { NEET_CHEMISTRY_SYLLABUS, UNIT_LEVELS } from '../../lib/constants'
import { parseYouTubeId, youtubeThumbUrl, youtubeWatchUrl } from '../../lib/youtube'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
]

const CHEMISTRY_UNITS = NEET_CHEMISTRY_SYLLABUS.flatMap(s => s.units)

/**
 * Best-effort lecture title lookup. YouTube's oEmbed endpoint is CORS-open but
 * returns 401 for some unlisted/restricted videos — when that happens the admin
 * just types the title, so failure is silent by design.
 */
async function fetchYouTubeTitle(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    if (!res.ok) return null
    const json = await res.json()
    return json.title || null
  } catch {
    return null
  }
}

const BLANK_ADD = { url: '', title: '' }

export default function AdminVideos() {
  const [unitId, setUnitId] = useState('')
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingLevel, setAddingLevel] = useState(null)   // level id whose add-form is open
  const [addForm, setAddForm] = useState(BLANK_ADD)
  const [saving, setSaving] = useState(false)
  const [titleLookup, setTitleLookup] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const levelDefs = unitId ? (UNIT_LEVELS[Number(unitId)] || []) : []

  useEffect(() => {
    if (!unitId) { setVideos([]); return }
    loadVideos()
    setAddingLevel(null)
    setAddForm(BLANK_ADD)
  }, [unitId])

  async function loadVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('level_videos')
      .select('*')
      .eq('unit_id', Number(unitId))
      .order('level')
      .order('sort_order')
    if (error) toast.error(error.message)
    setVideos(data || [])
    setLoading(false)
  }

  const parsedId = parseYouTubeId(addForm.url)

  // Paste-then-lookup: fill the title box the moment a valid ID appears, but
  // never clobber something the admin already typed.
  async function handleUrlChange(url) {
    setAddForm(f => ({ ...f, url }))
    const id = parseYouTubeId(url)
    if (!id || addForm.title.trim()) return
    setTitleLookup(true)
    const title = await fetchYouTubeTitle(id)
    setTitleLookup(false)
    if (title) setAddForm(f => (f.title.trim() ? f : { ...f, title }))
  }

  function openAdd(level) {
    setAddingLevel(level)
    setAddForm(BLANK_ADD)
    setEditingId(null)
  }

  async function handleAdd(level) {
    const youtube_id = parseYouTubeId(addForm.url)
    if (!youtube_id) { toast.error('Paste a valid YouTube link or video ID'); return }
    if (!addForm.title.trim()) { toast.error('Give the lecture a title'); return }
    const inLevel = videos.filter(v => v.level === level)
    if (inLevel.some(v => v.youtube_id === youtube_id)) {
      toast.error('That video is already in this level')
      return
    }
    setSaving(true)
    const nextOrder = inLevel.length ? Math.max(...inLevel.map(v => v.sort_order)) + 1 : 0
    const { error } = await supabase.from('level_videos').insert([{
      unit_id: Number(unitId), level, title: addForm.title.trim(), youtube_id, sort_order: nextOrder,
    }])
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Lecture added')
    setAddForm(BLANK_ADD)
    setAddingLevel(null)
    loadVideos()
  }

  async function handleRename(video) {
    if (!editTitle.trim()) { toast.error('Title cannot be empty'); return }
    const { error } = await supabase.from('level_videos').update({ title: editTitle.trim() }).eq('id', video.id)
    if (error) { toast.error(error.message); return }
    setEditingId(null)
    loadVideos()
  }

  async function handleDelete(video) {
    if (!window.confirm(`Remove "${video.title}" from Level ${video.level}?\n\nThis only unlinks the lecture here — the video itself stays on YouTube.`)) return
    const { error } = await supabase.from('level_videos').delete().eq('id', video.id)
    if (error) { toast.error(error.message); return }
    toast.success('Lecture removed')
    loadVideos()
  }

  async function toggleActive(video) {
    const { error } = await supabase.from('level_videos').update({ is_active: !video.is_active }).eq('id', video.id)
    if (error) { toast.error(error.message); return }
    loadVideos()
  }

  // Swap sort_order with the neighbour rather than renumbering the whole level —
  // two writes, and any gaps in the sequence stay harmless since ordering only
  // ever compares relative values.
  async function move(video, direction) {
    const siblings = videos.filter(v => v.level === video.level)
    const idx = siblings.findIndex(v => v.id === video.id)
    const target = siblings[idx + direction]
    if (!target) return
    const [a, b] = [video.sort_order, target.sort_order]
    // Equal sort_orders (e.g. rows created before ordering mattered) would make
    // the swap a no-op — fall back to index-based values in that case.
    const [newA, newB] = a === b ? [idx + direction, idx] : [b, a]
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('level_videos').update({ sort_order: newA }).eq('id', video.id),
      supabase.from('level_videos').update({ sort_order: newB }).eq('id', target.id),
    ])
    if (e1 || e2) { toast.error((e1 || e2).message); return }
    loadVideos()
  }

  const levelsWithVideos = new Set(videos.filter(v => v.is_active).map(v => v.level))

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Lecture Videos</h2>
          {unitId && levelDefs.length > 0 && (
            <div className="text-muted">
              {levelsWithVideos.size} of {levelDefs.length} levels have lectures · {videos.length} video{videos.length !== 1 ? 's' : ''} total
            </div>
          )}
        </div>

        <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-control" style={{ width: '150px', flex: '0 0 150px' }} value="Chemistry" disabled>
              <option>Chemistry</option>
            </select>
            <select
              className="form-control"
              style={{ width: '320px', flex: '1 1 320px', maxWidth: '420px' }}
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
            >
              <option value="">— Choose a unit —</option>
              {CHEMISTRY_UNITS.map(u => (
                <option key={u.id} value={u.id}>Unit {u.id} - {u.name}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', margin: '0.75rem 0 0' }}>
            Unlisted videos work fine here — just make sure <strong>“Allow embedding”</strong> is left on in the video’s YouTube settings, or the player will show “Video unavailable”.
          </p>
        </div>

        {!unitId ? (
          <div className="empty-state">Pick a unit to manage its lecture videos.</div>
        ) : levelDefs.length === 0 ? (
          <div className="empty-state">
            This unit has no levels defined yet — add them to <code>UNIT_LEVELS</code> in <code>constants.js</code> first.
          </div>
        ) : loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {levelDefs.map(lvl => {
              const levelVideos = videos.filter(v => v.level === lvl.id)
              const isAdding = addingLevel === lvl.id
              return (
                <div key={lvl.id} className="card">
                  <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: levelVideos.length || isAdding ? '1px solid var(--gray-100)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-400)' }}>
                        Level {lvl.id}
                      </span>
                      <strong style={{ fontSize: '0.9375rem' }}>{lvl.name}</strong>
                      <InfoTooltip text={lvl.topic || lvl.name} />
                      {levelVideos.length === 0 && (
                        <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-400)' }}>no lectures</span>
                      )}
                    </div>
                    {!isAdding && (
                      <button className="btn btn-outline btn-sm" onClick={() => openAdd(lvl.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Plus size={14} /> Add lecture
                      </button>
                    )}
                  </div>

                  {levelVideos.length > 0 && (
                    <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {levelVideos.map((v, i) => (
                        <div key={v.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem',
                          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                          background: v.is_active ? '#fff' : 'var(--gray-50)', opacity: v.is_active ? 1 : 0.6,
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', width: 18, flexShrink: 0 }}>{i + 1}</span>
                          <img src={youtubeThumbUrl(v.youtube_id)} alt="" loading="lazy"
                            style={{ width: 84, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: 'var(--gray-100)' }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {editingId === v.id ? (
                              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <input className="form-control" style={{ fontSize: '0.875rem', padding: '0.3rem 0.5rem' }}
                                  value={editTitle} autoFocus
                                  onChange={e => setEditTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleRename(v); if (e.key === 'Escape') setEditingId(null) }} />
                                <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleRename(v)}><Check size={14} /></button>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setEditingId(null)}><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                                <a href={youtubeWatchUrl(v.youtube_id)} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <code>{v.youtube_id}</code> <ExternalLink size={10} />
                                </a>
                              </>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} title="Move up"
                              disabled={i === 0} onClick={() => move(v, -1)}><ArrowUp size={14} /></button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} title="Move down"
                              disabled={i === levelVideos.length - 1} onClick={() => move(v, 1)}><ArrowDown size={14} /></button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} title="Rename"
                              onClick={() => { setEditingId(v.id); setEditTitle(v.title) }}><Pencil size={14} /></button>
                            <button className="btn btn-sm" title={v.is_active ? 'Visible to students — click to hide' : 'Hidden — click to show'}
                              style={{
                                fontSize: '0.65rem', padding: '0.2rem 0.45rem', fontWeight: 700, borderRadius: 'var(--radius)', cursor: 'pointer',
                                background: v.is_active ? '#dcfce7' : '#f3f4f6', color: v.is_active ? '#15803d' : 'var(--gray-500)',
                                border: `1.5px solid ${v.is_active ? '#86efac' : 'var(--gray-300)'}`,
                              }}
                              onClick={() => toggleActive(v)}>
                              {v.is_active ? 'Live' : 'Hidden'}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem', color: '#b91c1c' }} title="Remove"
                              onClick={() => handleDelete(v)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdding && (
                    <div style={{ padding: '0.875rem 1.25rem', background: '#f8faff', borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            YouTube link or ID
                          </label>
                          <input className="form-control" style={{ fontSize: '0.875rem' }} autoFocus
                            placeholder="https://youtu.be/… or dQw4w9WgXcQ"
                            value={addForm.url}
                            onChange={e => handleUrlChange(e.target.value)} />
                          {addForm.url.trim() && !parsedId && (
                            <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.25rem' }}>
                              Couldn’t find a video ID in that — paste the full watch/share link.
                            </div>
                          )}
                        </div>
                        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Title {titleLookup && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· fetching…</span>}
                          </label>
                          <input className="form-control" style={{ fontSize: '0.875rem' }}
                            placeholder="e.g. Mole Concept — Part 1"
                            value={addForm.title}
                            onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(lvl.id) }} />
                        </div>
                        {parsedId && (
                          <img src={youtubeThumbUrl(parsedId)} alt="Preview"
                            style={{ width: 96, height: 54, objectFit: 'cover', borderRadius: 6, marginTop: '1.1rem', background: 'var(--gray-100)' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleAdd(lvl.id)}>
                          {saving ? 'Adding…' : 'Add to Level ' + lvl.id}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAddingLevel(null); setAddForm(BLANK_ADD) }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
