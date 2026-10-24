import { supabase } from './supabase'

// Faculty accounts: created by the admin, signed in with a Faculty ID and a
// password. All reads/writes of the faculty table from a faculty session go
// through the SECURITY DEFINER functions in migration_faculty_login.sql — the
// table itself is admin-only, because it holds password hashes.

// Display order is the order the subject letter is picked in when a faculty
// member teaches across groups (Physics + Chemistry → FP…).
export const FACULTY_SUBJECTS = [
  { id: 'Physics',             group: 'P' },
  { id: 'Physical Chemistry',  group: 'C' },
  { id: 'Organic Chemistry',   group: 'C' },
  { id: 'Inorganic Chemistry', group: 'C' },
  { id: 'Complete Chemistry',  group: 'C' },
  { id: 'Mathematics',         group: 'M' },
  { id: 'Botany',              group: 'B' },
  { id: 'Zoology',             group: 'B' },
  { id: 'Biology',             group: 'B' },
]
export const FACULTY_EXAMS = ['JEE Main', 'JEE Advanced', 'NEET', 'CBSE Board', 'ICSE Board', 'Gujarat Board']

export const GROUP_NAME = { P: 'Physics', C: 'Chemistry', M: 'Mathematics', B: 'Biology' }

export const digitsOnly = s => String(s || '').replace(/\D/g, '')

// A 10-digit Indian mobile number, accepting +91 / 0 prefixes and spaces.
export function normalisePhone(raw) {
  const d = digitsOnly(raw)
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  if (d.length === 11 && d.startsWith('0')) return d.slice(1)
  return d
}

export function subjectLetter(subjects) {
  for (const s of FACULTY_SUBJECTS) if ((subjects || []).includes(s.id)) return s.group
  return null
}

// F + subject letter + YYMM + last two digits of the phone: FC261045.
// The server appends A, B … if that ID is already taken.
export function facultyBaseCode(subjects, phone, date = new Date()) {
  const letter = subjectLetter(subjects)
  const p = normalisePhone(phone)
  if (!letter || p.length !== 10) return null
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `F${letter}${yy}${mm}${p.slice(-2)}`
}

// First password: digits 5–8 of the phone number (98765 43210 → 5432).
export function defaultFacultyPassword(phone) {
  const p = normalisePhone(phone)
  return p.length === 10 ? p.slice(4, 8) : null
}

export const FACULTY_CODE_RE = /^F[PCMB]\d{6}[A-Z]?$/i

// Aadhaar is kept for records only; the UI never shows more than the last 4.
export const maskAadhaar = a => {
  const d = digitsOnly(a)
  return d ? `XXXX XXXX ${d.slice(-4)}` : ''
}

function rpcError(error) {
  // Postgres "raise exception" text arrives in error.message; keep it as-is,
  // it is written for the person reading it.
  return new Error(error?.message || 'Something went wrong')
}

export async function facultyLogin(code, password) {
  const { data, error } = await supabase.rpc('faculty_login', { p_code: code.trim(), p_password: password })
  if (error) throw rpcError(error)
  return data   // { token, faculty }
}

export async function facultyMe(token) {
  const { data, error } = await supabase.rpc('faculty_me', { p_token: token })
  if (error) throw rpcError(error)
  return data
}

export async function facultyLogout(token) {
  await supabase.rpc('faculty_logout', { p_token: token })
}

export async function facultyChangePassword(token, newPassword) {
  const { data, error } = await supabase.rpc('faculty_change_password', { p_token: token, p_new: newPassword })
  if (error) throw rpcError(error)
  return data
}

export async function facultyUpdateProfile(token, profile) {
  const { data, error } = await supabase.rpc('faculty_update_profile', { p_token: token, p_profile: profile })
  if (error) throw rpcError(error)
  return data
}

export async function adminNextFacultyCode(base) {
  const { data, error } = await supabase.rpc('admin_next_faculty_code', { p_base: base })
  if (error) throw rpcError(error)
  return data
}

export async function adminSetFacultyPassword(facultyId, password) {
  const { error } = await supabase.rpc('admin_set_faculty_password', { p_faculty_id: facultyId, p_password: password })
  if (error) throw rpcError(error)
}

export const LOGIN_URL = 'https://chemistryarun-hub.github.io/neetcbtpractice/'

export function facultyWhatsAppUrl({ phone, name, faculty_code }, password) {
  const lines = [
    `Hello ${name},`,
    `Your NEETCBT faculty login:`,
    `Faculty ID: ${faculty_code}`,
    password ? `Password: ${password}` : null,
    `Login: ${LOGIN_URL}`,
    password ? `You will be asked to set your own password on first login.` : null,
  ].filter(Boolean)
  return `https://wa.me/91${normalisePhone(phone)}?text=${encodeURIComponent(lines.join('\n'))}`
}
