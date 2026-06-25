import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ADMIN_EMAIL } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null) // 'admin' | 'faculty' | 'student' | null
  const [user, setUser] = useState(null)  // faculty supabase user or student object
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from storage
    const storedRole = sessionStorage.getItem('neetcbt_role')
    if (storedRole === 'admin') {
      setRole('admin')
      setUser({ email: ADMIN_EMAIL })
      setLoading(false)
      return
    }
    if (storedRole === 'student') {
      const student = JSON.parse(sessionStorage.getItem('neetcbt_student') || 'null')
      if (student) {
        setRole('student')
        setUser(student)
        setLoading(false)
        return
      }
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
        const storedRole = sessionStorage.getItem('neetcbt_role')
        if (storedRole !== 'admin' && storedRole !== 'student') {
          setRole(null)
          setUser(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function adminLogin(email, password) {
    if (email === ADMIN_EMAIL && password === 'Admin@2025') {
      sessionStorage.setItem('neetcbt_role', 'admin')
      setRole('admin')
      setUser({ email: ADMIN_EMAIL })
      return true
    }
    return false
  }

  function studentLogin(student) {
    sessionStorage.setItem('neetcbt_role', 'student')
    sessionStorage.setItem('neetcbt_student', JSON.stringify(student))
    setRole('student')
    setUser(student)
  }

  function updateStudentUser(updated) {
    const merged = { ...user, ...updated }
    sessionStorage.setItem('neetcbt_student', JSON.stringify(merged))
    setUser(merged)
  }

  function updateFacultyUser(updated) {
    setUser(prev => ({ ...prev, ...updated }))
  }

  async function logout() {
    await supabase.auth.signOut()
    sessionStorage.removeItem('neetcbt_role')
    sessionStorage.removeItem('neetcbt_student')
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
