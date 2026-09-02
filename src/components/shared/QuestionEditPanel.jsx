import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ImagePlus, Lock, LockOpen, Shuffle } from 'lucide-react'
import { UNIT_LEVELS, levelIdsFor } from '../../lib/constants'
import { CHEMISTRY_UNITS, deriveTopic, deriveFullTopic, unitIdOf } from '../../lib/topics'
import { uploadQuestionImage } from '../../lib/storage'
import { LOCK_COLUMNS, LOCK_COL_BY_FIELD } from '../../lib/fieldLocks'
import { correctOptionKey, resolveCorrectOptionValue } from '../../lib/questionOptions'
import { MTC_ROW_NUMS, MTC_LABELS_B, parseMtcFromText } from '../../lib/mtc'
import InfoTooltip from './InfoTooltip'

// Exactly the types already in the bank — nothing here can introduce a value
// the render surfaces don't already handle.
const QUESTION_TYPES = ['Single Choice MCQ', 'MCQ', 'Assertion Reason', 'Match the Column']

/**
 * Click-to-toggle padlock shown beside each field an Excel re-upload could
 * otherwise revert. Locked (blue) = the sheet can't touch this field; open
 * (grey) = the sheet owns it again.
 */
function FieldLock({ locked, onToggle, label }) {
  return (
    <button type="button" onClick={onToggle}
      title={locked
        ? `${label} is locked — an Excel re-upload will not overwrite it. Click to unlock.`
        : `${label} follows the Excel sheet. Click to lock the current value.`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.15rem', cursor: 'pointer',
        border: 'none', background: 'none', padding: '0 0.15rem', lineHeight: 1,
        color: locked ? '#0284c7' : 'var(--gray-300)',
      }}>
      {locked ? <Lock size={12} /> : <LockOpen size={12} />}
    </button>
  )
}

