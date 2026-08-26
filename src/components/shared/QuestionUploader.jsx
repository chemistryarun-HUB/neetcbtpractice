import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Upload, Plus, Search, ChevronDown, ChevronUp, ImagePlus, Lock, Maximize2 } from 'lucide-react'
import { UNIT_LEVELS, levelBadge } from '../../lib/constants'
import { CHEMISTRY_UNITS, deriveTopic, deriveFullTopic, unitIdOf } from '../../lib/topics'
import { LOCK_COLUMNS, planLockedUpload, lockSummary, hasAnyFieldLock } from '../../lib/fieldLocks'
import { uploadQuestionImage } from '../../lib/storage'
import InfoTooltip from './InfoTooltip'
import QuestionView from './QuestionView'
import QuestionReviewer from './QuestionReviewer'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(val) {
  return val && UUID_RE.test(val) ? val : null
}

// Standard Assertion-Reason options (NEET pattern)
const AR_OPTIONS = [
  'Both Assertion (A) and Reason (R) are true and Reason is the correct explanation of Assertion.',
  'Both Assertion (A) and Reason (R) are true but Reason is NOT the correct explanation of Assertion.',
  'Assertion (A) is true but Reason (R) is false.',
  'Assertion (A) is false but Reason (R) is true.',
]

const BLANK = {
  qid: '',
  question_type: 'Single Choice MCQ',   // 'Single Choice MCQ' | 'Assertion-Reason' | 'Match the Column'
  chapter_name: '',
  // Single MCQ
  question: '',
  question_image_file: null,
  option1: '', option1_image_file: null,
  option2: '', option2_image_file: null,
  option3: '', option3_image_file: null,
  option4: '', option4_image_file: null,
  correct_option_label: 'Option 1',
  // Assertion-Reason
  assertion: '',
  assertion_image_file: null,  // stored as question_image in DB
  reason: '',
  reason_image_file: null,
  ar_correct: 'A',
  // Match the Column
  col_a1: '', col_a1_image_file: null,
  col_a2: '', col_a2_image_file: null,
  col_a3: '', col_a3_image_file: null,
  col_a4: '', col_a4_image_file: null,
  col_b1: '', col_b1_image_file: null,
  col_b2: '', col_b2_image_file: null,
  col_b3: '', col_b3_image_file: null,
  col_b4: '', col_b4_image_file: null,
  mtc_option1: '', mtc_option2: '', mtc_option3: '', mtc_option4: '',
  mtc_correct_label: 'Option 1',
  // Common
  difficulty_level: 'Medium',
  question_tag: '',
  source: '',
}

