import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import { MARKS_CORRECT, UNIT_LEVELS, NEET_CHEMISTRY_SYLLABUS } from '../../lib/constants'

const ALL_UNITS = NEET_CHEMISTRY_SYLLABUS.flatMap(s => s.units)
function unitName(unitId) {
  return ALL_UNITS.find(u => u.id === unitId)?.name || `Unit ${unitId}`
}
function levelName(unitId, level) {
  return (UNIT_LEVELS[unitId] || []).find(l => l.id === level)?.name || ''
}
import { Search, Upload, Download, Pencil, MessageCircle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/performance', label: 'Performance' },
]

const NEET_YEARS = ['2026', '2027', '2028', '2029']
const LOGIN_URL = 'https://chemistryarun-hub.github.io/neetcbtpractice/'

function getTodayDDMM() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return dd + mm
}

function buildPrefix(cls, neetYear, ddmm) {
  const clsCode = cls === 'Class 11' ? '11' : cls === 'Class 12' ? '12' : '13'
  return `${clsCode}${neetYear}${ddmm}`
}

function downloadSampleExcel() {
  const rows = [
    { 'Student Name': 'Rahul Sharma',  'Phone No. (Student)': '9876543210', 'Phone No. (Mother)': '9876543210', 'Phone No. (Father)': '9123456789' },
    { 'Student Name': 'Priya Singh',   'Phone No. (Student)': '9812345670', 'Phone No. (Mother)': '9812345671', 'Phone No. (Father)': '' },
    { 'Student Name': 'Amit Verma',    'Phone No. (Student)': '9001234567', 'Phone No. (Mother)': '',           'Phone No. (Father)': '9001234568' },
  ]
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Student Name', 'Phone No. (Student)', 'Phone No. (Mother)', 'Phone No. (Father)'] })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'student_upload_sample.xlsx')
}

function waUrl(phone, name, rollNumber, password) {
  const text = encodeURIComponent(
    `Hello ${name},\nYour NEET CBT login:\nRoll No: ${rollNumber}\nPassword: ${password}\nLogin: ${LOGIN_URL}`
  )
  return `https://wa.me/91${phone}?text=${text}`
}