// Image field that works with already-uploaded URLs (not File objects).
function EditImageField({ label, url, uploading, onUpload, onRemove }) {
  return (
    <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {url && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <img src={url} alt={label} style={{ height: 80, maxWidth: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--gray-200)', background: '#fafafa' }} />
          <button type="button" onClick={onRemove}
            style={{ fontSize: '0.65rem', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
            Remove
          </button>
        </div>
      )}
      <label style={{ cursor: uploading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: uploading ? 'var(--gray-400)' : 'var(--primary)', fontWeight: 600, userSelect: 'none' }}>
        <ImagePlus size={13} />
        {uploading ? 'Uploading…' : url ? 'Replace Image' : 'Upload Image'}
        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
          onChange={e => { if (e.target.files[0]) { onUpload(e.target.files[0]); e.target.value = '' } }} />
      </label>
    </div>
  )
}

// Builds the initial form state from a DB row. Kept as a function (rather than
// an effect) so remounting the panel on a different question — which is what
// keying it by q.id does — always starts from that row's real values.
function initialForm(q) {
  // correctOptionKey() is the same resolver TestPage/ResultPage/grading use —
  // it checks the sentinel form ('option1'..'option4', stored for image-only
  // or duplicated-placeholder options) as well as a text match. The previous
  // text-only lookup here never recognised the sentinel at all, so opening the
  // edit form on any image-only question showed "option1" selected as correct
  // regardless of the real answer — reported against NCU25001 (qid at the time
  // was NCU24001, before the GOC/Organic-Reaction-Mechanisms unit renumbering),
  // where the real answer is option4. Confirmed no already-saved question was corrupted by
  // it: the answer_key_changes trigger logs every correct_option write, and
  // none show the sentinel-to-plain-text conversion this bug would produce.
  const correctLabel = correctOptionKey(q) || 'option1'
  return {
    question:           q.question || '',
    // Editable, so an existing question can be reclassified in place. A
    // question that turns out to be Match-the-Column otherwise has to be
    // deleted and re-added through Add Manually, which forces inventing a new
    // Q ID for a question that already has a perfectly good one.
    question_type:      q.question_type || 'Single Choice MCQ',
    option1:            q.option1 || '',
    option2:            q.option2 || '',
    option3:            q.option3 || '',
    option4:            q.option4 || '',
    correct_option_key: correctLabel,
    unit:               q.unit,
    level:              q.level,
    difficulty_level:   q.difficulty_level || 'Medium',
    question_tag:       q.question_tag || '',
    source:             q.source || '',
    is_active:          q.is_active !== false,
    // Admin override for option shuffling. Defaults to true (shuffle) — the
    // automatic detection in lib/optionShuffle.js still applies either way, so
    // this only exists for questions detection can't see, e.g. options that
    // are a deliberate sequence and read wrong out of order.
    shuffle_options:    q.shuffle_options !== false,
    // Editing here means "I've verified/fixed this by hand" — default to
    // protecting it from a future Excel re-upload clobbering it back.
    // Admin can uncheck if they genuinely want Excel to keep overriding this row.
    // Covers the content half only; the five metadata fields carry their own
    // locks below, which is what stops an Excel re-upload reverting a hand-set
    // Level or Unit (see lib/fieldLocks.js).
    content_locked:     true,
    // Per-field locks load from the row as-is — unlike content_locked, merely
    // opening the panel must not pin a field the admin never touched.
    ...Object.fromEntries(LOCK_COLUMNS.map(c => [c, !!q[c]])),
    // Match the Column — only meaningful when question_type is MTC, but set
    // unconditionally (empty string for everything else) so a legacy MTC row
    // being restructured for the first time has somewhere to type into.
    ...Object.fromEntries(MTC_ROW_NUMS.flatMap(n => [
      [`col_a${n}`, q[`col_a${n}`] || ''],
      [`col_b${n}`, q[`col_b${n}`] || ''],
    ])),
  }
}

function initialImages(q) {
  return {
    question_image: q.question_image || null,
    option1_image:  q.option1_image  || null,
    option2_image:  q.option2_image  || null,
    option3_image:  q.option3_image  || null,
    option4_image:  q.option4_image  || null,
    ...Object.fromEntries(MTC_ROW_NUMS.flatMap(n => [
      [`col_a${n}_image`, q[`col_a${n}_image`] || null],
      [`col_b${n}_image`, q[`col_b${n}_image`] || null],
    ])),
  }
}

/**
 * Edit form for one question. Owns its own state and the Supabase write, then
 * hands the caller the merged row via onSaved so the caller can patch it into a
 * list in place — no full refetch, so the admin never loses their scroll
 * position mid-review.
 *
 * Mount it keyed by question id (`key={q.id}`) so switching questions resets it.
 */
export default function QuestionEditPanel({ q, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialForm(q))
  const [imgUrls, setImgUrls] = useState(() => initialImages(q))
  const [uploading, setUploading] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  // Setting one of the five lockable fields to a value different from the one
  // in the DB pins it automatically: typing a Level here means "this is the
  // Level I want", and the next Excel re-upload silently reverting it is the
  // whole bug this exists to stop. Editing it back to the stored value leaves
  // the lock alone, so a no-op keystroke doesn't pin anything, and the padlock
  // beside the field is always there to override either way.
  function setLockable(field, value, extra = {}) {
    const lockCol = LOCK_COL_BY_FIELD[field]
    const changed = String(value ?? '') !== String(q[field] ?? '')
    setForm(f => ({ ...f, [field]: value, ...(changed ? { [lockCol]: true } : {}), ...extra }))
  }

  function toggleLock(lockCol) {
    setForm(f => ({ ...f, [lockCol]: !f[lockCol] }))
  }

  // Level choices are driven by whichever unit the form currently points at — a
  // hardcoded 1-9 list used to hide the real levels of any unit with more than
  // nine (Unit 3 has 11, so "Miscellaneous" was unreachable).
  const editUnitId = unitIdOf(form.unit)
  const levelDefs = UNIT_LEVELS[editUnitId] || []
  const levelOptions = (() => {
    const opts = levelDefs.length > 0
      ? levelDefs.map(l => ({ id: l.id, label: `Level ${l.id}: ${l.name}` }))
      : levelIdsFor(editUnitId).map(id => ({ id, label: `Level ${id}` }))
    // Keep whatever the row is already tagged with selectable even if it isn't a
    // defined level, so merely opening the panel can't silently retag the question.
    const current = Number(form.level)
    if (current && !opts.some(o => o.id === current)) {
      opts.push({ id: current, label: `Level ${current} (not defined for this unit)` })
      opts.sort((a, b) => a.id - b.id)
    }
    return opts
  })()

  async function uploadFor(field, file) {
    setUploading(prev => new Set(prev).add(field))
    try {
      const publicUrl = await uploadQuestionImage(file)
      setImgUrls(prev => ({ ...prev, [field]: publicUrl }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(prev => { const s = new Set(prev); s.delete(field); return s })
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Same rule the Excel importer uses (questionOptions.js): store the
      // option's own text only when it's non-empty AND unique among the four,
      // otherwise the positional sentinel. The old version here treated any
      // non-empty text as safe to store, which is exactly wrong for an
      // image-only question where every option reads the same placeholder
      // ("Image") — saving would have pointed correct_option at whichever
      // option happened to be first with that text, not the one selected.
      const resolvedCorrect = resolveCorrectOptionValue(
        form.correct_option_key, [form.option1, form.option2, form.option3, form.option4])
      const patch = {
        question:         form.question,
        question_type:    form.question_type,
        option1:          form.option1,
        option2:          form.option2,
        option3:          form.option3,
        option4:          form.option4,
        correct_option:   resolvedCorrect,
        unit:             form.unit,
        level:            Number(form.level),
        topic:            deriveTopic(form.unit, form.level),
        difficulty_level: form.difficulty_level,
        question_tag:     form.question_tag || null,
        source:           form.source || null,
        is_active:        form.is_active,
        shuffle_options:  form.shuffle_options,
        content_locked:   form.content_locked,
        // Persisting these is what makes the padlocks mean anything — the Excel
        // importer reads them back to decide which columns it may overwrite.
        ...Object.fromEntries(LOCK_COLUMNS.map(c => [c, !!form[c]])),
        question_image:   imgUrls.question_image ?? null,
        option1_image:    imgUrls.option1_image  ?? null,
        option2_image:    imgUrls.option2_image  ?? null,
        option3_image:    imgUrls.option3_image  ?? null,
        option4_image:    imgUrls.option4_image  ?? null,
      }
      // Match the Column's structured columns only ever apply to MTC rows —
      // gated on the row's actual type (not just presence of form.col_a1, since
      // that's always populated as '' above) so a Single MCQ/A-R edit can never
      // accidentally write col_a/col_b columns.
      if (form.question_type === 'Match the Column') {
        for (const n of MTC_ROW_NUMS) {
          patch[`col_a${n}`] = form[`col_a${n}`]
          patch[`col_a${n}_image`] = imgUrls[`col_a${n}_image`] ?? null
          patch[`col_b${n}`] = form[`col_b${n}`]
          patch[`col_b${n}_image`] = imgUrls[`col_b${n}_image`] ?? null
        }
      }
      const { error } = await supabase.from('questions').update(patch).eq('id', q.id)
      if (error) throw error
      toast.success('Question updated')
      onSaved({ ...q, ...patch })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Ctrl/Cmd+S saves without reaching for the mouse — the whole point of the
  // reviewer flow is keeping hands on the keyboard while going question by
  // question. Held in a ref so the listener always calls the latest closure.
  const saveRef = useRef(handleSave)
  saveRef.current = handleSave
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem 1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.875rem', color: '#92400e' }}>
        Editing: <code>{q.qid}</code>
        <span style={{ fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.75rem', color: '#b45309' }}>
          — changes save to Supabase; student history is preserved
        </span>
      </div>

      {/* Question type — changing it to Match the Column reveals the column
          editor below, so a question already in the bank can be converted in
          place instead of being re-created under a new Q ID. */}
      <div className="form-group" style={{ margin: '0 0 0.75rem', maxWidth: '260px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Question Type</label>
        <select className="form-control" style={{ fontSize: '0.875rem' }}
          value={form.question_type}
          onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}>
          {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {form.question_type === 'Match the Column' && q.question_type !== 'Match the Column' && (
          <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 4, padding: '0.35rem 0.5rem' }}>
            Converting to Match the Column. Fill the Column A / Column B rows below — the answer options stay exactly as they are.
          </div>
        )}
      </div>

      {/* Question text + image */}
      <div className="form-group" style={{ margin: '0 0 0.75rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Question Text</label>
        <textarea className="form-control" rows={3} style={{ fontSize: '0.875rem', resize: 'vertical' }}
          value={form.question}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
        <EditImageField
          label="Question Image"
          url={imgUrls.question_image}
          uploading={uploading.has('question_image')}
          onUpload={file => uploadFor('question_image', file)}
          onRemove={() => setImgUrls(u => ({ ...u, question_image: null }))}
        />
      </div>

      {/* Match the Column — per-item text + optional image, same fields Add
          Manually collects. Legacy rows (created before this existed) start with
          all 8 blank here even though their old flattened text still lives in
          Question Text above; filling these in switches that row over to the
          structured table display. */}
      {form.question_type === 'Match the Column' && (
        <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--gray-200)', marginBottom: '0.75rem' }}>
          {/* Read the table back out of the flattened question text instead of
              making the admin retype it. Every MTC row in the bank predates the
              structured fields, and the biggest of them is 11 items — retyping
              that per question is the reason MTC went unused. The parse only
              fills the boxes; nothing is saved until Save, so the admin sees
              exactly what it found and can fix anything before committing. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', background: '#eff6ff', borderBottom: '1px solid var(--gray-200)' }}>
            <button type="button"
              onClick={() => {
                const r = parseMtcFromText(form.question)
                if (!r.colA.length && !r.colB.length) {
                  toast.error('Could not find a Column I / Column II list in the question text — fill the rows in by hand.', { duration: 6000 })
                  return
                }
                setForm(f => {
                  const next = { ...f }
                  MTC_ROW_NUMS.forEach(n => {
                    next[`col_a${n}`] = r.colA[n - 1] || ''
                    next[`col_b${n}`] = r.colB[n - 1] || ''
                  })
                  return next
                })
                const over = r.overflowA + r.overflowB
                toast.success(
                  `Filled ${r.colA.length} + ${r.colB.length} items.` +
                  (over ? ` ${over} more didn't fit in ${MTC_ROW_NUMS.length} rows.` : '') +
                  ' Check them, then Save.',
                  { duration: 6000 })
              }}
              style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.7rem', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none' }}>
              ⤓ Fill rows from question text
            </button>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
              Reads the Column I / Column II list above into these boxes. Nothing saves until you press Save.
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--gray-700, #374151)' }}>
            <div style={{ padding: '0.4rem 0.75rem', fontWeight: 700, color: '#fff', fontSize: '0.75rem', borderRight: '1px solid rgba(255,255,255,0.15)' }}>COLUMN A</div>
            <div style={{ padding: '0.4rem 0.75rem', fontWeight: 700, color: '#fff', fontSize: '0.75rem' }}>COLUMN B</div>
          </div>
          {MTC_ROW_NUMS.map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--gray-150, #e8ecf0)', background: '#fff' }}>
              <div style={{ padding: '0.4rem 0.6rem', borderRight: '1px solid var(--gray-200)' }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>{i}.</span>
                  <input className="form-control" style={{ flex: 1, minWidth: 0, padding: '0.2rem 0.35rem', fontSize: '0.8125rem', border: 'none', background: 'transparent', boxShadow: 'none' }}
                    value={form[`col_a${i}`]}
                    onChange={e => setForm(f => ({ ...f, [`col_a${i}`]: e.target.value }))} />
                </div>
                <EditImageField
                  url={imgUrls[`col_a${i}_image`]}
                  uploading={uploading.has(`col_a${i}_image`)}
                  onUpload={file => uploadFor(`col_a${i}_image`, file)}
                  onRemove={() => setImgUrls(u => ({ ...u, [`col_a${i}_image`]: null }))}
                />
              </div>
              <div style={{ padding: '0.4rem 0.6rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>{MTC_LABELS_B[i - 1]}.</span>
                  <input className="form-control" style={{ flex: 1, minWidth: 0, padding: '0.2rem 0.35rem', fontSize: '0.8125rem', border: 'none', background: 'transparent', boxShadow: 'none' }}
                    value={form[`col_b${i}`]}
                    onChange={e => setForm(f => ({ ...f, [`col_b${i}`]: e.target.value }))} />
                </div>
                <EditImageField
                  url={imgUrls[`col_b${i}_image`]}
                  uploading={uploading.has(`col_b${i}_image`)}
                  onUpload={file => uploadFor(`col_b${i}_image`, file)}
                  onRemove={() => setImgUrls(u => ({ ...u, [`col_b${i}_image`]: null }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[1, 2, 3, 4].map(i => {
          const key = `option${i}`
          const imgKey = `option${i}_image`
          const isCorrect = form.correct_option_key === key
          return (
            <div key={i} style={{ padding: '0.45rem 0.625rem', borderRadius: 'var(--radius)', background: isCorrect ? '#f0fdf4' : 'var(--gray-50)', border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}` }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: isCorrect ? '#15803d' : 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                <input type="radio" name={`edit-correct-${q.id}`} checked={isCorrect}
                  onChange={() => setForm(f => ({ ...f, correct_option_key: key }))} />
                Option {i}{isCorrect ? ' ✓ correct' : ''}
              </label>
              <input className="form-control" style={{ fontSize: '0.8125rem', border: 'none', background: 'transparent', boxShadow: 'none', padding: '0' }}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              <EditImageField
                label={`Option ${i} Image`}
                url={imgUrls[imgKey]}
                uploading={uploading.has(imgKey)}
                onUpload={file => uploadFor(imgKey, file)}
                onRemove={() => setImgUrls(u => ({ ...u, [imgKey]: null }))}
              />
            </div>
          )
        })}
      </div>

      {/* Metadata row — each of these five carries its own padlock, because
          these are exactly the columns an Excel re-upload rewrites. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ margin: 0, flex: '1.4 1 190px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Unit
            <FieldLock label="Unit" locked={form.unit_locked} onToggle={() => toggleLock('unit_locked')} />
          </label>
          <select className="form-control" style={{ fontSize: '0.8125rem' }}
            value={editUnitId || ''}
            onChange={e => {
              const unit = CHEMISTRY_UNITS.find(u => u.id === Number(e.target.value))
              // Moving to a different unit means the old level number almost
              // certainly doesn't map to the same topic there — reset to Level 1
              // so it doesn't silently point at the wrong syllabus. That reset is
              // a real value change, so it pins Level too: a stale sheet row
              // carrying the OLD unit's level must not drag it back.
              setLockable('unit', unit ? `Unit ${unit.id} - ${unit.name}` : '', { level: 1, level_locked: true })
            }}>
            {CHEMISTRY_UNITS.map(u => <option key={u.id} value={u.id}>Unit {u.id} — {u.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1.2 1 200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Level
            <InfoTooltip text={deriveFullTopic(form.unit, form.level)} align="left" />
            <FieldLock label="Level" locked={form.level_locked} onToggle={() => toggleLock('level_locked')} />
          </label>
          <select className="form-control" style={{ fontSize: '0.8125rem' }}
            value={form.level}
            onChange={e => setLockable('level', e.target.value)}>
            {levelOptions.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0.6 1 110px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Difficulty
            <FieldLock label="Difficulty" locked={form.difficulty_locked} onToggle={() => toggleLock('difficulty_locked')} />
          </label>
          <select className="form-control" style={{ fontSize: '0.8125rem' }}
            value={form.difficulty_level}
            onChange={e => setLockable('difficulty_level', e.target.value)}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Question Tag
            <FieldLock label="Question Tag" locked={form.tag_locked} onToggle={() => toggleLock('tag_locked')} />
          </label>
          <input className="form-control" style={{ fontSize: '0.8125rem' }}
            value={form.question_tag}
            onChange={e => setLockable('question_tag', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Source
            <FieldLock label="Source" locked={form.source_locked} onToggle={() => toggleLock('source_locked')} />
          </label>
          <input className="form-control" style={{ fontSize: '0.8125rem' }}
            value={form.source}
            onChange={e => setLockable('source', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', paddingBottom: '0.4rem', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Is Active
          </label>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', paddingBottom: '0.4rem', whiteSpace: 'nowrap' }}
            title={'Options are shuffled for every attempt so a student cannot memorise "the answer is C". Untick for a question whose options must stay in the authored order — a deliberate sequence, for instance. Questions saying "All of the above" or "Both (b) and (c)" are detected and handled automatically, with or without this.'}>
            <input type="checkbox" checked={form.shuffle_options} onChange={e => setForm(f => ({ ...f, shuffle_options: e.target.checked }))} />
            <Shuffle size={13} /> Shuffle options
          </label>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', paddingBottom: '0.4rem', whiteSpace: 'nowrap' }}
            title="Covers the question text, options, correct answer and images only. Unit, Level, Difficulty, Tag and Source are NOT covered by this — each has its own padlock above, because a re-upload re-syncs those by design.">
            <input type="checkbox" checked={form.content_locked} onChange={e => setForm(f => ({ ...f, content_locked: e.target.checked }))} />
            <Lock size={13} /> Lock question &amp; options from Excel
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <span style={{ alignSelf: 'center', fontSize: '0.7rem', color: 'var(--gray-400)' }}>
          Ctrl+S to save · Esc to cancel
        </span>
      </div>
    </div>
  )
}
