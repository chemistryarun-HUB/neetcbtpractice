import { useState, useEffect, useMemo } from 'react'
import Topbar from '../../components/shared/Topbar'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, X, Search, Pencil, Trash2, KeyRound, Copy, MessageCircle, Check, UserCheck, UserX } from 'lucide-react'
import {
  FACULTY_SUBJECTS, FACULTY_EXAMS, GROUP_NAME, normalisePhone, digitsOnly, subjectLetter,
  facultyBaseCode, defaultFacultyPassword, maskAadhaar, adminNextFacultyCode, adminSetFacultyPassword,
  facultyWhatsAppUrl,
} from '../../lib/faculty'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
  { to: '/admin/gseb', label: 'GSEB Papers' },
]

// Never select password_hash into the browser, even for the admin.
const COLUMNS = 'id, faculty_code, name, phone, email, aadhaar, subjects, exams, subject, is_active, must_change_password, last_login_at, created_at'

const EMPTY = { name: '', phone: '', aadhaar: '', email: '', subjects: [], exams: [] }

const GROUP_TONE = {
  P: { bg: '#eef2ff', fg: '#4338ca' },
  C: { bg: '#eff6ff', fg: '#1d4ed8' },
  M: { bg: '#fdf4ff', fg: '#a21caf' },
  B: { bg: '#f0fdf4', fg: '#15803d' },
}
const groupOf = s => FACULTY_SUBJECTS.find(x => x.id === s)?.group

function Chip({ children, tone, active, onClick, small }) {
  const t = tone || { bg: 'var(--gray-100)', fg: 'var(--gray-700)' }
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: small ? '0.15rem 0.55rem' : '0.4rem 0.8rem', borderRadius: 999,
        fontSize: small ? '0.74rem' : '0.84rem', fontWeight: 600, cursor: onClick ? 'pointer' : 'default',
        border: `1.5px solid ${active === false ? 'var(--gray-200)' : t.fg + '33'}`,
        background: active === false ? '#fff' : t.bg, color: active === false ? 'var(--gray-500)' : t.fg,
        transition: 'all .12s', margin: '0 0.35rem 0.35rem 0',
      }}>
      {active && <Check size={13} />}{children}
    </button>
  )
}

function copy(text, what) {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error('Copy failed'))
}

