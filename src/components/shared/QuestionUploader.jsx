import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Upload, Plus, Search, ChevronDown, ChevronUp, Pencil, ImagePlus, Lock } from 'lucide-react'
import { UNIT_LEVELS, UNIT_11_LEVELS } from '../../lib/constants'
import { correctOptionKey } from '../../lib/questionOptions'
import InfoTooltip from './InfoTooltip'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(val) {
  return val && UUID_RE.test(val) ? val : null
}

// Topic is derived from (unit, level) via UNIT_LEVELS — the DB `topic` column is kept in
// sync with this on every save, so level is always the single source of truth for topic.
function deriveTopic(unitString, level) {
  const match = (unitString || '').match(/^Unit\s+(\d+)\s*-/i)
  if (!match) return ''
  const unitId = Number(match[1])
  const levelDefs = UNIT_LEVELS[unitId] || []
  return levelDefs.find(l => l.id === Number(level))?.name || ''
}

// Full syllabus text for a level (as opposed to deriveTopic's short display name) — shown in the "i" tooltip.
function deriveFullTopic(unitString, level) {
  const match = (unitString || '').match(/^Unit\s+(\d+)\s*-/i)
  if (!match) return ''
  const unitId = Number(match[1])
  const levelDefs = UNIT_LEVELS[unitId] || []
  return levelDefs.find(l => l.id === Number(level))?.topic || ''
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
  col_a1: '', col_a2: '', col_a3: '', col_a4: '',
  col_b1: '', col_b2: '', col_b3: '', col_b4: '',
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

// Image field for the Edit panel — works with already-uploaded URLs (not File objects)
function EditImageField({ label, url, uploading, onUpload, onRemove }) {
  return (
    <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {url && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <img src={url} alt={label} style={{ height: 80, maxWidth: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--gray-200)', background: '#fafafa' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button type="button" onClick={onRemove}
              style={{ fontSize: '0.65rem', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
              Remove
            </button>
          </div>
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

// Maps a topic string to its level number for a given unit using UNIT_LEVELS definitions.
// Matching is case-insensitive and trims whitespace.
// Returns 1 if the topic is not found in the unit's level definitions.
function topicToLevel(unitId, topic) {
  const levels = UNIT_LEVELS[unitId]
  if (!levels) return 1
  const t = (topic || '').trim().toLowerCase()
  const match = levels.find(l => l.topic.trim().toLowerCase() === t)
  return match ? match.id : 1
}

// Resolve "Option 1"/"Option 2"/... to the actual option text
function resolveCorrectOption(label, option1, option2, option3, option4) {
  const textMap = {
    'option 1': option1,
    'option 2': option2,
    'option 3': option3,
    'option 4': option4,
  }
  // Image-only options have no text — fall back to a stable 'option1'..'option4'
  // sentinel so the correct answer isn't lost as an empty string (see
  // questionOptions.js for where this is resolved back).
  const keyMap = { 'option 1': 'option1', 'option 2': 'option2', 'option 3': 'option3', 'option 4': 'option4' }
  const norm = (label || '').trim().toLowerCase()
  return textMap[norm] || keyMap[norm] || label || ''
}

const PAGE_SIZE = 50

const SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Mathematics']

// Unit names must match the `unit` column stored in the DB (partial ilike match is used for filtering)
const CHEMISTRY_UNITS = [
  // Physical Chemistry
  { id: 1,  name: 'Some Basic Concepts in Chemistry' },
  { id: 2,  name: 'Atomic Structure' },
  { id: 3,  name: 'Chemical Bonding and Molecular Structure' },
  { id: 4,  name: 'Chemical Thermodynamics' },
  { id: 5,  name: 'Solutions' },
  { id: 6,  name: 'Equilibrium' },
  { id: 7,  name: 'Redox Reactions and Electrochemistry' },
  { id: 8,  name: 'Chemical Kinetics' },
  // Inorganic Chemistry
  { id: 9,  name: 'Classification of Elements and Periodicity in Properties' },
  { id: 10, name: 'p-Block Elements' },
  { id: 11, name: 'd & f Block Elements' },
  { id: 12, name: 'Coordination Compounds' },
  // Organic Chemistry
  { id: 13, name: 'Purification and Characterisation of Organic Compounds' },
  { id: 14, name: 'Some Basic Principles of Organic Chemistry' },
  { id: 15, name: 'Hydrocarbons' },
  { id: 16, name: 'Organic Compounds Containing Halogens' },
  { id: 17, name: 'Organic Compounds Containing Oxygen' },
  { id: 18, name: 'Organic Compounds Containing Nitrogen' },
  { id: 19, name: 'Biomolecules' },
  { id: 20, name: 'Principles Related to Practical Chemistry' },
]


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
  const [expandedId, setExpandedId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [previewModeId, setPreviewModeId] = useState(null)  // which question's preview toggle is active
  const [previewMode, setPreviewMode] = useState('admin')   // 'admin' | 'student'
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  // Find Duplicates tab state
  const [dupeGroups, setDupeGroups] = useState(null) // null = not yet loaded
  const [dupeLoading, setDupeLoading] = useState(false)
  // Upload Excel tab — subject/unit selection
  const [uploadSubject, setUploadSubject] = useState('')
  const [uploadUnitId, setUploadUnitId] = useState('')
  // Add Manually tab — subject/unit/level selection (separate from list filters)
  const [manualSubject, setManualSubject] = useState('')
  const [manualUnitId, setManualUnitId] = useState('')
  const [manualLevel, setManualLevel] = useState('')

  const availableLevels = unitFilter ? (UNIT_LEVELS[Number(unitFilter)] || []) : []

  function buildQuestionsQuery() {
    let q = supabase.from('questions').select('*').order('qid', { ascending: true })
    // Filter by unit — Unit 11 uses a loose match to handle "d and f" vs "d- and f-" variants
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
    // Soft-delete: only show active questions unless showInactive is on
    if (!showInactive) q = q.eq('is_active', true)
    return q
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
    setQuestions(all)
    setLoading(false)
  }

  // Reset downstream filters and reload when parent filter changes
  useEffect(() => { setUnitFilter(''); setLevelFilter('') }, [subjectFilter])
  useEffect(() => { setLevelFilter('') }, [unitFilter])
  useEffect(() => { loadQuestions() }, [unitFilter, levelFilter, showInactive])

  async function markInactive(id) {
    const { error } = await supabase.from('questions').update({ is_active: false }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Marked inactive')
    loadQuestions()
    if (dupeGroups) loadDuplicates()
  }

  async function markActive(id) {
    const { error } = await supabase.from('questions').update({ is_active: true }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Restored to active')
    loadQuestions()
  }

  // Per-field image upload state for the edit panel: { uploading: Set<field>, urls: { question_image, option1_image, ... } }
  const [editImgUploading, setEditImgUploading] = useState(new Set())
  const [editImgUrls, setEditImgUrls] = useState({})

  function openEdit(q) {
    const optsMap = { option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 }
    const correctLabel = Object.entries(optsMap).find(([, v]) => v === q.correct_option)?.[0] || 'option1'
    setEditForm({
      question:          q.question || '',
      option1:           q.option1 || '',
      option2:           q.option2 || '',
      option3:           q.option3 || '',
      option4:           q.option4 || '',
      correct_option_key: correctLabel,
      unit:              q.unit,
      level:             q.level,
      difficulty_level:  q.difficulty_level || 'Medium',
      question_tag:      q.question_tag || '',
      source:            q.source || '',
      is_active:         q.is_active !== false,
      // Editing here means "I've verified/fixed this by hand" — default to
      // protecting it from a future Excel re-upload clobbering it back.
      // Admin can uncheck if they genuinely want Excel to keep overriding this row.
      content_locked:    true,
    })
    // Pre-populate image URLs from the existing DB record
    setEditImgUrls({
      question_image: q.question_image || null,
      option1_image:  q.option1_image  || null,
      option2_image:  q.option2_image  || null,
      option3_image:  q.option3_image  || null,
      option4_image:  q.option4_image  || null,
    })
    setEditImgUploading(new Set())
    setEditId(q.id)
    setExpandedId(null)
  }

  async function uploadEditImage(qid, field, file) {
    setEditImgUploading(prev => new Set(prev).add(field))
    try {
      const publicUrl = await uploadImage(file)
      setEditImgUrls(prev => ({ ...prev, [field]: publicUrl }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditImgUploading(prev => { const s = new Set(prev); s.delete(field); return s })
    }
  }

  async function handleEditSave(qId) {
    setEditSaving(true)
    try {
      // Fall back to the option-key sentinel when that option has no text
      // (image-only option) — see questionOptions.js.
      const resolvedCorrect = editForm[editForm.correct_option_key] || editForm.correct_option_key
      const patch = {
        question:        editForm.question,
        option1:         editForm.option1,
        option2:         editForm.option2,
        option3:         editForm.option3,
        option4:         editForm.option4,
        correct_option:  resolvedCorrect,
        unit:            editForm.unit,
        level:           Number(editForm.level),
        topic:           deriveTopic(editForm.unit, editForm.level),
        difficulty_level: editForm.difficulty_level,
        question_tag:    editForm.question_tag || null,
        source:          editForm.source || null,
        is_active:       editForm.is_active,
        content_locked:  editForm.content_locked,
        question_image:  editImgUrls.question_image ?? null,
        option1_image:   editImgUrls.option1_image  ?? null,
        option2_image:   editImgUrls.option2_image  ?? null,
        option3_image:   editImgUrls.option3_image  ?? null,
        option4_image:   editImgUrls.option4_image  ?? null,
      }
      const { error } = await supabase.from('questions').update(patch).eq('id', qId)
      if (error) throw error
      toast.success('Question updated!')
      setEditId(null)
      loadQuestions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function loadDuplicates() {
    setDupeLoading(true)
    // Paginated — same 1000-row cap as loadQuestions, and missing rows here
    // means missed duplicates rather than just an undercount.
    const data = []
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase.from('questions')
        .select('id, qid, question, level, source, is_active')
        .order('qid', { ascending: true })
        .range(from, from + 999)
      if (error) { toast.error(error.message); setDupeLoading(false); return }
      data.push(...(page || []))
      if (!page || page.length < 1000) break
    }
    // Group by first 80 chars of question text (trimmed, lowercased for comparison)
    const groups = {}
    for (const q of data) {
      const key = (q.question || '').trim().substring(0, 80).toLowerCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(q)
    }
    const dupes = Object.values(groups).filter(g => g.length > 1)
    setDupeGroups(dupes)
    setDupeLoading(false)
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: false })
    if (error) throw new Error(`Image upload failed: ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(path)
    return publicUrl
  }

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
        // Match the Column
        const colBLabels = ['p', 'q', 'r', 's']
        let mtcQ = form.question ? form.question.trim() + '\n\n' : ''
        mtcQ += 'Match Column A with Column B:\n'
        for (let i = 1; i <= 4; i++) {
          mtcQ += `${i}. ${form[`col_a${i}`]}    ${colBLabels[i - 1]}. ${form[`col_b${i}`]}\n`
        }
        record = {
          ...base,
          question:      mtcQ.trim(),
          option1: form.mtc_option1, option2: form.mtc_option2,
          option3: form.mtc_option3, option4: form.mtc_option4,
          correct_option: resolveCorrectOption(form.mtc_correct_label, form.mtc_option1, form.mtc_option2, form.mtc_option3, form.mtc_option4),
        }
      }

      const { error } = await supabase.from('questions').insert([record])
      if (error) throw error
      toast.success('Question added!')
      setForm(BLANK)
      setManualSubject(''); setManualUnitId(''); setManualLevel('')
      loadQuestions()
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

    if (!uploadSubject || !uploadUnitId) {
      toast.error('Please select Subject and Unit before uploading.')
      return
    }

    const selectedUnit = CHEMISTRY_UNITS.find(u => u.id === Number(uploadUnitId))
    const unitLabel = selectedUnit ? `Unit ${selectedUnit.id} - ${selectedUnit.name}` : ''

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
        const unitIdNum = Number(uploadUnitId)

        for (const r of rows) {
          const qid      = cell(r, 'Q ID')
          const question = cell(r, 'Question')

          if (!qid || !question) { skipped.push(qid || '(no Q ID)'); continue }

          const option1  = cell(r, 'Option 1')
          const option2  = cell(r, 'Option 2')
          const option3  = cell(r, 'Option 3')
          const option4  = cell(r, 'Option 4')
          const topic    = cell(r, 'Topic')

          const correctLabel   = cell(r, 'Correct Option')
          const correct_option = resolveCorrectOption(correctLabel, option1, option2, option3, option4)

          // Read Level directly from Excel "Level" column if present.
          // Falls back to topic-name lookup in UNIT_LEVELS, then defaults to 1.
          const rawLevel = cell(r, 'Level')
          const level = rawLevel && !isNaN(Number(rawLevel))
            ? Number(rawLevel)
            : topicToLevel(unitIdNum, topic)

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

        if (dedupedRecords.length === 0) {
          const sampleHeaders = rows[0] ? Object.keys(rows[0]).join(', ') : '(sheet appears empty)'
          toast.error(
            `No valid rows found in sheet "${usedSheetName}". Expected columns "Q ID" and "Question" ` +
            `but found: ${sampleHeaders}`,
            { duration: 8000 }
          )
          return
        }

        // Questions manually fixed via the Edit panel (content_locked=true) must not
        // have their question/options/correct_option reverted by a stale Excel source —
        // that's the whole reason content_locked exists. Look up which incoming Q IDs
        // are currently locked, then split into a full upsert vs. a metadata-only upsert.
        const allQids = dedupedRecords.map(r => r.qid)
        const lockedQids = new Set()
        const LOOKUP_BATCH = 500
        for (let i = 0; i < allQids.length; i += LOOKUP_BATCH) {
          const { data: lockedRows, error: lookupErr } = await supabase
            .from('questions')
            .select('qid')
            .in('qid', allQids.slice(i, i + LOOKUP_BATCH))
            .eq('content_locked', true)
          if (lookupErr) throw lookupErr
          for (const row of lockedRows) lockedQids.add(row.qid)
        }

        const fullRecords = dedupedRecords.filter(r => !lockedQids.has(r.qid))
        const metadataOnlyRecords = dedupedRecords
          .filter(r => lockedQids.has(r.qid))
          .map(({ qid, subject, unit, chapter_name, topic, level, difficulty_level, question_tag, source, uploaded_by }) =>
            ({ qid, subject, unit, chapter_name, topic, level, difficulty_level, question_tag, source, uploaded_by }))

        const BATCH = 500
        for (let i = 0; i < fullRecords.length; i += BATCH) {
          const { error } = await supabase
            .from('questions')
            .upsert(fullRecords.slice(i, i + BATCH), { onConflict: 'qid' })
          if (error) throw error
        }
        // Locked rows are guaranteed to already exist (that's how lockedQids was built),
        // so this must be a plain UPDATE, not an upsert — Postgres checks NOT NULL
        // constraints (question, option1-4, correct_option) against the INSERT branch
        // of "ON CONFLICT DO UPDATE" before it even resolves the conflict, so omitting
        // those columns from an upsert payload fails even though only a row that already
        // satisfies them would ever be touched.
        for (const { qid, ...fields } of metadataOnlyRecords) {
          const { error } = await supabase.from('questions').update(fields).eq('qid', qid)
          if (error) throw error
        }

        const parts = [`${dedupedRecords.length} questions uploaded successfully!`]
        if (metadataOnlyRecords.length) parts.push(`${metadataOnlyRecords.length} were 🔒 locked — question/options/answer preserved, only metadata updated.`)
        if (skipped.length) parts.push(`${skipped.length} skipped (missing Q ID or Question).`)
        if (duplicateCount) parts.push(`${duplicateCount} duplicate Q ID(s) in file — kept last occurrence.`)
        toast.success(parts.join(' '), { duration: 8000 })
        loadQuestions()
      } catch (err) {
        console.error('Excel upload failed:', err)
        toast.error(err.message || 'Upload failed — see console for details.', { duration: 8000 })
      }
    }
    reader.readAsArrayBuffer(file)
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
  useEffect(() => { setPage(1) }, [search, unitFilter, levelFilter, showInactive])

  // Auto-expand when search narrows to exactly 1 result
  useEffect(() => {
    if (filtered.length === 1) setExpandedId(filtered[0].id)
    else setExpandedId(prev => (filtered.find(q => q.id === prev) ? prev : null))
  }, [filtered.length, search])

  // When a filter is active, show all results so nothing is hidden behind pages
  const isFiltering = search.trim() !== '' || unitFilter !== '' || levelFilter !== ''
  const visibleQuestions = isFiltering ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Question List</button>
        <button className={`tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Add Manually</button>
        <button className={`tab-btn ${tab === 'excel' ? 'active' : ''}`} onClick={() => setTab('excel')}>Upload Excel</button>
        <button className={`tab-btn ${tab === 'dupes' ? 'active' : ''}`} onClick={() => { setTab('dupes'); if (!dupeGroups) loadDuplicates() }}>Find Duplicates</button>
      </div>

      {/* ── LIST ── */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {/* Row 1: search + count + clear */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                <Search size={16} />
                <input
                  className="form-control"
                  style={{ border: 'none', boxShadow: 'none', padding: '0' }}
                  placeholder="Search by Q ID, question, tag or topic…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{filtered.length} questions</span>
            </div>

            {/* Row 2: Subject → Unit → Level cascade */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Subject */}
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '130px' }}
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
                  style={{ width: 'auto', minWidth: '220px' }}
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
                  style={{ width: 'auto', minWidth: '180px' }}
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

              {/* Show Inactive toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: showInactive ? '#b91c1c' : 'var(--gray-500)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                Show Inactive
              </label>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Q ID</th>
                    <th style={{ width: '120px' }}>Unit</th>
                    <th>Topic</th>
                    <th style={{ width: '48px', textAlign: 'center' }}>Lvl</th>
                    <th>Question</th>
                    <th style={{ width: '80px' }}>Difficulty</th>
                    <th>Tag</th>
                    <th style={{ width: '96px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuestions.map(q => {
                    const isOpen = expandedId === q.id
                    const isEditing = editId === q.id
                    const isInactive = q.is_active === false
                    const opts = [q.option1, q.option2, q.option3, q.option4]
                    const rowStyle = {
                      cursor: 'pointer',
                      opacity: isInactive ? 0.55 : 1,
                      background: isEditing ? '#fffbeb' : isOpen ? 'var(--primary-light, #eff6ff)' : isInactive ? '#fef2f2' : undefined,
                    }
                    return (
                      <>
                        <tr key={q.id} style={rowStyle} onClick={() => { if (!isEditing) setExpandedId(isOpen ? null : q.id) }}>
                          <td>
                            <code style={{ fontSize: '0.75rem', textDecoration: isInactive ? 'line-through' : 'none', color: isInactive ? '#ef4444' : undefined }}>{q.qid}</code>
                            {isInactive && <span style={{ marginLeft: '0.35rem', fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '3px', padding: '0 4px' }}>inactive</span>}
                            {q.content_locked && <Lock size={11} style={{ marginLeft: '0.35rem', verticalAlign: 'middle', color: '#0284c7' }} title="Content locked — protected from Excel re-upload overwrites" />}
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--gray-500)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.unit}>{q.unit}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deriveTopic(q.unit, q.level) || q.topic}</td>
                          <td style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                            {q.level}
                            <InfoTooltip text={deriveFullTopic(q.unit, q.level) || q.topic} />
                          </td>
                          <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', textDecoration: isInactive ? 'line-through' : 'none', color: isInactive ? 'var(--gray-400)' : undefined }}>{q.question}</td>
                          <td>
                            <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{q.question_tag}</td>
                          <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => { setExpandedId(isOpen ? null : q.id); setEditId(null) }}
                            >
                              {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {isOpen ? 'Close' : 'View'}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', color: isEditing ? '#d97706' : undefined, borderColor: isEditing ? '#d97706' : undefined }}
                              title="Edit question"
                              onClick={() => { if (isEditing) { setEditId(null) } else { openEdit(q) } }}
                            >
                              <Pencil size={13} />
                            </button>
                            {isInactive ? (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                                onClick={() => markActive(q.id)}
                                title="Click to restore active"
                              >
                                Inactive
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1.5px solid #86efac', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                                onClick={() => markInactive(q.id)}
                                title="Click to deactivate"
                              >
                                Active
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* ── View panel ── */}
                        {isOpen && !isEditing && (
                          <tr key={`${q.id}-detail`}>
                            <td colSpan={8} style={{ padding: '0', borderTop: 'none' }}>
                              <div style={{ background: '#f8faff', borderTop: '2px solid var(--primary, #3b82f6)', borderBottom: '1px solid var(--gray-200)' }}>

                                {/* Toggle bar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--gray-500)', alignItems: 'center' }}>
                                    <code style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{q.qid}</code>
                                    <span>{q.question_type}</span>
                                    <span>Level {q.level}</span>
                                    <span className={`badge badge-${(q.difficulty_level || '').toLowerCase()}`}>{q.difficulty_level}</span>
                                    {q.question_tag && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{q.question_tag}</span>}
                                    {q.source && <span>Source: {q.source}</span>}
                                    {isInactive && <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '0 6px', fontWeight: 600 }}>INACTIVE</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0' }}>
                                    {['admin', 'student'].map(mode => (
                                      <button key={mode} type="button"
                                        onClick={() => { setPreviewModeId(q.id); setPreviewMode(mode) }}
                                        style={{
                                          padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--primary, #3b82f6)',
                                          borderRadius: mode === 'admin' ? 'var(--radius) 0 0 var(--radius)' : '0 var(--radius) var(--radius) 0',
                                          background: (previewModeId === q.id ? previewMode : 'admin') === mode ? 'var(--primary, #3b82f6)' : '#fff',
                                          color: (previewModeId === q.id ? previewMode : 'admin') === mode ? '#fff' : 'var(--primary, #3b82f6)',
                                          marginLeft: mode === 'student' ? '-1px' : 0,
                                        }}>
                                        {mode === 'admin' ? 'Admin View' : 'Student Preview'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Admin view — shows correct answer highlighted */}
                                {(previewModeId !== q.id || previewMode === 'admin') && (
                                  <div style={{ padding: '1rem 1.25rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--gray-800)', whiteSpace: 'pre-wrap', marginBottom: q.question_image ? '0.5rem' : '0.875rem', lineHeight: 1.6 }}>
                                      {q.question}
                                    </div>
                                    {q.question_image && (
                                      <div style={{ marginBottom: '0.875rem' }}>
                                        <img src={q.question_image} alt="Question" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                      {opts.map((opt, i) => {
                                        const isCorrect = `option${i + 1}` === correctOptionKey(q)
                                        const optImgKey = `option${i + 1}_image`
                                        return (
                                          <div key={i} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: isCorrect ? 700 : 400, background: isCorrect ? '#dcfce7' : 'var(--gray-100)', color: isCorrect ? '#15803d' : 'var(--gray-700)', border: isCorrect ? '1.5px solid #86efac' : '1px solid transparent' }}>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{String.fromCharCode(65 + i)}. {opt}{isCorrect ? ' ✓ Correct' : ''}</div>
                                            {q[optImgKey] && <img src={q[optImgKey]} alt={`Option ${i + 1}`} style={{ maxHeight: 100, maxWidth: '100%', marginTop: '0.3rem', borderRadius: 4, border: '1px solid var(--gray-200)' }} />}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Student preview — exactly like test page, no answer revealed */}
                                {previewModeId === q.id && previewMode === 'student' && (
                                  <div style={{ padding: '1rem 1.25rem', background: '#fff', maxWidth: 680 }}>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-800)', whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: q.question_image ? '0.75rem' : '1.25rem' }}>
                                      {q.question}
                                    </div>
                                    {q.question_image && (
                                      <div style={{ marginBottom: '1.25rem' }}>
                                        <img src={q.question_image} alt="Question" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                                      </div>
                                    )}
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                      {opts.map((opt, i) => {
                                        const optImgKey = `option${i + 1}_image`
                                        return (
                                          <li key={i} className="option-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'default', fontSize: '0.9375rem' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0, color: 'var(--gray-600)' }}>
                                              {String.fromCharCode(65 + i)}
                                            </div>
                                            <div>
                                              <span style={{ whiteSpace: 'pre-wrap' }}>{opt}</span>
                                              {q[optImgKey] && <div style={{ marginTop: '0.5rem' }}><img src={q[optImgKey]} alt={`Option ${i + 1}`} style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, border: '1px solid var(--gray-200)' }} /></div>}
                                            </div>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                      This is exactly how the student sees this question (options are shuffled during the actual test)
                                    </div>
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ── Edit panel ── */}
                        {isEditing && (
                          <tr key={`${q.id}-edit`}>
                            <td colSpan={8} style={{ padding: '0', borderTop: 'none' }}>
                              <div style={{ padding: '1rem 1.25rem', background: '#fffbeb', borderTop: '2px solid #d97706', borderBottom: '1px solid #fde68a' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.875rem', color: '#92400e' }}>
                                  Editing: <code>{q.qid}</code>
                                  <span style={{ fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.75rem', color: '#b45309' }}>— changes save to Supabase; student history is preserved</span>
                                </div>

                                {/* Question text + image */}
                                <div className="form-group" style={{ margin: '0 0 0.75rem' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Question Text</label>
                                  <textarea className="form-control" rows={3} style={{ fontSize: '0.875rem', resize: 'vertical' }}
                                    value={editForm.question}
                                    onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))} />
                                  <EditImageField
                                    label="Question Image"
                                    url={editImgUrls.question_image}
                                    uploading={editImgUploading.has('question_image')}
                                    onUpload={file => uploadEditImage(q.qid, 'question_image', file)}
                                    onRemove={() => setEditImgUrls(u => ({ ...u, question_image: null }))}
                                  />
                                </div>

                                {/* Options */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                  {[1, 2, 3, 4].map(i => {
                                    const key = `option${i}`
                                    const imgKey = `option${i}_image`
                                    const isCorrect = editForm.correct_option_key === key
                                    return (
                                      <div key={i} style={{ padding: '0.45rem 0.625rem', borderRadius: 'var(--radius)', background: isCorrect ? '#f0fdf4' : 'var(--gray-50)', border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}` }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: isCorrect ? '#15803d' : 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                                          <input type="radio" name={`edit-correct-${q.id}`} checked={isCorrect}
                                            onChange={() => setEditForm(f => ({ ...f, correct_option_key: key }))} />
                                          Option {i}{isCorrect ? ' ✓ correct' : ''}
                                        </label>
                                        <input className="form-control" style={{ fontSize: '0.8125rem', border: 'none', background: 'transparent', boxShadow: 'none', padding: '0' }}
                                          value={editForm[key]}
                                          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
                                        <EditImageField
                                          label={`Option ${i} Image`}
                                          url={editImgUrls[imgKey]}
                                          uploading={editImgUploading.has(imgKey)}
                                          onUpload={file => uploadEditImage(q.qid, imgKey, file)}
                                          onRemove={() => setEditImgUrls(u => ({ ...u, [imgKey]: null }))}
                                        />
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Metadata row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                  <div className="form-group" style={{ margin: 0, flex: '1.4 1 190px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Unit</label>
                                    <select className="form-control" style={{ fontSize: '0.8125rem' }}
                                      value={(editForm.unit || '').match(/^Unit\s+(\d+)/i)?.[1] || ''}
                                      onChange={e => {
                                        const unit = CHEMISTRY_UNITS.find(u => u.id === Number(e.target.value))
                                        // Moving to a different unit means the old level number
                                        // almost certainly doesn't map to the same topic there —
                                        // reset to Level 1 so it doesn't silently point at the wrong syllabus.
                                        setEditForm(f => ({ ...f, unit: unit ? `Unit ${unit.id} - ${unit.name}` : '', level: 1 }))
                                      }}>
                                      {CHEMISTRY_UNITS.map(u => <option key={u.id} value={u.id}>Unit {u.id} — {u.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '0.6 1 100px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      Level
                                      <InfoTooltip text={deriveFullTopic(editForm.unit, editForm.level)} align="left" />
                                    </label>
                                    <select className="form-control" style={{ fontSize: '0.8125rem' }}
                                      value={editForm.level}
                                      onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}>
                                      {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Level {l}</option>)}
                                    </select>
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '0.6 1 100px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Difficulty</label>
                                    <select className="form-control" style={{ fontSize: '0.8125rem' }}
                                      value={editForm.difficulty_level}
                                      onChange={e => setEditForm(f => ({ ...f, difficulty_level: e.target.value }))}>
                                      <option>Easy</option><option>Medium</option><option>Hard</option>
                                    </select>
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Question Tag</label>
                                    <input className="form-control" style={{ fontSize: '0.8125rem' }}
                                      value={editForm.question_tag}
                                      onChange={e => setEditForm(f => ({ ...f, question_tag: e.target.value }))} />
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Source</label>
                                    <input className="form-control" style={{ fontSize: '0.8125rem' }}
                                      value={editForm.source}
                                      onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', paddingBottom: '0.4rem', whiteSpace: 'nowrap' }}>
                                      <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
                                      Is Active
                                    </label>
                                  </div>
                                  <div className="form-group" style={{ margin: 0, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', paddingBottom: '0.4rem', whiteSpace: 'nowrap' }}
                                      title="When checked, re-uploading an Excel sheet with this Q ID will NOT overwrite the question text, options or correct answer — only metadata (topic, difficulty, tag, source) gets updated.">
                                      <input type="checkbox" checked={editForm.content_locked} onChange={e => setEditForm(f => ({ ...f, content_locked: e.target.checked }))} />
                                      <Lock size={13} /> Lock content from Excel re-upload
                                    </label>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn btn-primary btn-sm" disabled={editSaving} onClick={() => handleEditSave(q.id)}>
                                    {editSaving ? 'Saving…' : 'Save Changes'}
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
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
                  {Number(manualUnitId) === 11 ? (
                    <select className="form-control" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }} value={manualLevel} onChange={e => setManualLevel(e.target.value)} required>
                      <option value="">— choose —</option>
                      {UNIT_11_LEVELS.filter(l => l.id < 9).map(l => <option key={l.id} value={l.id}>L{l.id}: {l.name}</option>)}
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
                          <input className="form-control" style={{ padding: '0.25rem 0.4rem', fontSize: '0.875rem', border: 'none', background: 'transparent', boxShadow: 'none' }} required
                            placeholder={`Item ${i}`} value={form[`col_a${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`col_a${i}`]: e.target.value }))} />
                        </div>
                        <div style={{ padding: '0.4rem 0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, minWidth: '1.1rem' }}>{bLabel}.</span>
                          <input className="form-control" style={{ padding: '0.25rem 0.4rem', fontSize: '0.875rem', border: 'none', background: 'transparent', boxShadow: 'none' }} required
                            placeholder={`Item ${bLabel}`} value={form[`col_b${i}`]}
                            onChange={e => setForm(f => ({ ...f, [`col_b${i}`]: e.target.value }))} />
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
            Select the subject and unit first, then upload your Excel file. Subject, Unit, and Level are set automatically — no need to include them in the file.
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

          {/* Step 3: File upload — enabled only after both are selected */}
          <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            {uploadSubject && uploadUnitId ? (
              <>
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.875rem', background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--primary-dark)' }}>
                  Uploading as: <strong>{uploadSubject}</strong> → <strong>Unit {uploadUnitId} - {CHEMISTRY_UNITS.find(u => u.id === Number(uploadUnitId))?.name}</strong>
                  {Number(uploadUnitId) === 11 && <span style={{ marginLeft: '0.5rem', color: 'var(--gray-500)' }}>(Level auto-assigned from Topic column)</span>}
                  {Number(uploadUnitId) !== 11 && <span style={{ marginLeft: '0.5rem', color: 'var(--gray-500)' }}>(All questions set to Level 1 — edit per question after upload)</span>}
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={18} /> Choose Excel File (.xlsx / .xls / .csv)
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
                </label>
              </>
            ) : (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                Please select Subject and Unit first
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
                    <td>d and f Block Elements</td>
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
            Questions are grouped by the first 80 characters of their text. Groups with 2+ matches are shown below.
          </p>

          {dupeLoading && <div style={{ padding: '2rem', textAlign: 'center' }}>Scanning all questions…</div>}

          {!dupeLoading && dupeGroups !== null && dupeGroups.length === 0 && (
            <div className="empty-state">No duplicate questions found.</div>
          )}

          {!dupeLoading && dupeGroups && dupeGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '1.25rem', border: '1px solid #fde68a', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ background: '#fefce8', padding: '0.5rem 0.875rem', fontSize: '0.75rem', color: '#92400e', borderBottom: '1px solid #fde68a', fontWeight: 600 }}>
                Group {gi + 1} · {group.length} duplicates
                <span style={{ fontWeight: 400, marginLeft: '0.75rem', color: '#b45309' }}>"{(group[0].question || '').trim().substring(0, 80)}…"</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>Q ID</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--gray-600)' }}>Lvl</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Source</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Question Preview</th>
                    <th style={{ padding: '0.4rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--gray-600)' }}>Status</th>
                    <th style={{ padding: '0.4rem 0.75rem', width: '120px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.map(dq => (
                    <tr key={dq.id} style={{ borderTop: '1px solid var(--gray-100)', opacity: dq.is_active === false ? 0.55 : 1 }}>
                      <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <code style={{ color: dq.is_active === false ? '#ef4444' : undefined, textDecoration: dq.is_active === false ? 'line-through' : 'none' }}>{dq.qid}</code>
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>{dq.level}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{dq.source || '—'}</td>
                      <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: 'var(--gray-600)', maxWidth: '340px' }}>
                        {(dq.question || '').trim().substring(0, 120)}{(dq.question || '').length > 120 ? '…' : ''}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>
                        {dq.is_active === false
                          ? <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600 }}>inactive</span>
                          : <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600 }}>active</span>
                        }
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', display: 'flex', gap: '0.35rem' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
