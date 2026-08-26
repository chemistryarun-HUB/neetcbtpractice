import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../lib/constants'
import { loadSession, saveStudentSession, saveAdminSession, updateStoredStudent, clearSession } from '../lib/session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null) // 'admin' | 'faculty' | 'student' | null
  const [user, setUser] = useState(null)  // faculty supabase user or student object
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from storage — localStorage ("remember me") first, then
    // the per-tab one. See lib/session.js.
    const stored = loadSession()
    if (stored?.role === 'admin') {
      setRole('admin')
      setUser({ email: ADMIN_EMAIL })
      setLoading(false)
      return
    }
    if (stored?.role === 'student') {
      setRole('student')
      setUser(stored.student)
      setLoading(false)
      return
    }

    // Check Supabase session for faculty
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('faculty').select('*').eq('user_id', session.user.id).single()
          .then(({ data: faculty }) => {
            if (faculty) {
              setRole('faculty')
              setUser(faculty)
            }
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: faculty } = await supabase
          .from('faculty')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (faculty) {
          setRole('faculty')
          setUser(faculty)
        } else {
          // New faculty — needs profile setup
          setRole('faculty_setup')
          setUser({ supabase_user: session.user })
        }
      } else {
        // A Supabase sign-out must not knock out an admin/student session,
        // which doesn't use Supabase auth at all.
        if (!loadSession()) {
          setRole(null)
          setUser(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function adminLogin(email, password, remember = true) {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      saveAdminSession(remember)
      setRole('admin')
      setUser({ email: ADMIN_EMAIL })
      return true
    }
    return false
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