// The login details, shown once after creating a faculty member or resetting
// their password — the only moment the plain password exists in the app.
function CredentialCard({ fac, password, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          Login details for {fac.name}
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#4338ca)', color: '#fff', borderRadius: 14, padding: '1.25rem 1.4rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, letterSpacing: '0.06em' }}>FACULTY ID</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <code style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '0.04em' }}>{fac.faculty_code}</code>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={() => copy(fac.faculty_code, 'Faculty ID')}><Copy size={14} /></button>
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, letterSpacing: '0.06em', marginTop: '0.75rem' }}>PASSWORD</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <code style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '0.2em' }}>{password}</code>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={() => copy(password, 'Password')}><Copy size={14} /></button>
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.6rem' }}>Digits 5–8 of their phone number. They must set their own password on first login.</div>
          </div>
          <a href={facultyWhatsAppUrl(fac, password)} target="_blank" rel="noreferrer" className="btn btn-success" style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.4rem' }}>
            <MessageCircle size={16} /> Send on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)   // null | 'new' | faculty row
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)   // { fac, password }

  async function load() {
    const { data, error } = await supabase.from('faculty').select(COLUMNS).order('created_at', { ascending: false })
    if (error) toast.error(error.message.includes('faculty_code') ? 'Run migration_faculty_login.sql in Supabase first.' : error.message)
    setFaculty(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY); setEditing('new') }
  function openEdit(f) {
    setForm({ name: f.name || '', phone: f.phone || '', aadhaar: f.aadhaar || '', email: f.email || '', subjects: f.subjects || [], exams: f.exams || [] })
    setEditing(f)
  }
  const toggle = (key, v) => setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }))

  const phone = normalisePhone(form.phone)
  const isNew = editing === 'new'
  const previewCode = isNew ? facultyBaseCode(form.subjects, phone) : editing?.faculty_code
  const previewPw = defaultFacultyPassword(phone)
  const aadhaarDigits = digitsOnly(form.aadhaar)
  const duplicatePhone = phone.length === 10 && faculty.find(f => normalisePhone(f.phone) === phone && f.id !== editing?.id)

  const problems = [
    !form.name.trim() && 'Name',
    phone.length !== 10 && 'a 10-digit phone number',
    aadhaarDigits && aadhaarDigits.length !== 12 && 'a 12-digit Aadhaar (or leave it empty)',
    !form.subjects.length && 'at least one subject',
    !form.exams.length && 'at least one exam',
  ].filter(Boolean)

  async function save(e) {
    e.preventDefault()
    if (problems.length) { toast.error(`Please add ${problems.join(', ')}`); return }
    if (duplicatePhone) { toast.error(`This phone is already used by ${duplicatePhone.name} (${duplicatePhone.faculty_code})`); return }
    setSaving(true)
    try {
      const row = {
        name: form.name.trim(),
        phone,
        aadhaar: aadhaarDigits || null,
        email: form.email.trim() || null,
        subjects: form.subjects,
        exams: form.exams,
        subject: GROUP_NAME[subjectLetter(form.subjects)],
      }
      if (isNew) {
        const code = await adminNextFacultyCode(previewCode)
        const { data, error } = await supabase.from('faculty').insert({ ...row, faculty_code: code, is_active: true }).select(COLUMNS).single()
        if (error) throw error
        await adminSetFacultyPassword(data.id, previewPw)
        setEditing(null)
        setCredentials({ fac: data, password: previewPw })
        toast.success(`${data.name} added as ${data.faculty_code}`)
      } else {
        const { error } = await supabase.from('faculty').update(row).eq('id', editing.id)
        if (error) throw error
        setEditing(null)
        toast.success('Faculty updated')
      }
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function resetPassword(f) {
    const pw = defaultFacultyPassword(f.phone)
    if (!pw) { toast.error('This faculty has no valid phone number'); return }
    if (!confirm(`Reset ${f.name}'s password to ${pw} (digits 5–8 of their phone)? They will be signed out and asked to set a new one.`)) return
    try {
      await adminSetFacultyPassword(f.id, pw)
      setCredentials({ fac: f, password: pw })
      load()
    } catch (err) { toast.error(err.message) }
  }

  async function toggleActive(f) {
    const { error } = await supabase.from('faculty').update({ is_active: !f.is_active }).eq('id', f.id)
    if (error) { toast.error(error.message); return }
    toast.success(f.is_active ? `${f.name} disabled — they can no longer log in` : `${f.name} enabled`)
    load()
  }

  async function remove(f) {
    if (!confirm(`Delete ${f.name} (${f.faculty_code})? This cannot be undone.`)) return
    const { error } = await supabase.from('faculty').delete().eq('id', f.id)
    if (error) {
      toast.error(error.code === '23503'
        ? 'This faculty has added students, so it can’t be deleted. Disable the account instead.'
        : error.message, { duration: 6000 })
      return
    }
    toast.success('Faculty deleted')
    load()
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return faculty
    return faculty.filter(f => [f.name, f.faculty_code, f.phone, f.email, ...(f.subjects || []), ...(f.exams || [])]
      .some(v => (v || '').toLowerCase().includes(q)))
  }, [faculty, query])

  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ marginBottom: 0 }}>Faculty</h2>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {faculty.length} faculty · {faculty.filter(f => f.is_active).length} active
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-control" style={{ paddingLeft: 32, width: 240 }} placeholder="Search name, ID, phone, subject" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={16} /> Add Faculty
            </button>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : shown.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                {faculty.length ? 'No faculty match your search.' : (
                  <>
                    <div style={{ fontSize: '2rem' }}>👩‍🏫</div>
                    <div style={{ fontWeight: 700, margin: '0.4rem 0' }}>No faculty yet</div>
                    <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={14} /> Add the first faculty</button>
                  </>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Faculty ID</th><th>Name</th><th>Phone</th><th>Subjects</th><th>Exams</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {shown.map(f => (
                    <tr key={f.id} style={{ opacity: f.is_active ? 1 : 0.55 }}>
                      <td>
                        <button className="btn btn-ghost btn-sm" title="Copy Faculty ID" onClick={() => copy(f.faculty_code, 'Faculty ID')} style={{ padding: '0.2rem 0.4rem' }}>
                          <code style={{ fontWeight: 800, color: 'var(--primary)' }}>{f.faculty_code || '—'}</code>
                        </button>
                      </td>
                      <td>
                        <strong>{f.name}</strong>
                        {f.email && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{f.email}</div>}
                        {f.aadhaar && <div className="text-muted" style={{ fontSize: '0.72rem' }}>Aadhaar {maskAadhaar(f.aadhaar)}</div>}
                      </td>
                      <td>{f.phone || '—'}</td>
                      <td style={{ maxWidth: 260 }}>{(f.subjects || []).map(s => <Chip key={s} small tone={GROUP_TONE[groupOf(s)]}>{s}</Chip>)}</td>
                      <td style={{ maxWidth: 220 }}>{(f.exams || []).map(s => <Chip key={s} small>{s}</Chip>)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        <span className="badge" style={{ background: f.is_active ? '#dcfce7' : '#fee2e2', color: f.is_active ? '#15803d' : '#b91c1c' }}>{f.is_active ? 'Active' : 'Disabled'}</span>
                        <div className="text-muted" style={{ marginTop: '0.25rem' }}>
                          {f.last_login_at ? `Last login ${new Date(f.last_login_at).toLocaleDateString()}` : 'Never logged in'}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(f)}><Pencil size={14} /></button>
                        <a className="btn btn-ghost btn-sm" title="Send Faculty ID on WhatsApp" href={facultyWhatsAppUrl(f)} target="_blank" rel="noreferrer"><MessageCircle size={14} /></a>
                        <button className="btn btn-ghost btn-sm" title="Reset password" onClick={() => resetPassword(f)}><KeyRound size={14} /></button>
                        <button className="btn btn-ghost btn-sm" title={f.is_active ? 'Disable login' : 'Enable login'} onClick={() => toggleActive(f)}>
                          {f.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: '#b91c1c' }} onClick={() => remove(f)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              {isNew ? 'Add Faculty' : `Edit ${editing.name}`}
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Name *</label>
                    <input className="form-control" autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label>Phone No. *</label>
                    <input className="form-control" inputMode="numeric" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" />
                    {duplicatePhone && <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: 4 }}>Already used by {duplicatePhone.name} ({duplicatePhone.faculty_code})</div>}
                  </div>
                  <div className="form-group">
                    <label>Aadhaar No. <span className="text-muted">(optional)</span></label>
                    <input className="form-control" inputMode="numeric" maxLength={14} value={aadhaarDigits.replace(/(\d{4})(?=\d)/g, '$1 ')}
                      onChange={e => setForm(f => ({ ...f, aadhaar: digitsOnly(e.target.value).slice(0, 12) }))} placeholder="XXXX XXXX XXXX" />
                  </div>
                  <div className="form-group">
                    <label>Email <span className="text-muted">(optional)</span></label>
                    <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@example.com" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Subjects * <span className="text-muted">(select all that apply)</span></label>
                  <div>
                    {FACULTY_SUBJECTS.map(s => (
                      <Chip key={s.id} tone={GROUP_TONE[s.group]} active={form.subjects.includes(s.id)} onClick={() => toggle('subjects', s.id)}>{s.id}</Chip>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Exams * <span className="text-muted">(select all that apply)</span></label>
                  <div>
                    {FACULTY_EXAMS.map(x => (
                      <Chip key={x} tone={{ bg: '#fff7ed', fg: '#c2410c' }} active={form.exams.includes(x)} onClick={() => toggle('exams', x)}>{x}</Chip>
                    ))}
                  </div>
                </div>

                {/* Live preview of the login being created. */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: 12, padding: '0.8rem 1rem' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>FACULTY ID</div>
                    <code style={{ fontSize: '1.2rem', fontWeight: 800, color: previewCode ? 'var(--primary)' : 'var(--gray-400)' }}>{previewCode || 'F?YYMM??'}</code>
                  </div>
                  {isNew && (
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>FIRST PASSWORD</div>
                      <code style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.15em', color: previewPw ? 'var(--gray-800)' : 'var(--gray-400)' }}>{previewPw || '••••'}</code>
                    </div>
                  )}
                  <div className="text-muted" style={{ fontSize: '0.75rem', flex: '1 1 220px', lineHeight: 1.45 }}>
                    {isNew
                      ? <>F + subject letter (P · C · M · B) + this year &amp; month + last 2 digits of the phone. Password = phone digits 5–8; they change it on first login.</>
                      : <>The Faculty ID stays the same when you edit. Use the key icon in the list to reset the password.</>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : isNew ? 'Create Faculty' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credentials && <CredentialCard fac={credentials.fac} password={credentials.password} onClose={() => setCredentials(null)} />}
    </div>
  )
}