// Inline image-upload field with thumbnail preview
function ImageField({ label, file, onChange }) {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      {label && <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{label}</span>}
      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        {preview
          ? <img src={preview} alt="" style={{ width: 56, height: 38, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--gray-200)' }} />
          : <div style={{ width: 56, height: 38, background: 'var(--gray-100)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--gray-300)' }}>
              <ImagePlus size={15} style={{ color: 'var(--gray-400)' }} />
            </div>
        }
        <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>{file ? '✓ Change' : '+ Image'}</span>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onChange(e.target.files[0] || null)} />
      </label>
      {file && (
        <button type="button" style={{ fontSize: '0.65rem', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          onClick={() => onChange(null)}>✕ Remove</button>
      )}
    </div>
  )
}

// Maps a topic string to its level number for a given unit using UNIT_LEVELS definitions.
// Matching is case-insensitive and trims whitespace.
// Returns 1 if the topic is not found in the unit's level definitions.
// Resolve a sheet's "Unit" cell to a real unit id, tolerantly — one bulk sheet
// spans a dozen units and nobody is going to type the canonical label exactly.
// Accepts "27", "Unit 27", "Unit 27 - Nucleophilic Substitution (SN1/SN2)", or
// just the name. Returns null when it matches nothing, which the caller reports
// rather than guessing: a mistyped unit silently landing 40 questions in the
// wrong module is far worse than being told to fix the cell.
function resolveUnitId(raw) {
  const s = String(raw || '').trim()
  if (!s) return null

  const num = s.match(/^(?:unit\s*)?(\d{1,2})\b/i)
  if (num) {
    const id = Number(num[1])
    if (CHEMISTRY_UNITS.some(u => u.id === id)) return id
  }

  // Name match — ignore a leading "Unit N -", punctuation and spacing, so
  // "d & f Block" and "d and f block elements" both land.
  const norm = t => String(t).toLowerCase().replace(/^unit\s*\d+\s*[-–—:]\s*/, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
  const target = norm(s)
  if (!target) return null
  const exact = CHEMISTRY_UNITS.find(u => norm(u.name) === target)
  return exact ? exact.id : null
}

// "1", "Level 1", "level-1", "L2", " 3 " — the column is already called Level,
// so the digits in it are the level. Returns null for a cell with no number at
// all, which sends the caller to its topic-name fallback.
function parseLevel(raw) {
  const m = String(raw || '').match(/\d{1,2}/)
  return m ? Number(m[0]) : null
}

function topicToLevel(unitId, topic) {
  const levels = UNIT_LEVELS[unitId]
  if (!levels) return 1
  const t = (topic || '').trim().toLowerCase()
  const match = levels.find(l => l.topic.trim().toLowerCase() === t)
  return match ? match.id : 1
}

// Resolve "Option 1"/"Option 2"/.../"1"/"2"/... to the actual option text
function resolveCorrectOption(label, option1, option2, option3, option4) {
  const textMap = {
    'option 1': option1, '1': option1,
    'option 2': option2, '2': option2,
    'option 3': option3, '3': option3,
    'option 4': option4, '4': option4,
  }
  // Image-only options have no text — fall back to a stable 'option1'..'option4'
  // sentinel so the correct answer isn't lost as an empty string (see
  // questionOptions.js for where this is resolved back).
  const keyMap = {
    'option 1': 'option1', '1': 'option1',
    'option 2': 'option2', '2': 'option2',
    'option 3': 'option3', '3': 'option3',
    'option 4': 'option4', '4': 'option4',
  }
  const norm = (label || '').trim().toLowerCase()
  return textMap[norm] || keyMap[norm] || label || ''
}

const PAGE_SIZE = 50

const SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Mathematics']

export default function QuestionUploader({ uploadedBy }) {
  const [tab, setTab] = useState('list')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')   // unit id as string e.g. '11'
  const [levelFilter, setLevelFilter] = useState('')
  // Reviewing happens in a full-screen overlay (QuestionReviewer) rather than an
  // inline row panel — the row panel only ever got the bottom half of a window
  // whose top half was chrome, which is the wrong shape for judging a question
  // the way a student will see it. `reviewIndex` indexes into visibleQuestions.
  const [reviewIndex, setReviewIndex] = useState(null)
  const [reviewStartInEdit, setReviewStartInEdit] = useState(false)
  const [statusFilter, setStatusFilter] = useState('active') // 'active' | 'inactive' | 'both'
  const [page, setPage] = useState(1)
  // Find Duplicates tab state
  const [dupeGroups, setDupeGroups] = useState(null) // null = not yet loaded; else [{ key, items }]
  const [dupeLoading, setDupeLoading] = useState(false)
  const [dupePreviewId, setDupePreviewId] = useState(null)   // which question's inline preview is open
  const [dupePreviewLoadingId, setDupePreviewLoadingId] = useState(null)
  const [dupeFullById, setDupeFullById] = useState({})       // id -> fully-loaded question row, fetched lazily on first expand
  // Upload Excel tab — subject/unit selection
  const [uploadSubject, setUploadSubject] = useState('')
  const [uploadUnitId, setUploadUnitId] = useState('')
  // Parsed sheet awaiting confirmation — nothing is written while this is set.
  const [pendingUpload, setPendingUpload] = useState(null)
  const [uploading, setUploading] = useState(false)
  // Add Manually tab — subject/unit/level selection (separate from list filters)
  const [manualSubject, setManualSubject] = useState('')
  const [manualUnitId, setManualUnitId] = useState('')
  const [manualLevel, setManualLevel] = useState('')

  const availableLevels = unitFilter ? (UNIT_LEVELS[Number(unitFilter)] || []) : []

  function buildQuestionsQuery() {
    let q = supabase.from('questions').select('*')
    // Filter by unit — Unit 11 keeps a loose match as a leftover safety net from
    // when its rows carried "d and f" / "d- and f-" spellings. Audited 2026-08-24:
    // all 636 of them now read "Unit 11 - d & f Block Elements" and nothing else,
    // and uploads build `unit` from CHEMISTRY_UNITS, so no new variant can appear.
    // Kept because it costs nothing and matches whatever spelling turns up.
    if (unitFilter) {
      const uid = Number(unitFilter)
      if (uid === 11) {
        q = q.ilike('unit', '%f Block Elements%')
      } else {
        const unit = CHEMISTRY_UNITS.find(u => u.id === uid)
        if (unit) q = q.ilike('unit', `%${unit.name}%`)
      }
    }
    if (levelFilter) q = q.eq('level', Number(levelFilter))
    // Sorting is redone client-side after fetch (see loadQuestions) so unit/level
    // grouping works correctly by numeric unit order even when browsing all units
    // at once — the `unit` column is free text ("Unit 11 - ..."), which sorts
    // wrong alphabetically ("Unit 10" before "Unit 2").
    q = q.order('qid', { ascending: true })
    if (statusFilter === 'active') q = q.eq('is_active', true)
    else if (statusFilter === 'inactive') q = q.eq('is_active', false)
    // Uploaded but not released. Scoped to is_active for the same reason the
    // banner tally is — a retired question is not waiting on anybody.
    else if (statusFilter === 'pending') q = q.eq('is_published', false).eq('is_active', true)
    // 'both' — no is_active filter
    return q
  }

  // Leading unit number from the free-text `unit` column, for numeric sorting.
  function unitNumOf(q) {
    return Number((q.unit || '').match(/^Unit\s+(\d+)/i)?.[1]) || 999
  }

  async function loadQuestions() {
    setLoading(true)
    // Paginated — a single Supabase request caps at 1000 rows, which the bank
    // has grown past, so an unfiltered/large result silently got truncated.
    const all = []
    for (let from = 0; ; from += 1000) {
      const { data: page } = await buildQuestionsQuery().range(from, from + 999)
      all.push(...(page || []))
      if (!page || page.length < 1000) break
    }
    // Numeric unit order, then level, then qid — lets the admin scan the whole
    // bank (or an unfiltered "all inactive" view) unit-by-unit and level-by-level
    // at a glance, not just within one pre-selected unit.
    all.sort((a, b) => unitNumOf(a) - unitNumOf(b) || (a.level ?? 0) - (b.level ?? 0) || (a.qid || '').localeCompare(b.qid || '', undefined, { numeric: true }))
    setQuestions(all)
    setLoading(false)
  }

  // Reset downstream filters and reload when parent filter changes
  useEffect(() => { setUnitFilter(''); setLevelFilter('') }, [subjectFilter])
  useEffect(() => { setLevelFilter('') }, [unitFilter])
  useEffect(() => { loadQuestions() }, [unitFilter, levelFilter, statusFilter])

  // Every single-question mutation (activate/deactivate, edit save) patches the
  // already-loaded rows in place instead of refetching. A refetch flips `loading`
  // on, which unmounts the table inside its own scroll container and drops the
  // admin back at the top of the level — losing their place after every single
  // decision, which is exactly what makes reviewing a level unusable.
  //
  // The consequence is that a question deactivated while the Active-only filter
  // is on stays visible (struck through and flagged) until the next real load.
  // That's the better behaviour here: it keeps the list stable mid-review and
  // leaves the decision one click away from being undone.
  function patchQuestion(id, patch) {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)))
    // Find Duplicates keeps its own copy of the rows; a re-scan there would also
    // throw away any "Not a duplicate" dismissals made earlier in the session.
    setDupeGroups(prev => prev && prev.map(g => ({ ...g, items: g.items.map(q => (q.id === id ? { ...q, ...patch } : q)) })))
  }

  async function setActive(id, isActive) {
    const { error } = await supabase.from('questions').update({ is_active: isActive }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(isActive ? 'Restored to active' : 'Marked inactive')
    patchQuestion(id, { is_active: isActive })
    // Retiring/restoring moves a question in or out of the review queue.
    refreshPendingCounts()
  }

  const markInactive = id => setActive(id, false)
  const markActive = id => setActive(id, true)

  // ── Review gate ───────────────────────────────────────────────────────────
  // Uploaded questions arrive is_published = false (DB default) and stay hidden
  // from students until released here. is_active is deliberately NOT touched by
  // any of this: a question the admin retired stays retired through a publish.

  async function setPublished(id, isPublished) {
    const { error } = await supabase.from('questions').update({ is_published: isPublished }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(isPublished ? 'Published — students can see it now' : 'Unpublished — hidden from students')
    patchQuestion(id, { is_published: isPublished })
    refreshPendingCounts()
  }

  // Releases a whole level at once — the unit the admin actually works in, and
  // what they asked for. Scoped by the exact `unit` string rather than a unit id
  // because that column is free text and is what the rows themselves carry.
  async function publishLevel(unit, level) {
    const { data, error } = await supabase.from('questions')
      .update({ is_published: true })
      .eq('unit', unit).eq('level', level).eq('is_published', false).eq('is_active', true)
      .select('id')
    if (error) { toast.error(error.message); return }
    const n = (data || []).length
    if (!n) { toast('Nothing pending in this level.'); return }
    toast.success(`${n} question${n !== 1 ? 's' : ''} published — ${levelBadge(unitIdOf(unit), level)} is live for students`)
    setQuestions(prev => prev.map(q =>
      q.unit === unit && q.level === level ? { ...q, is_published: true } : q))
    refreshPendingCounts()
  }

  async function unpublishLevel(unit, level) {
    const { data, error } = await supabase.from('questions')
      .update({ is_published: false })
      .eq('unit', unit).eq('level', level).eq('is_published', true)
      .select('id')
    if (error) { toast.error(error.message); return }
    const n = (data || []).length
    toast.success(`${n} question${n !== 1 ? 's' : ''} hidden from students`)
    setQuestions(prev => prev.map(q =>
      q.unit === unit && q.level === level ? { ...q, is_published: false } : q))
    refreshPendingCounts()
  }

  // Bank-wide pending tally, independent of the current filters — without this
  // a level uploaded months ago and never released is invisible unless the
  // admin happens to filter to it.
  //
  // Scoped to is_active as well, and everything else about "pending" is scoped
  // the same way: a question the admin retires mid-review is dealt with, not
  // waiting on them, and counting it would leave a warning banner that can
  // never reach zero. Retiring one is therefore also a way to clear it from
  // the queue. Restoring it later brings it back as unpublished, which is
  // right — it goes out to students only when someone says so.
  const [pendingRows, setPendingRows] = useState([])
  const refreshPendingCounts = useCallback(async () => {
    const all = []
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase.from('questions')
        .select('unit, level').eq('is_published', false).eq('is_active', true)
        .range(from, from + 999)
      if (error) return
      all.push(...(page || []))
      if (!page || page.length < 1000) break
    }
    setPendingRows(all)
  }, [])
  useEffect(() => { refreshPendingCounts() }, [refreshPendingCounts])

  // unit+level → pending count, for the badges on the level headers.
  const pendingByLevel = useMemo(() => {
    const m = {}
    for (const r of pendingRows) m[`${r.unit}||${r.level}`] = (m[`${r.unit}||${r.level}`] || 0) + 1
    return m
  }, [pendingRows])
  const pendingTotal = pendingRows.length
  const pendingLevelCount = Object.keys(pendingByLevel).length

  async function loadDuplicates() {
    setDupeLoading(true)
    // Paginated — same 1000-row cap as loadQuestions, and missing rows here
    // means missed duplicates rather than just an undercount.
    const data = []
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase.from('questions')
        .select('id, qid, question, level, source, is_active, created_at')
        .order('qid', { ascending: true })
        .range(from, from + 999)
      if (error) { toast.error(error.message); setDupeLoading(false); return }
      data.push(...(page || []))
      if (!page || page.length < 1000) break
    }

    // Every (question_id, group_key) an admin already ruled "not a
    // duplicate" — fetched fresh on each scan so a dismissal made in an
    // earlier session, or by someone else, is honoured here too. Without
    // this, "Not a duplicate" only ever removed the pair from local React
    // state: it looked handled, then came right back on the next refresh,
    // with nothing distinguishing it from a pair nobody had reviewed yet.
    const dismissed = new Set()
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase.from('dupe_dismissals')
        .select('question_id, group_key')
        .range(from, from + 999)
      if (error) { toast.error(error.message); setDupeLoading(false); return }
      for (const row of page || []) dismissed.add(`${row.question_id}|${row.group_key}`)
      if (!page || page.length < 1000) break
    }

    // Group by first 80 chars of question text (trimmed, lowercased for comparison)
    const groups = {}
    for (const q of data) {
      const key = (q.question || '').trim().substring(0, 80).toLowerCase()
      if (dismissed.has(`${q.id}|${key}`)) continue
      if (!groups[key]) groups[key] = []
      groups[key].push(q)
    }
    // Keyed by the grouping key (not array index) so a group can be safely
    // removed or shrunk — via "Not a duplicate" — without index drift.
    // Newest-first: a group is ranked by its most recently created question, so
    // duplicates from a just-uploaded batch surface at the top instead of being
    // buried wherever their Q ID happens to sort alphabetically.
    const dupes = Object.entries(groups)
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({
        key,
        items: [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      }))
      .sort((a, b) => new Date(b.items[0].created_at) - new Date(a.items[0].created_at))
    setDupeGroups(dupes)
    setDupePreviewId(null)
    setDupeLoading(false)
  }

  // Full row (options, images, correct answer, etc.) is only fetched once a
  // question is actually expanded — the initial scan stays cheap across the
  // whole bank by selecting just enough fields to group and list.
  async function toggleDupePreview(dq) {
    if (dupePreviewId === dq.id) { setDupePreviewId(null); return }
    if (!dupeFullById[dq.id]) {
      setDupePreviewLoadingId(dq.id)
      const { data, error } = await supabase.from('questions').select('*').eq('id', dq.id).single()
      setDupePreviewLoadingId(null)
      if (error) { toast.error(error.message); return }
      setDupeFullById(prev => ({ ...prev, [dq.id]: data }))
    }
    setDupePreviewId(dq.id)
  }

  // Removes one question from its group — for the many false positives the
  // 80-char-prefix heuristic produces (same opening line, genuinely different
  // question). Persisted to dupe_dismissals FIRST, and the row is only
  // removed from the list once that write actually succeeds — an admin
  // watching it disappear must be able to trust that it's really gone, not
  // just gone until the next refresh (which is exactly what only updating
  // local state used to do). ignoreDuplicates makes a double-click or a
  // pair already dismissed elsewhere a harmless no-op instead of an error.
  async function dismissFromDupeGroup(groupKey, qId) {
    const { error } = await supabase.from('dupe_dismissals')
      .upsert({ question_id: qId, group_key: groupKey }, { onConflict: 'question_id,group_key', ignoreDuplicates: true })
    if (error) { toast.error(`Couldn't save that — try again. (${error.message})`); return }
    setDupeGroups(prev => prev
      .map(g => g.key === groupKey ? { ...g, items: g.items.filter(q => q.id !== qId) } : g)
      .filter(g => g.items.length > 1))
  }

  const uploadImage = uploadQuestionImage

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualSubject) { toast.error('Select a Subject'); return }
    if (!manualUnitId)  { toast.error('Select a Unit'); return }
    if (!manualLevel)   { toast.error('Select a Level'); return }

    setSubmitting(true)
    try {
      const selectedUnit = CHEMISTRY_UNITS.find(u => u.id === Number(manualUnitId))
      const unitLabel = `Unit ${selectedUnit.id} - ${selectedUnit.name}`
      const unitLevelDefs = UNIT_LEVELS[Number(manualUnitId)] || []
      const topic = unitLevelDefs.find(l => l.id === Number(manualLevel))?.name || ''

      // Upload question / assertion image first
      const qImgFile = form.question_type === 'Assertion-Reason' ? form.assertion_image_file : form.question_image_file
      const qImgUrl = qImgFile ? await uploadImage(qImgFile) : null

      const base = {
        qid:             form.qid,
        question_type:   form.question_type,
        subject:         manualSubject,
        unit:            unitLabel,
        chapter_name:    form.chapter_name,
        topic,
        level:           Number(manualLevel),
        difficulty_level: form.difficulty_level,
        question_tag:    form.question_tag || null,
        source:          form.source || null,
        uploaded_by:     toUuidOrNull(uploadedBy),
        question_image:  qImgUrl,
      }

      let record
      if (form.question_type === 'Single Choice MCQ') {
        const [o1u, o2u, o3u, o4u] = await Promise.all([
          form.option1_image_file ? uploadImage(form.option1_image_file) : null,
          form.option2_image_file ? uploadImage(form.option2_image_file) : null,
          form.option3_image_file ? uploadImage(form.option3_image_file) : null,
          form.option4_image_file ? uploadImage(form.option4_image_file) : null,
        ])
        record = {
          ...base,
          question:      form.question,
          option1: form.option1, option1_image: o1u,
          option2: form.option2, option2_image: o2u,
          option3: form.option3, option3_image: o3u,
          option4: form.option4, option4_image: o4u,
          correct_option: resolveCorrectOption(form.correct_option_label, form.option1, form.option2, form.option3, form.option4),
        }
      } else if (form.question_type === 'Assertion-Reason') {
        const reasonImgUrl = form.reason_image_file ? await uploadImage(form.reason_image_file) : null
        const arIdx = ['A', 'B', 'C', 'D'].indexOf(form.ar_correct)
        record = {
          ...base,
          question:      `Assertion (A): ${form.assertion}\nReason (R): ${form.reason}`,
          option1: AR_OPTIONS[0], option2: AR_OPTIONS[1],
          option3: AR_OPTIONS[2], option4: AR_OPTIONS[3],
          correct_option: AR_OPTIONS[arIdx],
          reason_image:   reasonImgUrl,
        }
      } else {
        // Match the Column — each of the 8 items carries its own optional
        // image alongside its text, uploaded in parallel like the MCQ options
        // above. The table itself renders from these structured columns via
        // <MatchTable>, not from `question` — so `question` here is just the
        // optional intro line, the same way MCQ option text was never part of
        // search either.
        const [a1, a2, a3, a4, b1, b2, b3, b4] = await Promise.all([
          form.col_a1_image_file ? uploadImage(form.col_a1_image_file) : null,
          form.col_a2_image_file ? uploadImage(form.col_a2_image_file) : null,
          form.col_a3_image_file ? uploadImage(form.col_a3_image_file) : null,
          form.col_a4_image_file ? uploadImage(form.col_a4_image_file) : null,
          form.col_b1_image_file ? uploadImage(form.col_b1_image_file) : null,
          form.col_b2_image_file ? uploadImage(form.col_b2_image_file) : null,
          form.col_b3_image_file ? uploadImage(form.col_b3_image_file) : null,
          form.col_b4_image_file ? uploadImage(form.col_b4_image_file) : null,
        ])
        record = {
          ...base,
          question: form.question.trim() || 'Match the following:',
          col_a1: form.col_a1, col_a1_image: a1,
          col_a2: form.col_a2, col_a2_image: a2,
          col_a3: form.col_a3, col_a3_image: a3,
          col_a4: form.col_a4, col_a4_image: a4,
          col_b1: form.col_b1, col_b1_image: b1,
          col_b2: form.col_b2, col_b2_image: b2,
          col_b3: form.col_b3, col_b3_image: b3,
          col_b4: form.col_b4, col_b4_image: b4,
          option1: form.mtc_option1, option2: form.mtc_option2,
          option3: form.mtc_option3, option4: form.mtc_option4,
          correct_option: resolveCorrectOption(form.mtc_correct_label, form.mtc_option1, form.mtc_option2, form.mtc_option3, form.mtc_option4),
        }
      }

      // A hand-added question could arguably go straight out — the admin just
      // typed every field. It still lands unpublished, because one rule ("nothing
      // reaches students until you publish it") is easier to trust than two, and
      // the level's publish button is one click away.
      const { error } = await supabase.from('questions').insert([record])
      if (error) throw error
      toast.success('Question added — publish its level to show it to students.', { duration: 6000 })
      setForm(BLANK)
      setManualSubject(''); setManualUnitId(''); setManualLevel('')
      loadQuestions()
      refreshPendingCounts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    // The Unit dropdown is now a FALLBACK, not a requirement: a sheet carrying
    // its own "Unit" column can span as many units as it likes in one upload.
    // Only rows with no unit of their own need the dropdown, so the guard is
    // deferred until we know whether any such row exists.
    if (!uploadSubject) {
      toast.error('Please select Subject before uploading.')
      return
    }

    const selectedUnit = CHEMISTRY_UNITS.find(u => u.id === Number(uploadUnitId))

    // Returns '' for missing/blank cells instead of the literal string "undefined"
    // (String(undefined) === "undefined", which is truthy and used to slip past validation)
    function cell(row, key) {
      const v = row[key]
      return v === undefined || v === null ? '' : String(v).trim()
    }

    // Normalize a sheet's rows: trim header whitespace, fill blanks
    function readSheetRows(ws) {
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      return rawRows.map(r => {
        const norm = {}
        for (const [k, v] of Object.entries(r)) norm[k.trim()] = v
        return norm
      })
    }

    const reader = new FileReader()
    reader.onload = async evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })

        // Prefer the first sheet, but fall back to any other sheet in the workbook
        // that actually has recognizable "Q ID"/"Question" headers with data —
        // handles workbooks with a leading instructions/title sheet.
        let rows = []
        let usedSheetName = wb.SheetNames[0]
        for (const name of wb.SheetNames) {
          const candidateRows = readSheetRows(wb.Sheets[name])
          const hasData = candidateRows.some(r => cell(r, 'Q ID') && cell(r, 'Question'))
          if (hasData) { rows = candidateRows; usedSheetName = name; break }
          if (rows.length === 0) rows = candidateRows // keep first sheet as fallback for error reporting
        }

        const records = []
        const skipped = []
        const badUnits = []      // rows whose Unit cell matched no unit
        const noUnit = []        // rows with no Unit cell and no dropdown to fall back on
        const levelFixed = []    // rows whose Level doesn't exist in their unit

        for (const r of rows) {
          const qid      = cell(r, 'Q ID')
          const question = cell(r, 'Question')

          if (!qid || !question) { skipped.push(qid || '(no Q ID)'); continue }

          // Per-row unit, falling back to the dropdown. Accepts a "Unit" or
          // "Unit ID" header.
          const unitCell = cell(r, 'Unit') || cell(r, 'Unit ID')
          let unitIdNum
          if (unitCell) {
            const resolved = resolveUnitId(unitCell)
            if (!resolved) { badUnits.push({ qid, value: unitCell }); continue }
            unitIdNum = resolved
          } else if (selectedUnit) {
            unitIdNum = selectedUnit.id
          } else {
            noUnit.push(qid); continue
          }

          // Always rebuilt from CHEMISTRY_UNITS, never from the sheet's text —
          // this is what keeps exactly one unit string per unit in the bank.
          const rowUnit = CHEMISTRY_UNITS.find(u => u.id === unitIdNum)
          const unitLabel = `Unit ${rowUnit.id} - ${rowUnit.name}`

          const option1  = cell(r, 'Option 1')
          const option2  = cell(r, 'Option 2')
          const option3  = cell(r, 'Option 3')
          const option4  = cell(r, 'Option 4')
          const topic    = cell(r, 'Topic')

          const correctLabel   = cell(r, 'Correct Option')
          const correct_option = resolveCorrectOption(correctLabel, option1, option2, option3, option4)

          // Read Level from the Excel "Level" column, falling back to a
          // topic-name lookup in UNIT_LEVELS and finally to 1.
          //
          // parseLevel is tolerant for the same reason resolveUnitId is: people
          // write "Level 1" and "L2" in a column already labelled Level. The
          // old test was `!isNaN(Number(raw))`, so anything but a bare number
          // fell through to the topic lookup — "Level 1" happened to come back
          // as 1 and looked fine, while "Level 2" silently became Level 1 with
          // nothing said. Reading the digits means the cell is obeyed, and a
          // level the unit doesn't define is caught by the guard below.
          const rawLevel = cell(r, 'Level')
          const parsedLevel = parseLevel(rawLevel)
          let level = parsedLevel ?? topicToLevel(unitIdNum, topic)

          // A level the unit doesn't define is a silent black hole: the student
          // dashboard renders levels from UNIT_LEVELS, so a question parked at
          // Level 3 of a one-level module exists in the bank and is visible to
          // nobody. Pull it back to the unit's first level and say so, rather
          // than accepting a number that can never be reached. Only applies to
          // units that actually declare their levels.
          const known = UNIT_LEVELS[unitIdNum]
          if (known?.length && !known.some(l => l.id === level)) {
            levelFixed.push({ qid, from: level, to: known[0].id, unit: rowUnit.name })
            level = known[0].id
          }

          records.push({
            qid,
            question_type:    cell(r, 'Question Type') || 'MCQ',
            subject:          uploadSubject,
            unit:             unitLabel,
            chapter_name:     cell(r, 'Chapter Name'),
            topic,
            level,
            question,
            option1,
            option2,
            option3,
            option4,
            correct_option,
            difficulty_level: cell(r, 'Difficulty Level') || 'Medium',
            question_tag:     cell(r, 'Question Tag'),
            source:           cell(r, 'Source'),
            uploaded_by:      toUuidOrNull(uploadedBy),
          })
        }

        // Duplicate Q IDs within the same file blow up a single upsert batch
        // (Postgres: "ON CONFLICT DO UPDATE command cannot affect row a second time").
        // Keep the last occurrence of each qid and warn so it's obvious in the toast.
        const byQid = new Map()
        for (const rec of records) byQid.set(rec.qid, rec)
        const dedupedRecords = Array.from(byQid.values())
        const duplicateCount = records.length - dedupedRecords.length

        if (dedupedRecords.length === 0 && !badUnits.length && !noUnit.length) {
          const sampleHeaders = rows[0] ? Object.keys(rows[0]).join(', ') : '(sheet appears empty)'
          toast.error(
            `No valid rows found in sheet "${usedSheetName}". Expected columns "Q ID" and "Question" ` +
            `but found: ${sampleHeaders}`,
            { duration: 8000 }
          )
          return
        }

        // Nothing is written yet. A sheet spanning a dozen units is exactly the
        // case where a wrong guess is expensive to unpick, so the admin gets to
        // see where every row is about to land — and what could not be placed —
        // before any of it reaches the bank. commitUpload() does the writing.
        setPendingUpload({
          fileName: file.name,
          sheetName: usedSheetName,
          records: dedupedRecords,
          duplicateCount,
          skipped,
          badUnits,
          noUnit,
          levelFixed,
        })
        return
      } catch (err) {
        console.error('Excel parse failed:', err)
        toast.error(err.message || 'Could not read that file — see console for details.', { duration: 8000 })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // The write half, run only after the admin confirms the preview above.
  async function commitUpload() {
    const p = pendingUpload
    if (!p) return
    setUploading(true)
    try {
      {
        const dedupedRecords = p.records
        const { duplicateCount, skipped } = p

        // Locks decide, per existing row, which columns this sheet may overwrite:
        //   content_locked → skip the content half (question/options/answer/images)
        //   unit_locked, level_locked, …  → skip that one metadata field
        // Both are looked up together here. Q IDs with no row yet aren't in the
        // result at all, which is what makes new questions insert with every value
        // straight from the sheet — locks only ever apply to rows being re-touched.
        const allQids = dedupedRecords.map(r => r.qid)
        const lockByQid = new Map()
        const LOOKUP_BATCH = 500
        for (let i = 0; i < allQids.length; i += LOOKUP_BATCH) {
          const { data: lockRows, error: lookupErr } = await supabase
            .from('questions')
            .select(['qid', 'content_locked', ...LOCK_COLUMNS].join(', '))
            .in('qid', allQids.slice(i, i + LOOKUP_BATCH))
          if (lookupErr) throw lookupErr
          for (const row of lockRows) lockByQid.set(row.qid, row)
        }

        const { fullRecords, partialUpdates, contentLockedCount, fieldLockCounts } =
          planLockedUpload(dedupedRecords, lockByQid)

        const BATCH = 500
        for (let i = 0; i < fullRecords.length; i += BATCH) {
          const { error } = await supabase
            .from('questions')
            .upsert(fullRecords.slice(i, i + BATCH), { onConflict: 'qid' })
          if (error) throw error
        }
        // Locked rows are guaranteed to already exist (that's how lockByQid was built),
        // so this must be a plain UPDATE, not an upsert — Postgres checks NOT NULL
        // constraints (question, option1-4, correct_option) against the INSERT branch
        // of "ON CONFLICT DO UPDATE" before it even resolves the conflict, so omitting
        // those columns from an upsert payload fails even though only a row that already
        // satisfies them would ever be touched.
        for (const { qid, fields } of partialUpdates) {
          const { error } = await supabase.from('questions').update(fields).eq('qid', qid)
          if (error) throw error
        }

        const parts = [`${dedupedRecords.length} questions uploaded successfully!`]
        if (contentLockedCount) parts.push(`${contentLockedCount} were 🔒 content-locked — question/options/answer preserved.`)
        const pinned = Object.entries(fieldLockCounts).filter(([, n]) => n > 0)
        if (pinned.length) parts.push(`🔒 Kept manual values for ${pinned.map(([label, n]) => `${label} (${n})`).join(', ')}.`)
        if (skipped.length) parts.push(`${skipped.length} skipped (missing Q ID or Question).`)
        if (duplicateCount) parts.push(`${duplicateCount} duplicate Q ID(s) in file — kept last occurrence.`)
        // Say it on the upload itself, not only in the banner: the whole point
        // of the gate is that this step no longer puts anything in front of
        // students, and that is surprising unless it is stated here.
        parts.push('New questions are hidden from students until you publish their level.')
        toast.success(parts.join(' '), { duration: 9000 })
        setPendingUpload(null)
        loadQuestions()
        refreshPendingCounts()
      }
    } catch (err) {
      console.error('Excel upload failed:', err)
      toast.error(err.message || 'Upload failed — see console for details.', { duration: 8000 })
    } finally {
      setUploading(false)
    }
  }

  const filtered = questions.filter(q => {
    const s = search.toLowerCase()
    return !s ||
      (q.question || '').toLowerCase().includes(s) ||
      (q.qid || '').toLowerCase().includes(s) ||
      (q.question_tag || '').toLowerCase().includes(s) ||
      (q.topic || '').toLowerCase().includes(s)
  })

  // Reset to page 1 when any filter/search changes
  useEffect(() => { setPage(1) }, [search, unitFilter, levelFilter, statusFilter])

  // When a filter is active, show all results so nothing is hidden behind pages —
  // includes a non-default status filter, since browsing "Inactive" is meant to
  // show every inactive question across the bank at a glance, not 50 at a time.
  const isFiltering = search.trim() !== '' || unitFilter !== '' || levelFilter !== '' || statusFilter !== 'active'
  const visibleQuestions = isFiltering ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function openReview(q, startInEdit = false) {
    const i = visibleQuestions.findIndex(x => x.id === q.id)
    if (i < 0) return
    setReviewStartInEdit(startInEdit)
    setReviewIndex(i)
  }

  // Closing the reviewer puts the admin back on the row they last had open —
  // after walking twenty questions with the arrow keys, landing back on the row
  // they started from would be its own kind of lost place.
  function closeReview() {
    const q = visibleQuestions[reviewIndex]
    setReviewIndex(null)
    setReviewStartInEdit(false)
    if (q) {
      requestAnimationFrame(() => {
        document.getElementById(`qrow-${q.id}`)?.scrollIntoView({ block: 'center' })
      })
    }
  }

  return (
    <div>
      {/* Tighter than the shared .tabs default (1.5rem) — inline override so
          the other pages reusing .tabs (AdminKeyChanges, AdminStudents)
          aren't affected. */}
      <div className="tabs" style={{ marginBottom: '0.75rem' }}>
        <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Question List</button>
        <button className={`tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Add Manually</button>
        <button className={`tab-btn ${tab === 'excel' ? 'active' : ''}`} onClick={() => setTab('excel')}>Upload Excel</button>
        <button className={`tab-btn ${tab === 'dupes' ? 'active' : ''}`} onClick={() => { setTab('dupes'); if (!dupeGroups) loadDuplicates() }}>Find Duplicates</button>
      </div>

      {/* Full-screen reviewer. It walks visibleQuestions — whatever the filters
          are currently showing — so "review this level" is just: filter to the
          level, open the first question, then hold →. */}
      {tab === 'list' && reviewIndex != null && visibleQuestions[reviewIndex] && (
        <QuestionReviewer
          questions={visibleQuestions}
          index={reviewIndex}
          onIndexChange={setReviewIndex}
          onClose={closeReview}
          onToggleActive={q => setActive(q.id, q.is_active === false)}
          onTogglePublished={q => setPublished(q.id, q.is_published === false)}
          onSaved={row => patchQuestion(row.id, row)}
          startInEdit={reviewStartInEdit}
        />
      )}

      {/* ── LIST ── */}
      {/* The one thing this feature must not do is lose questions silently. An
          upload that is never published is invisible to students AND easy for
          the admin to forget, so the tally is shown on every tab of this page,
          not tucked inside the list, and it links straight to the queue. */}
      {pendingTotal > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '0.6rem 0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>{pendingTotal} question{pendingTotal !== 1 ? 's' : ''}</strong> across{' '}
            <strong>{pendingLevelCount} level{pendingLevelCount !== 1 ? 's' : ''}</strong> {pendingTotal !== 1 ? 'are' : 'is'} waiting to be reviewed. Students cannot see {pendingTotal !== 1 ? 'them' : 'it'} yet.
          </span>
          <button className="btn btn-sm"
            style={{ marginLeft: 'auto', background: '#92400e', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}
            onClick={() => { setTab('list'); setStatusFilter('pending'); setUnitFilter(''); setLevelFilter(''); setSearch('') }}>
            Show them
          </button>
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          {/* Chrome is kept to two tight rows — every pixel spent here is a pixel
              the question list doesn't get. Reading a question happens in the
              full-screen reviewer, not in this card. */}
          <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem 0.875rem' }}>
            {/* Row 1: search + count + review entry point */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                <Search size={16} />
                <input
                  className="form-control"
                  style={{ border: 'none', boxShadow: 'none', padding: '0', fontSize: '1rem' }}
                  placeholder="Search by Q ID, question, tag or topic…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{filtered.length} questions</span>
              {visibleQuestions.length > 0 && (
                <button className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', padding: '0.3rem 0.7rem' }}
                  onClick={() => openReview(visibleQuestions[0])}
                  title="Open the first question full screen, then walk the list with ← / →">
                  <Maximize2 size={14} /> Review {visibleQuestions.length} full screen
                </button>
              )}
            </div>

            {/* Row 2: Subject → Unit → Level cascade */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Subject */}
              <select
                className="form-control"
                style={{ width: '150px', flex: '0 0 150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {SUBJECTS.map(s => (
                  <option key={s} value={s} disabled={s !== 'Chemistry'}>{s}{s !== 'Chemistry' ? ' (coming soon)' : ''}</option>
                ))}
              </select>

              {/* Unit — visible once a subject is chosen */}
              {subjectFilter && (
                <select
                  className="form-control"
                  style={{ width: '240px', flex: '1 1 240px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  value={unitFilter}
                  onChange={e => setUnitFilter(e.target.value)}
                >
                  <option value="">All Units</option>
                  {CHEMISTRY_UNITS.map(u => (
                    <option key={u.id} value={u.id}>Unit {u.id} - {u.name}</option>
                  ))}
                </select>
              )}

              {/* Level — visible once a unit is chosen */}
              {unitFilter && (
                <select
                  className="form-control"
                  style={{ width: '220px', flex: '1 1 220px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                >
                  <option value="">All Levels</option>
                  {availableLevels.length > 0
                    ? availableLevels.map(l => (
                        <option key={l.id} value={l.id}>Level {l.id}: {l.name}</option>
                      ))
                    : <option disabled value="">No levels defined yet</option>
                  }
                </select>
              )}

              {/* Reset filters link */}
              {(subjectFilter || unitFilter || levelFilter) && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}
                  onClick={() => { setSubjectFilter(''); setUnitFilter(''); setLevelFilter('') }}>
                  ✕ Reset filters
                </button>
              )}

              {/* Active / Inactive / Both — selecting Inactive or Both shows every
                  matching question across the whole bank at once (see isFiltering),
                  grouped unit-wise then level-wise, so a mass of inactive questions
                  can be scanned at a glance instead of hunting unit by unit. */}
              <select
                className="form-control"
                style={{ width: '170px', flex: '0 0 170px', marginLeft: 'auto', fontWeight: statusFilter !== 'active' ? 700 : 400, color: statusFilter === 'inactive' ? '#b91c1c' : statusFilter === 'pending' ? '#92400e' : statusFilter === 'both' ? 'var(--primary)' : undefined }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="active">Active Qs</option>
                <option value="pending">Awaiting review{pendingTotal ? ` (${pendingTotal})` : ''}</option>
                <option value="inactive">Inactive Qs</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {/* Taller than the shared 70vh default — this list is the whole point
              of the page, so it gets whatever the two header rows don't. */}
          <div className="table-wrap" style={{ maxHeight: 'max(360px, calc(100vh - 250px))' }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Q ID</th>
                    <th style={{ width: '120px' }}>Unit</th>
                    <th>Topic</th>
                    <th style={{ width: '64px', textAlign: 'center' }}>Level</th>
                    <th style={{ textAlign: 'center' }}>Question</th>
                    <th style={{ width: '80px' }}>Difficulty</th>
                    <th>Tag</th>
                    <th>Source</th>
                    <th style={{ width: '96px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => { let lastUnit = null; let lastLevel = null; return visibleQuestions.map(q => {
                    const isInactive = q.is_active === false
                    // Uploaded but not yet released. Distinct from inactive: this
                    // one is waiting on the admin, not retired by them.
                    const isPending = q.is_published === false
                    // Browsing "All Units" (no unitFilter) additionally groups by unit,
                    // so e.g. every inactive question across the whole bank can be
                    // scanned unit-by-unit and level-by-level in one view instead of
                    // having to pick one unit at a time.
                    const showUnitHeader = !unitFilter && q.unit !== lastUnit
                    if (showUnitHeader) { lastUnit = q.unit; lastLevel = null }
                    const showLevelHeader = !levelFilter && (showUnitHeader || q.level !== lastLevel)
                    if (showLevelHeader) lastLevel = q.level
                    const unitCount = showUnitHeader ? filtered.filter(x => x.unit === q.unit).length : 0
                    const levelCount = showLevelHeader ? filtered.filter(x => x.unit === q.unit && x.level === q.level).length : 0
                    return (
                      <Fragment key={q.id}>
                        {showUnitHeader && (
                          <tr>
                            <td colSpan={9} style={{ padding: '0.6rem 0.75rem', background: 'var(--gray-700, #374151)', borderTop: '1px solid var(--gray-200)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                {q.unit}
                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.7)' }}>· {unitCount} question{unitCount !== 1 ? 's' : ''}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {showLevelHeader && (
                          <tr>
                            <td colSpan={9} style={{ padding: '0.5rem 0.75rem', background: 'var(--gray-100)', borderTop: '1px solid var(--gray-200)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                                {levelBadge(unitIdOf(q.unit), q.level)}: {deriveTopic(q.unit, q.level) || q.topic || '—'}
                                <InfoTooltip text={deriveFullTopic(q.unit, q.level)} />
                                <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {levelCount} question{levelCount !== 1 ? 's' : ''}</span>
                                <button className="btn btn-ghost btn-sm"
                                  style={{ marginLeft: '0.35rem', fontSize: '0.7rem', padding: '0.1rem 0.45rem', color: 'var(--primary)', fontWeight: 700 }}
                                  onClick={() => openReview(q)}
                                  title="Open this level in the full-screen reviewer and walk it with ← / →">
                                  ▶ Review this level
                                </button>
                                {/* Publish control, level-wise. Same click-the-badge
                                    idiom as a practice paper's Active/Inactive chip. */}
                                {(() => {
                                  const nPending = pendingByLevel[`${q.unit}||${q.level}`] || 0
                                  return nPending > 0 ? (
                                    <button
                                      onClick={() => publishLevel(q.unit, q.level)}
                                      title={`${nPending} question${nPending !== 1 ? 's' : ''} here have not been released. Students cannot see them yet — click to publish the level.`}
                                      style={{ marginLeft: 'auto', border: '1px solid #fcd34d', background: '#fef9c3', color: '#92400e', fontWeight: 700, fontSize: '0.7rem', borderRadius: 999, padding: '0.15rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                      {nPending} awaiting review — click to publish
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => unpublishLevel(q.unit, q.level)}
                                      title="Live for students. Click to pull this level back out of sight."
                                      style={{ marginLeft: 'auto', border: '1px solid #86efac', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.7rem', borderRadius: 999, padding: '0.15rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                      Live ✓
                                    </button>
                                  )
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          id={`qrow-${q.id}`}
                          style={{
                            cursor: 'pointer',
                            opacity: isInactive ? 0.55 : 1,
                            background: isInactive ? '#fef2f2' : isPending ? '#fffbeb' : undefined,
                          }}
                          onClick={() => openReview(q)}
                          title="Click to review full screen"
                        >
                          <td>
                            <code style={{ fontSize: '0.75rem', textDecoration: isInactive ? 'line-through' : 'none', color: isInactive ? '#ef4444' : undefined }}>{q.qid}</code>
                            {isInactive && <span style={{ marginLeft: '0.35rem', fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '3px', padding: '0 4px' }}>inactive</span>}
                            {isPending && !isInactive && (
                              <span
                                onClick={e => { e.stopPropagation(); setPublished(q.id, true) }}
                                title="Not yet released — students cannot see this question. Click to publish just this one."
                                style={{ marginLeft: '0.35rem', fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '3px', padding: '0 4px', cursor: 'pointer' }}>
                                unpublished
                              </span>
                            )}
                            {(q.content_locked || hasAnyFieldLock(q)) && (
                              <Lock size={11} style={{ marginLeft: '0.35rem', verticalAlign: 'middle', color: '#0284c7' }} title={lockSummary(q)} />
                            )}
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--gray-500)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.unit}>{q.unit}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deriveTopic(q.unit, q.level) || q.topic}</td>
                          <td style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                            {q.level}
                            <InfoTooltip text={deriveFullTopic(q.unit, q.level) || q.topic} />
                          </td>
                          <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center', textDecoration: isInactive ? 'line-through' : 'none', color: isInactive ? 'var(--gray-400)' : undefined }}>{q.question}</td>
                          <td>
                            <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{q.question_tag}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.source}>{q.source}</td>
                          {/* Edit and the Active/Inactive toggle used to live here too —
                              moved out of the list row since both are one click away inside
                              the full-screen reviewer (its own Edit button, and the A key /
                              Active-Inactive toggle there — see QuestionReviewer.jsx), and
                              this row only needs to get someone into that view. */}
                          <td onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Review full screen"
                              onClick={() => openReview(q)}
                            >
                              <Maximize2 size={12} /> Review
                            </button>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  }) })()}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && <div className="empty-state">No questions found</div>}
            {!isFiltering && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span style={{ color: 'var(--gray-500)' }}>Page {page} of {totalPages} · {filtered.length} total</span>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
            )}
            {isFiltering && filtered.length > 0 && (
              <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} — all shown
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL ── */}
      {tab === 'manual' && (
        <div className="card" style={{ maxWidth: '780px' }}>
          {/* Form header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>Add Question</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.1rem' }}>Fill in the details below — all starred fields are required</div>
            </div>
            {/* Question type pills */}
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['Single Choice MCQ', 'Assertion-Reason', 'Match the Column'].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, question_type: t }))}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: form.question_type === t ? 'var(--primary, #3b82f6)' : 'var(--gray-100)',
                    color: form.question_type === t ? '#fff' : 'var(--gray-500)',
                  }}>
                  {t === 'Single Choice MCQ' ? 'MCQ' : t === 'Assertion-Reason' ? 'A-R' : 'MTC'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleManualSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* ── Row 1: Subject → Unit → Level ── */}
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', padding: '0.875rem 1rem', background: '#f8faff', borderRadius: 'var(--radius)', border: '1px solid #dbeafe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginRight: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>Context</span>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: '145px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject *</label>
                <select className="form-control" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }} value={manualSubject}
                  onChange={e => { setManualSubject(e.target.value); setManualUnitId(''); setManualLevel('') }} required>
                  <option value="">— choose —</option>
                  {SUBJECTS.map(s => <option key={s} value={s} disabled={s !== 'Chemistry'}>{s}{s !== 'Chemistry' ? ' (soon)' : ''}</option>)}
                </select>
              </div>
              {manualSubject && (
                <div className="form-group" style={{ margin: 0, minWidth: '240px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unit *</label>
                  <select className="form-control" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }} value={manualUnitId}
                    onChange={e => { setManualUnitId(e.target.value); setManualLevel('') }} required>
                    <option value="">— choose —</option>
                    {CHEMISTRY_UNITS.map(u => <option key={u.id} value={u.id}>Unit {u.id} — {u.name}</option>)}
                  </select>
                </div>
              )}
              {manualUnitId && (
                <div className="form-group" style={{ margin: 0, minWidth: '175px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Level *</label>
                  {/* Named levels for any unit that defines them (this used to be
                      hardcoded to Unit 11, leaving every other unit with a bare
                      1-9 number box). The unit's last level is always the Complete
                      Chapter Test, which draws from the other levels rather than
                      owning questions, so it's never an authoring target. */}
                  {(UNIT_LEVELS[Number(manualUnitId)] || []).length > 0 ? (
                    <select className="form-control" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }} value={manualLevel} onChange={e => setManualLevel(e.target.value)} required>
                      <option value="">— choose —</option>
                      {UNIT_LEVELS[Number(manualUnitId)].slice(0, -1).map(l => <option key={l.id} value={l.id}>L{l.id}: {l.name}</option>)}
                    </select>
                  ) : (
                    <input type="number" className="form-control" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }} min={1} max={9} placeholder="1 – 9"
                      value={manualLevel} onChange={e => setManualLevel(e.target.value)} required />
                  )}
                </div>
              )}
            </div>

            {/* ── Row 2: QID + metadata ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Q ID *</label>
                <input className="form-control" placeholder="e.g. CU11001" value={form.qid}
                  onChange={e => setForm(f => ({ ...f, qid: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Difficulty</label>
                <select className="form-control" value={form.difficulty_level}
                  onChange={e => setForm(f => ({ ...f, difficulty_level: e.target.value }))}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Question Tag</label>
                <input className="form-control" placeholder="e.g. Transition Elements" value={form.question_tag}
                  onChange={e => setForm(f => ({ ...f, question_tag: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Source</label>
                <input className="form-control" placeholder="e.g. NCERT, PYQ 2023" value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
              </div>
            </div>

            {/* ══════════ SINGLE CHOICE MCQ ══════════ */}
            {form.question_type === 'Single Choice MCQ' && (
              <>
                {/* Question */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid #dbeafe' }}>
                  <div style={{ background: '#2563eb', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>QUESTION</span>
                    <ImageField label="" file={form.question_image_file} onChange={f => setForm(v => ({ ...v, question_image_file: f }))} />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <textarea className="form-control" rows={3} required placeholder="Type the question here…"
                      style={{ resize: 'vertical', fontSize: '0.9375rem' }}
                      value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
                  </div>
                </div>

                {/* Options */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--gray-200)' }}>
                  <div style={{ background: 'var(--gray-700, #374151)', padding: '0.5rem 0.875rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>OPTIONS</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map(i => {
                      const isCorrect = form.correct_option_label === `Option ${i}`
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: '0.625rem', alignItems: 'center',
                          padding: '0.5rem 0.625rem', borderRadius: 'var(--radius)',
                          background: isCorrect ? '#f0fdf4' : 'var(--gray-50)',
                          border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}`,
                          transition: 'all 0.15s',
                        }}>
                          <button type="button" title="Mark as correct"
                            onClick={() => setForm(f => ({ ...f, correct_option_label: `Option ${i}` }))}
                            style={{
                              flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.8125rem',
                              background: isCorrect ? '#16a34a' : 'var(--gray-200)',
                              color: isCorrect ? '#fff' : 'var(--gray-500)',
                            }}>
                            {String.fromCharCode(64 + i)}
                          </button>
                          <input className="form-control" required placeholder={`Option ${i}${isCorrect ? ' (correct)' : ''}`}
                            style={{ flex: 1, border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.15rem 0', fontSize: '0.9rem' }}
                            value={form[`option${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`option${i}`]: e.target.value }))} />
                          <ImageField label="" file={form[`option${i}_image_file`]}
                            onChange={f => setForm(v => ({ ...v, [`option${i}_image_file`]: f }))} />
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', paddingLeft: '0.25rem', marginTop: '0.125rem' }}>
                      Click a letter circle to mark that option as correct
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════ ASSERTION-REASON ══════════ */}
            {form.question_type === 'Assertion-Reason' && (
              <>
                {/* Assertion */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid #bfdbfe' }}>
                  <div style={{ background: '#1d4ed8', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>ASSERTION (A)</span>
                    <ImageField label="" file={form.assertion_image_file} onChange={f => setForm(v => ({ ...v, assertion_image_file: f }))} />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <textarea className="form-control" rows={2} required placeholder="Enter assertion statement…"
                      style={{ fontSize: '0.9375rem', resize: 'vertical' }}
                      value={form.assertion} onChange={e => setForm(f => ({ ...f, assertion: e.target.value }))} />
                  </div>
                </div>

                {/* Reason */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid #bbf7d0' }}>
                  <div style={{ background: '#15803d', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>REASON (R)</span>
                    <ImageField label="" file={form.reason_image_file} onChange={f => setForm(v => ({ ...v, reason_image_file: f }))} />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <textarea className="form-control" rows={2} required placeholder="Enter reason statement…"
                      style={{ fontSize: '0.9375rem', resize: 'vertical' }}
                      value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                </div>

                {/* Standard options + correct picker */}
                <div style={{ borderRadius: 'var(--radius)', border: '1.5px solid var(--gray-200)', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--gray-700, #374151)', padding: '0.5rem 0.875rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>OPTIONS — pick the correct one</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {AR_OPTIONS.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i)
                      const isCorrect = form.ar_correct === letter
                      return (
                        <div key={i} onClick={() => setForm(f => ({ ...f, ar_correct: letter }))}
                          style={{
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.12s',
                            background: isCorrect ? '#f0fdf4' : 'var(--gray-50)',
                            border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}`,
                          }}>
                          <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', background: isCorrect ? '#16a34a' : 'var(--gray-200)', color: isCorrect ? '#fff' : 'var(--gray-500)' }}>
                            {letter}
                          </div>
                          <span style={{ fontSize: '0.8375rem', color: isCorrect ? '#15803d' : 'var(--gray-600)', fontWeight: isCorrect ? 600 : 400, lineHeight: 1.5, paddingTop: '0.15rem' }}>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ══════════ MATCH THE COLUMN ══════════ */}
            {form.question_type === 'Match the Column' && (
              <>
                {/* Optional stem */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid #dbeafe' }}>
                  <div style={{ background: '#2563eb', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>QUESTION STEM <span style={{ fontWeight: 400, opacity: 0.75 }}>(optional)</span></span>
                    <ImageField label="" file={form.question_image_file} onChange={f => setForm(v => ({ ...v, question_image_file: f }))} />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <textarea className="form-control" rows={2} placeholder="Optional intro text before the match table…"
                      style={{ resize: 'vertical' }}
                      value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
                  </div>
                </div>

                {/* Match table */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--gray-200)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--gray-700, #374151)' }}>
                    <div style={{ padding: '0.5rem 0.875rem', fontWeight: 700, color: '#fff', fontSize: '0.8125rem', borderRight: '1px solid rgba(255,255,255,0.15)' }}>COLUMN A</div>
                    <div style={{ padding: '0.5rem 0.875rem', fontWeight: 700, color: '#fff', fontSize: '0.8125rem' }}>COLUMN B</div>
                  </div>
                  {[1, 2, 3, 4].map(i => {
                    const bLabel = ['p', 'q', 'r', 's'][i - 1]
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--gray-150, #e8ecf0)', background: i % 2 === 0 ? '#f8faff' : '#fff' }}>
                        <div style={{ padding: '0.4rem 0.75rem', borderRight: '1px solid var(--gray-200)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, minWidth: '1.1rem' }}>{i}.</span>
                          <input className="form-control" style={{ flex: 1, minWidth: 0, padding: '0.25rem 0.4rem', fontSize: '0.875rem', border: 'none', background: 'transparent', boxShadow: 'none' }} required
                            placeholder={`Item ${i}`} value={form[`col_a${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`col_a${i}`]: e.target.value }))} />
                          <ImageField label="" file={form[`col_a${i}_image_file`]} onChange={f => setForm(v => ({ ...v, [`col_a${i}_image_file`]: f }))} />
                        </div>
                        <div style={{ padding: '0.4rem 0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, minWidth: '1.1rem' }}>{bLabel}.</span>
                          <input className="form-control" style={{ flex: 1, minWidth: 0, padding: '0.25rem 0.4rem', fontSize: '0.875rem', border: 'none', background: 'transparent', boxShadow: 'none' }} required
                            placeholder={`Item ${bLabel}`} value={form[`col_b${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`col_b${i}`]: e.target.value }))} />
                          <ImageField label="" file={form[`col_b${i}_image_file`]} onChange={f => setForm(v => ({ ...v, [`col_b${i}_image_file`]: f }))} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Answer options */}
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--gray-200)' }}>
                  <div style={{ background: 'var(--gray-700, #374151)', padding: '0.5rem 0.875rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', letterSpacing: '0.02em' }}>ANSWER OPTIONS — enter 4 match combinations, pick the correct one</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[1, 2, 3, 4].map(i => {
                      const isCorrect = form.mtc_correct_label === `Option ${i}`
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: '0.625rem', alignItems: 'center', padding: '0.45rem 0.625rem',
                          borderRadius: 'var(--radius)', background: isCorrect ? '#f0fdf4' : 'var(--gray-50)',
                          border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}`,
                        }}>
                          <button type="button" title="Mark as correct"
                            onClick={() => setForm(f => ({ ...f, mtc_correct_label: `Option ${i}` }))}
                            style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: isCorrect ? '#16a34a' : 'var(--gray-200)', color: isCorrect ? '#fff' : 'var(--gray-500)' }}>
                            {String.fromCharCode(64 + i)}
                          </button>
                          <input className="form-control" required placeholder="e.g. 1-p, 2-q, 3-r, 4-s"
                            style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0', fontSize: '0.875rem' }}
                            value={form[`mtc_option${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`mtc_option${i}`]: e.target.value }))} />
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', paddingLeft: '0.25rem', marginTop: '0.125rem' }}>
                      Click a letter circle to mark that combination as the correct answer
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Submit ── */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid var(--gray-100)' }}>
              <button type="submit" className="btn btn-primary"
                disabled={submitting || !manualSubject || !manualUnitId || !manualLevel}
                style={{ minWidth: '140px' }}>
                <Plus size={16} /> {submitting ? 'Adding…' : 'Add Question'}
              </button>
              {(!manualSubject || !manualUnitId || !manualLevel) && (
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Select Subject, Unit and Level above to enable</span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── EXCEL ── */}
      {tab === 'excel' && (
        <div className="card card-body">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Upload Questions via Excel</h3>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Pick the subject, then upload. Add a Unit column to your sheet to send one file to many units at once — you'll see exactly where every row is going before anything is saved.
          </p>

          {/* Step 1: Subject */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Select Subject</label>
            <select
              className="form-control"
              style={{ maxWidth: '280px' }}
              value={uploadSubject}
              onChange={e => { setUploadSubject(e.target.value); setUploadUnitId('') }}
            >
              <option value="">— Choose subject —</option>
              {SUBJECTS.map(s => (
                <option key={s} value={s} disabled={s !== 'Chemistry'}>
                  {s}{s !== 'Chemistry' ? ' (coming soon)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Unit — visible after subject is chosen */}
          {uploadSubject && (
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Select Unit</label>
              <select
                className="form-control"
                style={{ maxWidth: '420px' }}
                value={uploadUnitId}
                onChange={e => setUploadUnitId(e.target.value)}
              >
                <option value="">— Choose unit —</option>
                {CHEMISTRY_UNITS.map(u => (
                  <option key={u.id} value={u.id}>Unit {u.id} - {u.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Preview — every row's destination, before anything is written. */}
          {pendingUpload && (() => {
            const byUnit = {}
            for (const r of pendingUpload.records) byUnit[r.unit] = (byUnit[r.unit] || 0) + 1
            const rows = Object.entries(byUnit).sort((a, b) =>
              (Number(a[0].match(/^Unit\s+(\d+)/)?.[1]) || 0) - (Number(b[0].match(/^Unit\s+(\d+)/)?.[1]) || 0))
            const problems = pendingUpload.badUnits.length + pendingUpload.noUnit.length
            return (
              <div style={{ border: '1.5px solid var(--primary)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem', background: 'var(--gray-50)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>
                  Ready to upload {pendingUpload.records.length} question{pendingUpload.records.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.875rem' }}>
                  from <strong>{pendingUpload.fileName}</strong> (sheet “{pendingUpload.sheetName}”) — nothing has been written yet.
                </div>

                <div className="table-wrap" style={{ maxHeight: 260, marginBottom: '0.875rem' }}>
                  <table>
                    <thead><tr><th>Going to</th><th style={{ textAlign: 'right' }}>Questions</th></tr></thead>
                    <tbody>
                      {rows.map(([unit, n]) => (
                        <tr key={unit}><td>{unit}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{n}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {problems > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.6rem 0.75rem', fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
                    <strong>{problems} row{problems !== 1 ? 's' : ''} will be skipped.</strong>
                    {pendingUpload.badUnits.length > 0 && (
                      <div style={{ marginTop: '0.35rem' }}>
                        Unit not recognised: {pendingUpload.badUnits.slice(0, 6).map(b => `${b.qid} (“${b.value}”)`).join(', ')}
                        {pendingUpload.badUnits.length > 6 ? ` and ${pendingUpload.badUnits.length - 6} more` : ''}
                      </div>
                    )}
                    {pendingUpload.noUnit.length > 0 && (
                      <div style={{ marginTop: '0.35rem' }}>
                        No Unit given and no unit selected above: {pendingUpload.noUnit.slice(0, 6).join(', ')}
                        {pendingUpload.noUnit.length > 6 ? ` and ${pendingUpload.noUnit.length - 6} more` : ''}
                      </div>
                    )}
                  </div>
                )}

                {pendingUpload.levelFixed.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '0.6rem 0.75rem', fontSize: '0.8125rem', color: '#92400e', marginBottom: '0.75rem' }}>
                    <strong>{pendingUpload.levelFixed.length} row{pendingUpload.levelFixed.length !== 1 ? 's' : ''} had a level that unit doesn’t have</strong> — moved to its first level, otherwise no student could ever see them.
                    <div style={{ marginTop: '0.35rem' }}>
                      {pendingUpload.levelFixed.slice(0, 5).map(l => `${l.qid}: L${l.from}→L${l.to} (${l.unit})`).join(', ')}
                      {pendingUpload.levelFixed.length > 5 ? ` and ${pendingUpload.levelFixed.length - 5} more` : ''}
                    </div>
                  </div>
                )}

                {(pendingUpload.skipped.length > 0 || pendingUpload.duplicateCount > 0) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
                    {pendingUpload.skipped.length > 0 && <>{pendingUpload.skipped.length} row(s) missing Q ID or Question. </>}
                    {pendingUpload.duplicateCount > 0 && <>{pendingUpload.duplicateCount} duplicate Q ID(s) in the file — last one wins.</>}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" disabled={uploading || pendingUpload.records.length === 0} onClick={commitUpload}>
                    {uploading ? 'Uploading…' : `Upload ${pendingUpload.records.length} question${pendingUpload.records.length !== 1 ? 's' : ''}`}
                  </button>
                  <button className="btn btn-ghost" disabled={uploading} onClick={() => setPendingUpload(null)}>Cancel</button>
                </div>
              </div>
            )
          })()}

          {/* Step 3: File upload */}
          <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            {uploadSubject ? (
              <>
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.875rem', background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--primary-dark)' }}>
                  Uploading as <strong>{uploadSubject}</strong>.{' '}
                  {uploadUnitId ? (
                    <>Rows without a <code>Unit</code> column go to <strong>Unit {uploadUnitId} - {CHEMISTRY_UNITS.find(u => u.id === Number(uploadUnitId))?.name}</strong>.</>
                  ) : (
                    <>No unit selected — every row must carry its own <code>Unit</code> value.</>
                  )}
                  <div style={{ marginTop: '0.35rem', color: 'var(--gray-500)' }}>
                    Add a <code>Unit</code> column to spread one sheet across many units — “27”, “Unit 27” or the unit’s name all work.
                    A <code>Level</code> column is optional; without one, questions land on the unit’s first level.
                  </div>
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={18} /> Choose Excel File (.xlsx / .xls / .csv)
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
                </label>
              </>
            ) : (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                Please select Subject first
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#166534', lineHeight: 1.8 }}>
            <strong>"Correct Option" values:</strong> must be exactly <code>Option 1</code>, <code>Option 2</code>, <code>Option 3</code>, or <code>Option 4</code><br />
            <strong>Sheet name:</strong> reads the first sheet automatically (any name is fine)<br />
            <strong>Level assignment (Unit 11 only):</strong> "General Introduction" → 1 · "General Trends" → 2 · "Oxides" → 3 · "KMnO4" → 4 · "K2Cr2O7" → 5 · "Lanthanoid" → 6 · "Actinoid" → 7 · "Miscellaneous" → 8
          </div>

          <div className="card" style={{ background: 'var(--gray-50)' }}>
            <div className="card-header">Required Column Names (exact)</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {['Q ID', 'Question Type', 'Chapter Name', 'Topic', 'Question',
                      'Option 1', 'Option 2', 'Option 3', 'Option 4',
                      'Correct Option', 'Difficulty Level', 'Question Tag', 'Source'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Q001</td>
                    <td>MCQ</td>
                    {/* Matches the chapter_name actually stored on Unit 11's rows.
                        The sheet's own Chapter Name is free text and never becomes
                        the `unit` column — that is always built from the Unit
                        dropdown above, which is why the bank has exactly one unit
                        string per unit. */}
                    <td>d- and f-Block Elements</td>
                    <td>General Introduction</td>
                    <td>Which element is a transition metal?</td>
                    <td>Fe</td>
                    <td>Na</td>
                    <td>Mg</td>
                    <td>Al</td>
                    <td>Option 1</td>
                    <td>Easy</td>
                    <td>Transition Elements</td>
                    <td>NCERT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── FIND DUPLICATES ── */}
      {tab === 'dupes' && (
        <div className="card card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Find Duplicate Questions</h3>
            <button className="btn btn-outline btn-sm" onClick={loadDuplicates} disabled={dupeLoading}>
              {dupeLoading ? 'Scanning…' : '↻ Refresh'}
            </button>
            {dupeGroups !== null && !dupeLoading && (
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                {dupeGroups.length === 0 ? 'No duplicates found.' : `${dupeGroups.length} duplicate group${dupeGroups.length !== 1 ? 's' : ''} found`}
              </span>
            )}
          </div>

          <p className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
            Questions are grouped by the first 80 characters of their text. Groups with 2+ matches are shown below —
            click a row to preview the full question and decide for yourself.
          </p>

          {dupeLoading && <div style={{ padding: '2rem', textAlign: 'center' }}>Scanning all questions…</div>}

          {!dupeLoading && dupeGroups !== null && dupeGroups.length === 0 && (
            <div className="empty-state">No duplicate questions found.</div>
          )}

          {!dupeLoading && dupeGroups && dupeGroups.map(group => (
            <div key={group.key} style={{ marginBottom: '1.25rem', border: '1px solid #fde68a', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ background: '#fefce8', padding: '0.5rem 0.875rem', fontSize: '0.75rem', color: '#92400e', borderBottom: '1px solid #fde68a', fontWeight: 600 }}>
                {group.items.length} possible duplicates
                <span style={{ fontWeight: 400, marginLeft: '0.75rem', color: '#b45309' }}>"{(group.items[0].question || '').trim().substring(0, 80)}…"</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>Q ID</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--gray-600)' }}>Lvl</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Source</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Question Preview</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--gray-600)' }}>Status</th>
                    <th style={{ padding: '0.4rem 0.75rem', width: '210px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(dq => {
                    const isExpanded = dupePreviewId === dq.id
                    const isPreviewLoading = dupePreviewLoadingId === dq.id
                    const full = dupeFullById[dq.id]
                    return (
                      <Fragment key={dq.id}>
                        <tr
                          onClick={() => toggleDupePreview(dq)}
                          style={{ borderTop: '1px solid var(--gray-100)', opacity: dq.is_active === false ? 0.55 : 1, cursor: 'pointer', background: isExpanded ? 'var(--primary-light, #eff6ff)' : undefined }}>
                          <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}>
                            <code style={{ color: dq.is_active === false ? '#ef4444' : undefined, textDecoration: dq.is_active === false ? 'line-through' : 'none' }}>{dq.qid}</code>
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>{dq.level}</td>
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{dq.source || '—'}</td>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: 'var(--gray-600)', maxWidth: '340px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isExpanded ? <ChevronUp size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} /> : <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--gray-300)' }} />}
                            <span>{isPreviewLoading ? 'Loading full question…' : `${(dq.question || '').trim().substring(0, 120)}${(dq.question || '').length > 120 ? '…' : ''}`}</span>
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>
                            {dq.is_active === false
                              ? <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600 }}>inactive</span>
                              : <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600 }}>active</span>
                            }
                          </td>
                          <td onClick={e => e.stopPropagation()} style={{ padding: '0.45rem 0.75rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {dq.is_active !== false ? (
                              <button className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#b91c1c', borderColor: '#fca5a5' }}
                                onClick={() => markInactive(dq.id)}>
                                Mark Inactive
                              </button>
                            ) : (
                              <button className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#15803d', borderColor: '#86efac' }}
                                onClick={() => markActive(dq.id)}>
                                Restore
                              </button>
                            )}
                            <button className="btn btn-outline btn-sm" title="Not actually a duplicate — remove it from this group"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--gray-500)' }}
                              onClick={() => dismissFromDupeGroup(group.key, dq.id)}>
                              Not a duplicate
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${dq.id}-preview`}>
                            <td colSpan={6} style={{ padding: 0, borderTop: 'none' }}>
                              <div style={{ padding: '0.875rem 1.25rem', background: '#f8faff', borderTop: '2px solid var(--primary, #3b82f6)', borderBottom: '1px solid var(--gray-200)' }}>
                                {isPreviewLoading || !full ? (
                                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>Loading…</div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.6rem' }}>
                                      <span title={full.unit}>{full.unit}</span>
                                      <span className={`badge badge-${(full.difficulty_level || '').toLowerCase()}`}>{full.difficulty_level}</span>
                                      {full.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{full.question_tag}</span>}
                                    </div>
                                    {/* Same renderer the full-screen reviewer uses, so deciding
                                        which of two near-identical questions to keep compares
                                        like with like. */}
                                    <QuestionView q={full} mode="admin" size="compact" />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
