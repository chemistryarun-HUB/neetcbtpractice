// Where a logged-in session lives, and for how long.
//
// Sessions used to be kept only in sessionStorage, which is per-tab and dies
// with it. Students open the site from a WhatsApp link — a fresh tab every
// time — so they were retyping their roll number and password on essentially
// every visit, and relying on whether their browser's password manager happened
// to have saved it.
//
// "Remember me" (default on) moves the session to localStorage so it survives
// the tab closing and the phone restarting. Leaving it unchecked keeps the old
// per-tab behaviour, which is what you want on a borrowed or shared device.

const ROLE_KEY = 'neetcbt_role'
const STUDENT_KEY = 'neetcbt_student'
const EXPIRES_KEY = 'neetcbt_expires'

// A remembered session is not forever. Long enough that a student never thinks
// about it during a course, short enough that one left on a shared computer
// stops working. Only applies to localStorage — a sessionStorage session
// already ends when the tab does.
const REMEMBER_DAYS = 30

// `password_hash` is the student's password in plain text despite the column
// name — login compares it with !== , and the admin types it in directly. It is
// never read after login (ChangePassword only ever writes a new one), so it is
// dropped before the session is written down. Without this, ticking "remember
// me" would leave a working credential sitting in localStorage on whatever
// device the student borrowed.
function withoutCredentials(student) {
  if (!student) return student
  const { password_hash: _omit, ...safe } = student
  return safe
}

function stores() {
  return [localStorage, sessionStorage]
}

// Belt and braces: always clear BOTH stores before writing. Otherwise logging
// in without "remember me" on a device that has a remembered session would
// leave the old localStorage copy behind, and it would win on the next restore.
export function clearSession() {
  for (const s of stores()) {
    try {
      s.removeItem(ROLE_KEY)
      s.removeItem(STUDENT_KEY)
      s.removeItem(EXPIRES_KEY)
    } catch { /* private mode — nothing to clear */ }
  }
}

export function saveStudentSession(student, remember) {
  clearSession()
  const store = remember ? localStorage : sessionStorage
  try {
    store.setItem(ROLE_KEY, 'student')
    store.setItem(STUDENT_KEY, JSON.stringify(withoutCredentials(student)))
    if (remember) store.setItem(EXPIRES_KEY, String(Date.now() + REMEMBER_DAYS * 864e5))
  } catch { /* storage unavailable; the session just won't outlive the page */ }
}

export function saveAdminSession(remember) {
  clearSession()
  const store = remember ? localStorage : sessionStorage
  try {
    store.setItem(ROLE_KEY, 'admin')
    if (remember) store.setItem(EXPIRES_KEY, String(Date.now() + REMEMBER_DAYS * 864e5))
  } catch { /* as above */ }
}

// Keeps the stored copy in step with an updated student row (e.g. after a
// password change flips is_first_login) without caring which store holds it.
export function updateStoredStudent(student) {
  for (const s of stores()) {
    try {
      if (s.getItem(ROLE_KEY) === 'student') {
        s.setItem(STUDENT_KEY, JSON.stringify(withoutCredentials(student)))
      }
    } catch { /* ignore */ }
  }
}

/**
 * The stored session, or null.
 *
 * localStorage is checked first so a remembered session wins over a stale
 * per-tab one. An expired session is cleared here rather than merely ignored,
 * so it can't linger on the device.
 */
export function loadSession() {
  for (const store of stores()) {
    let role, expires, raw
    try {
      role = store.getItem(ROLE_KEY)
      expires = store.getItem(EXPIRES_KEY)
      raw = store.getItem(STUDENT_KEY)
    } catch { continue }
    if (!role) continue

    if (expires && Date.now() > Number(expires)) { clearSession(); return null }

    if (role === 'admin') return { role: 'admin', student: null }
    if (role === 'student') {
      try {
        const student = JSON.parse(raw || 'null')
        if (student) return { role: 'student', student }
      } catch { /* corrupt entry — fall through and treat as logged out */ }
    }
  }
  return null
}
