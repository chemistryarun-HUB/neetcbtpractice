import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadSession, saveStudentSession, updateStoredStudent, clearSession } from '../lib/session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null) // 'admin' | 'faculty' | 'student' | null
  const [user, setUser] = useState(null)  // faculty supabase user or student object
  const [loading, setLoading] = useState(true)

  // Admin and faculty both sign in through Supabase Auth; what tells them
  // apart is a row in `admins` (see migration_admin_auth.sql). Checked first,
  // so an admin is never mistaken for a faculty member who still needs setup.
  async function resolveSupabaseUser(authUser) {
    const { data: admin } = await supabase
      .from('admins')
      .select('email')
      .eq('user_id', authUser.id)
      .maybeSingle()
    if (admin) return { role: 'admin', user: { email: admin.email } }

    const { data: faculty } = await supabase
      .from('faculty')
      .select('*')
      .eq('user_id', authUser.id)
      .single()
    if (faculty) return { role: 'faculty', user: faculty }
    return null
  }

  useEffect(() => {
    // Restore session from storage — localStorage ("remember me") first, then
    // the per-tab one. See lib/session.js. Only students live there now;
    // admin and faculty sessions are Supabase's own.
    const stored = loadSession()
    if (stored?.role === 'student') {
      setRole('student')
      setUser(stored.student)
      setLoading(false)
      return
    }

    // Check Supabase session for admin / faculty
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const resolved = await resolveSupabaseUser(session.user)
        if (resolved) {
          setRole(resolved.role)
          setUser(resolved.user)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const resolved = await resolveSupabaseUser(session.user)
        if (resolved) {
          setRole(resolved.role)
          setUser(resolved.user)
        } else {
          // New faculty — needs profile setup
          setRole('faculty_setup')
          setUser({ supabase_user: session.user })
        }
      } else {
        // A Supabase sign-out must not knock out a student session, which
        // doesn't use Supabase auth at all.
        if (!loadSession()) {
          setRole(null)
          setUser(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Returns true only for a valid Supabase login that is also in `admins`.
  // Anyone else who gets the password right is signed straight back out, so
  // a faculty account can't wander into the admin portal through this form.
  // The Supabase session persists across tabs on its own; logout ends it.
  async function adminLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data?.user) return false

    const resolved = await resolveSupabaseUser(data.user)
    if (resolved?.role !== 'admin') {
      await supabase.auth.signOut()
      return false
    }
    clearSession()
    setRole('admin')
    setUser(resolved.user)
    return true
  }

  function studentLogin(student, remember = true) {
    saveStudentSession(student, remember)
    setRole('student')
    setUser(student)
  }

  function updateStudentUser(updated) {
    const merged = { ...user, ...updated }
    updateStoredStudent(merged)
    setUser(merged)
  }

  function updateFacultyUser(updated) {
    setUser(prev => ({ ...prev, ...updated }))
  }

  async function logout() {
    await supabase.auth.signOut()
    // Clears both stores, so an explicit logout really does end a remembered
    // session — that's the escape hatch on a shared device.
    clearSession()
    setRole(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ role, user, loading, adminLogin, studentLogin, updateStudentUser, updateFacultyUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