function waPracticeUrl(phone, name) {
  const text = encodeURIComponent(
    `Hello ${name}, please practice today on NEET CBT. Login: ${LOGIN_URL}`
  )
  return `https://wa.me/91${phone}?text=${text}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysSince(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / 86400000)
}

function fmtTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

// ── Student Progress Profile ──────────────────────────────────────────────────
function StudentProgress({ student, onBack }) {
  const [attempts, setAttempts] = useState([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [expandedLevel, setExpandedLevel] = useState(null)

  useEffect(() => {
    async function load() {
      setLoadingAttempts(true)
      const { data } = await supabase
        .from('test_attempts')
        .select('id, unit_id, level, attempt_number, score, correct_count, wrong_count, skipped_count, time_taken, submitted, started_at, submitted_at')
        .eq('student_id', student.id)
        .eq('submitted', true)
        .order('submitted_at', { ascending: false })
      setAttempts(data || [])
      setLoadingAttempts(false)
    }
    load()
  }, [student.id])

  // Derived stats
  const lastPractice = attempts.length > 0 ? attempts[0].submitted_at : null
  const daysAgo = daysSince(lastPractice)

  // Group by unit + level — level numbers repeat across units, so grouping by
  // level alone merged unrelated units' attempts into the same row.
  const levels = {}
  for (const a of attempts) {
    const unitId = a.unit_id ?? 0
    const lvl = a.level ?? 0
    const key = `${unitId}-${lvl}`
    if (!levels[key]) levels[key] = { unitId, level: lvl, rows: [] }
    levels[key].rows.push(a)
  }
  const levelEntries = Object.values(levels)
    .map(({ unitId, level, rows }) => {
      const bestScore = Math.max(...rows.map(r => r.score ?? 0))
      // "Accuracy" here is score-as-%-of-max-marks — matches the unlock-eligibility
      // threshold in TestPage.jsx, not raw correct/attempted accuracy.
      const bestAcc = Math.max(...rows.map(r => {
        const total = (r.correct_count ?? 0) + (r.wrong_count ?? 0) + (r.skipped_count ?? 0)
        const maxScore = total * MARKS_CORRECT
        return maxScore > 0 ? ((r.score ?? 0) / maxScore) * 100 : 0
      }))
      const lastDate = rows.reduce((mx, r) => r.submitted_at > mx ? r.submitted_at : mx, '')
      return { unitId, level, attempts: rows, bestScore, bestAcc, lastDate }
    })
    .sort((a, b) => a.unitId - b.unitId || a.level - b.level)

  const totalCleared = levelEntries.filter(l => l.bestAcc >= 60).length
  const overallBestAcc = levelEntries.length > 0 ? Math.max(...levelEntries.map(l => l.bestAcc)) : 0

  const waReminderMsg = (phone) => waPracticeUrl(phone, student.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Back button */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={15} /> Back to Student List
        </button>
      </div>

      {/* ── Student info header card ── */}
      <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Identity */}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--gray-800)', marginBottom: '0.2rem' }}>{student.name}</div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              <code style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{student.roll_number}</code>
              {student.class && <span>{student.class}</span>}
              {student.neet_year && <span>NEET {student.neet_year}</span>}
            </div>
          </div>

          {/* Last practice chip */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Last Practice</div>
            {lastPractice ? (
              <>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>{formatDate(lastPractice)}</div>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  color: daysAgo === 0 ? '#15803d' : daysAgo > 7 ? '#b91c1c' : '#92400e',
                }}>
                  {daysAgo === 0 ? 'Active Today' : `${daysAgo} days ago`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#b91c1c' }}>Never practiced</div>
            )}
          </div>
        </div>

        {/* WhatsApp buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {student.phone_student && (
            <a href={waReminderMsg(student.phone_student)} target="_blank" rel="noreferrer"
              style={{ background: '#25d366', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
              <MessageCircle size={14} /> WhatsApp Student
            </a>
          )}
          {student.phone_mother && (
            <a href={waReminderMsg(student.phone_mother)} target="_blank" rel="noreferrer"
              style={{ background: '#128c7e', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
              <MessageCircle size={14} /> WhatsApp Mother
            </a>
          )}
          {student.phone_father && (
            <a href={waReminderMsg(student.phone_father)} target="_blank" rel="noreferrer"
              style={{ background: '#075e54', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
              <MessageCircle size={14} /> WhatsApp Father
            </a>
          )}
        </div>
      </div>

      {/* ── Overall stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Levels Cleared', value: totalCleared, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Total Attempts', value: attempts.length, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Best Score %', value: `${overallBestAcc.toFixed(1)}%`, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { label: 'Days Since Practice', value: daysAgo === null ? 'N/A' : daysAgo === 0 ? 'Today' : `${daysAgo}d`, color: daysAgo === null || daysAgo > 7 ? '#b91c1c' : '#92400e', bg: daysAgo === null || daysAgo > 7 ? '#fef2f2' : '#fefce8', border: daysAgo === null || daysAgo > 7 ? '#fecaca' : '#fde68a' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius)', background: stat.bg, border: `1.5px solid ${stat.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Level-wise summary ── */}
      <div className="card">
        <div className="card-header" style={{ fontWeight: 700 }}>Level-wise Performance</div>
        {loadingAttempts ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : levelEntries.length === 0 ? (
          <div className="empty-state">No attempts yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th style={{ width: '60px' }}>Level</th>
                  <th style={{ textAlign: 'center' }}>Attempts</th>
                  <th style={{ textAlign: 'center' }}>Best Score</th>
                  <th style={{ textAlign: 'center' }}>Best Score %</th>
                  <th>Last Attempt</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {levelEntries.map(({ unitId, level, attempts: lvlAttempts, bestScore, bestAcc, lastDate }) => {
                  const cleared = bestAcc >= 60
                  const key = `${unitId}-${level}`
                  const isExpanded = expandedLevel === key
                  return (
                    <>
                      <tr key={key} style={{ background: cleared ? '#f0fdf4' : undefined }}>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Unit {unitId}: {unitName(unitId)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--gray-700)' }}>
                          Level {level}
                          <div style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--gray-400)' }}>{levelName(unitId, level)}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{lvlAttempts.length}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{bestScore}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: cleared ? '#15803d' : bestAcc > 0 ? '#92400e' : 'var(--gray-400)' }}>
                          {bestAcc.toFixed(1)}%
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{formatDate(lastDate)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {cleared
                            ? <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>Cleared</span>
                            : bestAcc > 0
                              ? <span style={{ background: '#fefce8', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>In Progress</span>
                              : <span style={{ background: 'var(--gray-100)', color: 'var(--gray-400)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>Not Started</span>
                          }
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}
                            onClick={() => setExpandedLevel(isExpanded ? null : key)}>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {isExpanded ? 'Hide' : 'History'}
                          </button>
                        </td>
                      </tr>

                      {/* Attempt history rows */}
                      {isExpanded && (
                        <tr key={`${key}-history`}>
                          <td colSpan={8} style={{ padding: 0, borderTop: 'none' }}>
                            <div style={{ background: '#f8faff', borderTop: '2px solid #bfdbfe', borderBottom: '1px solid var(--gray-200)', padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#1d4ed8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Unit {unitId} · Level {level} — All Attempts
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                <thead>
                                  <tr style={{ background: '#dbeafe' }}>
                                    {['Attempt #', 'Score', 'Correct', 'Wrong', 'Skipped', 'Time', 'Date'].map(h => (
                                      <th key={h} style={{ padding: '0.3rem 0.6rem', textAlign: h === 'Attempt #' ? 'left' : 'center', fontWeight: 600, color: '#1d4ed8', fontSize: '0.75rem' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {lvlAttempts
                                    .slice()
                                    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                                    .map((a, i) => {
                                      const total = (a.correct_count ?? 0) + (a.wrong_count ?? 0) + (a.skipped_count ?? 0)
                                      const acc = total > 0 ? ((a.correct_count / total) * 100).toFixed(1) : '0.0'
                                      return (
                                        <tr key={a.id} style={{ borderTop: '1px solid #dbeafe', background: i % 2 === 0 ? '#fff' : '#f0f7ff' }}>
                                          <td style={{ padding: '0.3rem 0.6rem', fontWeight: 600 }}>#{a.attempt_number ?? i + 1}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', fontWeight: 600 }}>{a.score ?? '—'}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{a.correct_count ?? '—'}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', color: '#b91c1c', fontWeight: 600 }}>{a.wrong_count ?? '—'}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', color: 'var(--gray-500)' }}>{a.skipped_count ?? '—'}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', color: 'var(--gray-500)' }}>{fmtTime(a.time_taken)}</td>
                                          <td style={{ padding: '0.3rem 0.6rem', textAlign: 'center', color: 'var(--gray-500)' }}>{formatDate(a.submitted_at)}</td>
                                        </tr>
                                      )
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const SINGLE_BLANK = { name: '', phone: '', phone_mother: '', phone_father: '', cls: '', neetYear: '' }

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminStudents() {
  const [tab, setTab] = useState('upload')
  const [selectedStudent, setSelectedStudent] = useState(null)

  // ── Single-add tab state ──
  const [singleForm, setSingleForm] = useState(SINGLE_BLANK)
  const [singleSaving, setSingleSaving] = useState(false)
  const [singleResult, setSingleResult] = useState(null) // saved student details

  // ── Upload tab state ──
  const [uploadClass, setUploadClass] = useState('')
  const [uploadYear, setUploadYear] = useState('')
  const ddmm = getTodayDDMM()
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)

  // ── List tab state ──
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  async function loadStudents() {
    setLoading(true)
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [])

  // ── Roll number generation ──
  async function getNextSerial(prefix) {
    const { data } = await supabase
      .from('students')
      .select('roll_number')
      .like('roll_number', `${prefix}%`)
      .order('roll_number', { ascending: false })
      .limit(1)
    if (!data || data.length === 0) return 1
    const last = data[0].roll_number
    const serial = parseInt(last.slice(prefix.length), 10)
    return isNaN(serial) ? 1 : serial + 1
  }

  // ── Excel upload & preview ──
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const rows = rawRows.map(r => {
        const n = {}
        for (const [k, v] of Object.entries(r)) n[k.trim()] = String(v).trim()
        return n
      })

      const validRows = []
      for (const r of rows) {
        const name  = (r['Student Name'] || '').trim()
        const phone = (r['Phone No. (Student)'] || '').trim().replace(/\D/g, '')
        const phoneMother = (r['Phone No. (Mother)'] || '').trim().replace(/\D/g, '')
        const phoneFather = (r['Phone No. (Father)'] || '').trim().replace(/\D/g, '')
        if (!name) continue
        if (phone.length !== 10) { toast.error(`Invalid student phone for "${name}": must be 10 digits`); continue }
        if (phoneMother && phoneMother.length !== 10) { toast.error(`Invalid mother phone for "${name}": must be 10 digits`); continue }
        if (phoneFather && phoneFather.length !== 10) { toast.error(`Invalid father phone for "${name}": must be 10 digits`); continue }
        validRows.push({ name, phone, phone_mother: phoneMother || null, phone_father: phoneFather || null })
      }

      if (validRows.length === 0) {
        toast.error('No valid rows. Excel needs columns: Student Name, Phone No. (Student)')
        return
      }

      const phones = validRows.map(r => r.phone)
      const { data: existing } = await supabase.from('students').select('phone_student').in('phone_student', phones)
      const existingPhones = new Set((existing || []).map(s => s.phone_student))

      const prefix = buildPrefix(uploadClass, uploadYear, ddmm)
      let serial = await getNextSerial(prefix)

      const final = validRows.map(r => {
        const isNew = !existingPhones.has(r.phone)
        const roll_number = isNew ? `${prefix}${String(serial++).padStart(3, '0')}` : ''
        const password = r.phone.slice(-4)
        return { ...r, roll_number, password, status: isNew ? 'new' : 'exists' }
      })

      setPreview(final)
      setSaved(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSave() {
    if (!preview) return
    const newOnes = preview.filter(r => r.status === 'new')
    if (newOnes.length === 0) { toast.error('No new students to save'); return }
    setSaving(true)
    try {
      const records = newOnes.map(r => ({
        name:          r.name,
        phone_student: r.phone,
        phone_mother:  r.phone_mother || null,
        phone_father:  r.phone_father || null,
        roll_number:   r.roll_number,
        password_hash: r.password,
        username:      r.roll_number,
        class:         uploadClass,
        neet_year:     uploadYear,
        is_active:     true,
        is_first_login: true,
        added_by:      null,
      }))
      const { error } = await supabase.from('students').insert(records)
      if (error) throw error
      toast.success(`${newOnes.length} students added!`)
      setSaved(newOnes)
      setPreview(null)
      loadStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function downloadResults(rows) {
    const data = rows.map(r => ({
      'Student Name':    r.name,
      'Phone (Student)': r.phone,
      'Phone (Mother)':  r.phone_mother || '',
      'Phone (Father)':  r.phone_father || '',
      'Roll Number':     r.roll_number,
      Password:          r.password,
      'Login URL':       LOGIN_URL,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `students_${uploadClass.replace(' ', '')}_${uploadYear}_${ddmm}.xlsx`)
  }

  // ── List actions ──
  async function toggleActive(id, current) {
    const { error } = await supabase.from('students').update({ is_active: !current }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setStudents(ss => ss.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  function openEdit(s) {
    setEditForm({ name: s.name, phone: s.phone_student || '', phone_mother: s.phone_mother || '', phone_father: s.phone_father || '', cls: s.class || '', neetYear: s.neet_year || '' })
    setEditId(s.id)
  }

  async function handleEditSave(s) {
    if (!editForm.name.trim()) { toast.error('Name is required'); return }
    const pm = editForm.phone_mother.replace(/\D/g, '')
    const pf = editForm.phone_father.replace(/\D/g, '')
    if (pm && pm.length !== 10) { toast.error('Mother phone must be 10 digits'); return }
    if (pf && pf.length !== 10) { toast.error('Father phone must be 10 digits'); return }
    if (!editForm.cls) { toast.error('Select a class'); return }
    if (!editForm.neetYear) { toast.error('Select a NEET year'); return }
    setEditSaving(true)
    try {
      // Note: roll_number is left untouched on purpose — it's already the student's
      // login username, and regenerating it here would silently break credentials
      // that may already have been shared. Class/NEET year changes only affect
      // filtering/display, not login.
      const { error } = await supabase.from('students').update({
        name: editForm.name.trim(),
        phone_student: editForm.phone.replace(/\D/g, '') || null,
        phone_mother:  pm || null,
        phone_father:  pf || null,
        class:         editForm.cls,
        neet_year:     editForm.neetYear,
      }).eq('id', s.id)
      if (error) throw error
      toast.success('Student updated!')
      setEditId(null)
      loadStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  const filtered = students.filter(s => {
    if (classFilter && s.class !== classFilter) return false
    if (yearFilter && s.neet_year !== yearFilter) return false
    if (statusFilter === 'active' && s.is_active === false) return false
    if (statusFilter === 'inactive' && s.is_active !== false) return false
    const q = search.toLowerCase()
    if (q && !s.name.toLowerCase().includes(q) && !s.roll_number.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">

        {/* ── Student Progress Profile (replaces everything below topbar) ── */}
        {selectedStudent ? (
          <>
            <div className="page-header">
              <div>
                <h2>Student Progress</h2>
                <span className="text-muted">{selectedStudent.name}</span>
              </div>
            </div>
            <StudentProgress student={selectedStudent} onBack={() => setSelectedStudent(null)} />
          </>
        ) : (
          <>
            <div className="page-header">
              <div>
                <h2>Students</h2>
                <span className="text-muted">{students.length} total</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '1.25rem' }}>
              <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => { setTab('upload'); setSaved(null); setPreview(null) }}>
                Bulk Upload
              </button>
              <button className={`tab-btn ${tab === 'single' ? 'active' : ''}`} onClick={() => { setTab('single'); setSingleResult(null); setSingleForm(SINGLE_BLANK) }}>
                Add Student
              </button>
              <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
                Student List
              </button>
            </div>

            {/* ══════════ BULK UPLOAD TAB ══════════ */}
            {tab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Step 1: Config */}
                <div className="card card-body">
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
                    Step 1 — Select Class & Year
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>CLASS</label>
                      <select className="form-control" value={uploadClass} onChange={e => { setUploadClass(e.target.value); setPreview(null); setSaved(null) }}>
                        <option value="">— Select —</option>
                        <option>Class 11</option>
                        <option>Class 12</option>
                        <option>Class 13 (Repeater)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>NEET TARGET YEAR</label>
                      <select className="form-control" value={uploadYear} onChange={e => { setUploadYear(e.target.value); setPreview(null); setSaved(null) }}>
                        <option value="">— Select —</option>
                        {NEET_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>DATE (DDMM)</label>
                      <input className="form-control" value={ddmm} readOnly style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }} />
                    </div>
                    {uploadClass && uploadYear && (
                      <div style={{ paddingBottom: '1px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: '0.3rem' }}>Roll prefix preview</div>
                        <code style={{ fontSize: '0.875rem', background: '#f0fdf4', color: '#15803d', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                          {buildPrefix(uploadClass, uploadYear, ddmm)}001…
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Upload */}
                {uploadClass && uploadYear && !preview && !saved && (
                  <div className="card card-body">
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--gray-700)' }}>
                      Step 2 — Upload Excel File
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.875rem', lineHeight: 1.8 }}>
                      Required columns: <code>Student Name</code>, <code>Phone No. (Student)</code> (10 digits)<br />
                      Optional columns: <code>Phone No. (Mother)</code>, <code>Phone No. (Father)</code><br />
                      Roll numbers and passwords are auto-generated — do not include them.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn btn-outline btn-sm" onClick={downloadSampleExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Download size={14} /> Download Sample Excel
                      </button>
                      <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Choose Excel File (.xlsx / .xls)
                        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 3: Preview */}
                {preview && !saved && (
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700 }}>Preview</div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#15803d', background: '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                          {preview.filter(r => r.status === 'new').length} new
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: '#92400e', background: '#fefce8', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #fde68a', fontWeight: 600 }}>
                          {preview.filter(r => r.status === 'exists').length} already exist
                        </span>
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || preview.filter(r => r.status === 'new').length === 0}>
                          {saving ? 'Saving…' : `Save ${preview.filter(r => r.status === 'new').length} New Students`}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>✕ Cancel</button>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Phone (Student)</th>
                            <th>Phone (Mother)</th>
                            <th>Phone (Father)</th>
                            <th>Roll Number</th>
                            <th>Password</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r, i) => (
                            <tr key={i} style={{ opacity: r.status === 'exists' ? 0.6 : 1 }}>
                              <td>{r.name}</td>
                              <td><code>{r.phone}</code></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.phone_mother || '—'}</td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.phone_father || '—'}</td>
                              <td><code style={{ color: r.status === 'new' ? '#15803d' : 'var(--gray-400)' }}>{r.roll_number || '—'}</code></td>
                              <td><code>{r.password}</code></td>
                              <td style={{ textAlign: 'center' }}>
                                {r.status === 'new'
                                  ? <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>New</span>
                                  : <span style={{ background: '#fefce8', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Already Exists</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 4: Results after save */}
                {saved && (
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#15803d' }}>✓ {saved.length} Students Added</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => downloadResults(saved)}>
                          <Download size={14} /> Download Excel
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSaved(null); setPreview(null) }}>
                          Upload More
                        </button>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Roll Number</th>
                            <th>Password</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saved.map((r, i) => (
                            <tr key={i}>
                              <td>{r.name}</td>
                              <td><code>{r.phone}</code></td>
                              <td><code style={{ fontWeight: 700 }}>{r.roll_number}</code></td>
                              <td><code>{r.password}</code></td>
                              <td style={{ textAlign: 'center' }}>
                                <a href={waUrl(r.phone, r.name, r.roll_number, r.password)} target="_blank" rel="noreferrer"
                                  style={{ background: '#25d366', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
                                  <MessageCircle size={13} /> Send
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════ ADD SINGLE STUDENT TAB ══════════ */}
            {tab === 'single' && (() => {
              const singleDdmm = ddmm
              const singlePrefix = singleForm.cls && singleForm.neetYear
                ? buildPrefix(singleForm.cls, singleForm.neetYear, singleDdmm)
                : null
              const previewRoll = singlePrefix ? `${singlePrefix}???` : null

              async function handleSingleSave() {
                const name = singleForm.name.trim()
                const phone = singleForm.phone.trim().replace(/\D/g, '')
                const pm = singleForm.phone_mother.trim().replace(/\D/g, '')
                const pf = singleForm.phone_father.trim().replace(/\D/g, '')

                if (!name) { toast.error('Student name is required'); return }
                if (phone.length !== 10) { toast.error('Student phone must be 10 digits'); return }
                if (pm && pm.length !== 10) { toast.error('Mother phone must be 10 digits'); return }
                if (pf && pf.length !== 10) { toast.error('Father phone must be 10 digits'); return }
                if (!singleForm.cls) { toast.error('Please select a class'); return }
                if (!singleForm.neetYear) { toast.error('Please select NEET year'); return }

                setSingleSaving(true)
                try {
                  // Check if phone already registered
                  const { data: existing } = await supabase
                    .from('students').select('roll_number').eq('phone_student', phone).maybeSingle()
                  if (existing) {
                    toast.error(`This phone number is already registered (Roll No: ${existing.roll_number})`)
                    setSingleSaving(false)
                    return
                  }

                  const prefix = buildPrefix(singleForm.cls, singleForm.neetYear, singleDdmm)
                  const serial = await getNextSerial(prefix)
                  const roll_number = `${prefix}${String(serial).padStart(3, '0')}`
                  const password = phone.slice(-4)

                  const { error } = await supabase.from('students').insert([{
                    name,
                    phone_student:  phone,
                    phone_mother:   pm || null,
                    phone_father:   pf || null,
                    roll_number,
                    password_hash:  password,
                    username:       roll_number,
                    class:          singleForm.cls,
                    neet_year:      singleForm.neetYear,
                    is_active:      true,
                    is_first_login: true,
                    added_by:       null,
                  }])
                  if (error) throw error

                  setSingleResult({ name, phone, phone_mother: pm, phone_father: pf, roll_number, password })
                  loadStudents()
                } catch (err) {
                  toast.error(err.message)
                } finally {
                  setSingleSaving(false)
                }
              }

              if (singleResult) {
                return (
                  <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✓</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>Student Added Successfully</div>
                    </div>

                    {/* Details card */}
                    <div style={{ background: '#f8faff', border: '1.5px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Name</div>
                          <div style={{ fontWeight: 700 }}>{singleResult.name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Roll Number</div>
                          <code style={{ fontWeight: 700, color: '#1d4ed8' }}>{singleResult.roll_number}</code>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Password</div>
                          <code style={{ fontWeight: 700 }}>{singleResult.password}</code>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <a href={waUrl(singleResult.phone, singleResult.name, singleResult.roll_number, singleResult.password)}
                        target="_blank" rel="noreferrer"
                        style={{ background: '#25d366', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <MessageCircle size={14} /> WhatsApp Student
                      </a>
                      {singleResult.phone_mother && (
                        <a href={waUrl(singleResult.phone_mother, singleResult.name, singleResult.roll_number, singleResult.password)}
                          target="_blank" rel="noreferrer"
                          style={{ background: '#128c7e', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <MessageCircle size={14} /> WhatsApp Mother
                        </a>
                      )}
                      {singleResult.phone_father && (
                        <a href={waUrl(singleResult.phone_father, singleResult.name, singleResult.roll_number, singleResult.password)}
                          target="_blank" rel="noreferrer"
                          style={{ background: '#075e54', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <MessageCircle size={14} /> WhatsApp Father
                        </a>
                      )}
                    </div>

                    <div>
                      <button className="btn btn-primary btn-sm" onClick={() => { setSingleResult(null); setSingleForm(SINGLE_BLANK) }}>
                        + Add Another Student
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="card card-body" style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Add Single Student</div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600 }}>Student Name <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input className="form-control" placeholder="Full name" value={singleForm.name}
                      onChange={e => setSingleForm(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                      <label style={{ fontWeight: 600 }}>Phone No. Student <span style={{ color: '#b91c1c' }}>*</span></label>
                      <input className="form-control" placeholder="10 digits" maxLength={10} value={singleForm.phone}
                        onChange={e => setSingleForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                      <label style={{ fontWeight: 600 }}>Phone No. Mother <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
                      <input className="form-control" placeholder="10 digits" maxLength={10} value={singleForm.phone_mother}
                        onChange={e => setSingleForm(f => ({ ...f, phone_mother: e.target.value.replace(/\D/g, '') }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                      <label style={{ fontWeight: 600 }}>Phone No. Father <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
                      <input className="form-control" placeholder="10 digits" maxLength={10} value={singleForm.phone_father}
                        onChange={e => setSingleForm(f => ({ ...f, phone_father: e.target.value.replace(/\D/g, '') }))} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                      <label style={{ fontWeight: 600 }}>Class <span style={{ color: '#b91c1c' }}>*</span></label>
                      <select className="form-control" value={singleForm.cls}
                        onChange={e => setSingleForm(f => ({ ...f, cls: e.target.value }))}>
                        <option value="">— Select —</option>
                        <option>Class 11</option>
                        <option>Class 12</option>
                        <option>Class 13 (Repeater)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                      <label style={{ fontWeight: 600 }}>NEET Target Year <span style={{ color: '#b91c1c' }}>*</span></label>
                      <select className="form-control" value={singleForm.neetYear}
                        onChange={e => setSingleForm(f => ({ ...f, neetYear: e.target.value }))}>
                        <option value="">— Select —</option>
                        {NEET_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '0 0 120px' }}>
                      <label style={{ fontWeight: 600 }}>Date (DDMM)</label>
                      <input className="form-control" value={singleDdmm} readOnly
                        style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }} />
                    </div>
                  </div>

                  {/* Roll number live preview */}
                  {singlePrefix && (
                    <div style={{ padding: '0.6rem 0.875rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--gray-500)', marginRight: '0.4rem' }}>Roll number will be:</span>
                      <code style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>{previewRoll}</code>
                      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(serial assigned on save)</span>
                    </div>
                  )}
                  {singleForm.phone.length === 10 && (
                    <div style={{ padding: '0.5rem 0.875rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--gray-500)', marginRight: '0.4rem' }}>Password will be:</span>
                      <code style={{ fontWeight: 700, color: '#1d4ed8' }}>{singleForm.phone.slice(-4)}</code>
                      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(last 4 digits of student phone)</span>
                    </div>
                  )}

                  <div style={{ paddingTop: '0.25rem' }}>
                    <button className="btn btn-primary" disabled={singleSaving} onClick={handleSingleSave}>
                      {singleSaving ? 'Saving…' : 'Add Student'}
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* ══════════ STUDENT LIST TAB ══════════ */}
            {tab === 'list' && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Search size={15} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                    <input
                      className="form-control"
                      style={{ border: 'none', boxShadow: 'none', padding: 0, flex: 1, minWidth: '180px' }}
                      placeholder="Search by name or roll number…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <span className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{filtered.length} students</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select className="form-control" style={{ width: 'auto', minWidth: '150px', fontSize: '0.8125rem' }}
                      value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                      <option value="">All Classes</option>
                      <option>Class 11</option>
                      <option>Class 12</option>
                      <option>Class 13 (Repeater)</option>
                    </select>
                    <select className="form-control" style={{ width: 'auto', minWidth: '140px', fontSize: '0.8125rem' }}
                      value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                      <option value="">All NEET Years</option>
                      {NEET_YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                    <select className="form-control" style={{ width: 'auto', minWidth: '130px', fontSize: '0.8125rem' }}
                      value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {(classFilter || yearFilter || statusFilter || search) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}
                        onClick={() => { setClassFilter(''); setYearFilter(''); setStatusFilter(''); setSearch('') }}>
                        ✕ Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-wrap">
                  {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Roll Number</th>
                          <th>Class</th>
                          <th>NEET Year</th>
                          <th>Phone</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                          <th style={{ width: '130px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(s => {
                          const isInactive = s.is_active === false
                          const isEditing = editId === s.id
                          return (
                            <>
                              <tr key={s.id} style={{ opacity: isInactive ? 0.6 : 1, background: isEditing ? '#fffbeb' : undefined }}>
                                <td>
                                  <button
                                    onClick={() => { setTab('list'); setSelectedStudent(s) }}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--primary, #3b82f6)', textDecoration: 'underline', textDecorationColor: 'transparent', fontSize: 'inherit', textAlign: 'left' }}
                                    onMouseEnter={e => e.target.style.textDecorationColor = 'currentColor'}
                                    onMouseLeave={e => e.target.style.textDecorationColor = 'transparent'}
                                  >
                                    {s.name}
                                  </button>
                                </td>
                                <td><code style={{ fontSize: '0.8rem' }}>{s.roll_number}</code></td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{s.class || '—'}</td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{s.neet_year || '—'}</td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{s.phone_student || '—'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {isInactive ? (
                                    <button
                                      style={{ background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                                      onClick={() => toggleActive(s.id, false)} title="Click to activate">
                                      Inactive
                                    </button>
                                  ) : (
                                    <button
                                      style={{ background: '#dcfce7', color: '#15803d', border: '1.5px solid #86efac', borderRadius: 'var(--radius)', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                                      onClick={() => toggleActive(s.id, true)} title="Click to deactivate">
                                      Active
                                    </button>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', color: isEditing ? '#d97706' : undefined, borderColor: isEditing ? '#d97706' : undefined }}
                                      title="Edit student"
                                      onClick={() => isEditing ? setEditId(null) : openEdit(s)}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    {s.phone_student && (
                                      <a href={waUrl(s.phone_student, s.name, s.roll_number, s.password_hash)}
                                        target="_blank" rel="noreferrer"
                                        style={{ background: '#25d366', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', padding: '0.22rem 0.45rem', borderRadius: 'var(--radius)', textDecoration: 'none' }}
                                        title="Send WhatsApp">
                                        <MessageCircle size={13} />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {isEditing && (
                                <tr key={`${s.id}-edit`}>
                                  <td colSpan={7} style={{ padding: 0, borderTop: 'none' }}>
                                    <div style={{ padding: '0.875rem 1.25rem', background: '#fffbeb', borderTop: '2px solid #d97706', borderBottom: '1px solid #fde68a' }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e', marginBottom: '0.75rem' }}>
                                        Editing: <code>{s.roll_number}</code>
                                        <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: '#b45309' }}>
                                          · Class: {s.class || '—'} · NEET {s.neet_year || '—'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                        <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Name *</label>
                                          <input className="form-control" value={editForm.name}
                                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, minWidth: '170px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Phone (Student)</label>
                                          <input className="form-control" value={editForm.phone} maxLength={10} placeholder="10 digits"
                                            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, minWidth: '170px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Phone (Mother)</label>
                                          <input className="form-control" value={editForm.phone_mother} maxLength={10} placeholder="optional"
                                            onChange={e => setEditForm(f => ({ ...f, phone_mother: e.target.value.replace(/\D/g, '') }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, minWidth: '170px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Phone (Father)</label>
                                          <input className="form-control" value={editForm.phone_father} maxLength={10} placeholder="optional"
                                            onChange={e => setEditForm(f => ({ ...f, phone_father: e.target.value.replace(/\D/g, '') }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Class *</label>
                                          <select className="form-control" value={editForm.cls}
                                            onChange={e => setEditForm(f => ({ ...f, cls: e.target.value }))}>
                                            <option value="">— Select —</option>
                                            <option>Class 11</option>
                                            <option>Class 12</option>
                                            <option>Class 13 (Repeater)</option>
                                          </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>NEET Year *</label>
                                          <select className="form-control" value={editForm.neetYear}
                                            onChange={e => setEditForm(f => ({ ...f, neetYear: e.target.value }))}>
                                            <option value="">— Select —</option>
                                            {NEET_YEARS.map(y => <option key={y}>{y}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: '#b45309', marginBottom: '0.5rem' }}>
                                        Note: the roll number stays the same even if you change class/year — it's already the student's login, so it won't be regenerated.
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-primary btn-sm" disabled={editSaving} onClick={() => handleEditSave(s)}>
                                          {editSaving ? 'Saving…' : 'Save'}
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
                  {!loading && filtered.length === 0 && (
                    <div className="empty-state">No students found</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
