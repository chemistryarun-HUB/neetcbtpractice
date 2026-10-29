import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadSession, saveStudentSession, updateStoredStudent, saveFacultySession, updateStoredFaculty, clearSession } from '../lib/session'
import { facultyMe, facultyLogout } from '../lib/faculty'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null) // 'admin' | 'faculty' | 'student' | null
  const [user, setUser] = useState(null)  // admin {email}, faculty profile, or student row
  const [facultyToken, setFacultyToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Only the admin signs in through Supabase Auth now; being signed in is not
  // enough, the account also needs a row in `admins` (migration_admin_auth.sql).
  // Faculty sign in with a Faculty ID instead (migration_faculty_login.sql).
  async function resolveAdmin(authUser) {
    const { data: admin } = await supabase
      .from('admins')
      .select('email')
      .eq('user_id', authUser.id)
      .maybeSingle()
    return admin ? { email: admin.email } : null
  }

  useEffect(() => {
    // Student and faculty sessions live in storage (lib/session.js); the
    // admin's is Supabase's own.
    const stored = loadSession()
    if (stored?.role === 'student') {
      setRole('student')
      setUser(stored.student)
      setLoading(false)
      return
    }
    if (stored?.role === 'faculty') {
      // Show the stored profile at once, then confirm the token with the
      // server: a disabled account or a password reset by the admin ends the
      // session here rather than on the next save.
      setRole('faculty')
      setUser(stored.faculty)
      setFacultyToken(stored.token)
      setLoading(false)
      facultyMe(stored.token)
        .then(fresh => { setUser(fresh); updateStoredFaculty(fresh) })
        .catch(() => { clearSession(); setRole(null); setUser(null); setFacultyToken(null) })
      return
    }

    // Never leave the whole app on a spinner: if Supabase is slow to answer,
    // show the page after a few seconds and let the admin check finish behind it.
    const giveUp = setTimeout(() => setLoading(false), 4000)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const admin = await resolveAdmin(session.user)
        if (admin) { setRole('admin'); setUser(admin) }
      }
    }).finally(() => { clearTimeout(giveUp); setLoading(false) })

    // No await inside this callback: supabase-js holds its auth lock while it
    // runs, so a query awaited here (the admins lookup) blocks getSession()
    // above until the lock times out — that was the long blank spinner when
    // opening the admin panel. Deferring with setTimeout releases the lock first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const admin = await resolveAdmin(session.user)
          if (admin) { setRole('admin'); setUser(admin) }
        }, 0)
      } else if (!loadSession()) {
        // A Supabase sign-out must not knock out a student or faculty
        // session, which don't use Supabase auth at all.
        setRole(null)
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Returns true only for a valid Supabase login that is also in `admins`.
  async function adminLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data?.user) return false
    const admin = await resolveAdmin(data.user)
    if (!admin) {
      await supabase.auth.signOut()
      return false
    }
    clearSession()
    setRole('admin')
    setUser(admin)
    return true
  }

  function studentLogin(student, remember = true) {
    saveStudentSession(student, remember)
    setRole('student')
    setUser(student)
  }

  // `result` is what faculty_login returned: { token, faculty }.
  function facultySignIn(result, remember = true) {
    saveFacultySession(result.faculty, result.token, remember)
    setFacultyToken(result.token)
    setRole('faculty')
    setUser(result.faculty)
  }

  function updateStudentUser(updated) {
    const merged = { ...user, ...updated }
    updateStoredStudent(merged)
    setUser(merged)
  }

  function updateFacultyUser(updated) {
    const merged = { ...user, ...updated }
    updateStoredFaculty(merged)
    setUser(merged)
  }

  async function logout() {
    if (role === 'faculty' && facultyToken) { try { await facultyLogout(facultyToken) } catch { /* offline */ } }
    await supabase.auth.signOut()
    // Clears both stores, so an explicit logout really does end a remembered
    // session — that's the escape hatch on a shared device.
    clearSession()
    setFacultyToken(null)
    setRole(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ role, user, loading, facultyToken, adminLogin, studentLogin, facultySignIn, updateStudentUser, updateFacultyUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
