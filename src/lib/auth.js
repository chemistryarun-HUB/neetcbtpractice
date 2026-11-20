import { supabase } from './supabase'
import { clearSession } from './session'

export async function loginAsStudent(rollNumber, password) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('roll_number', rollNumber)
    .single()

  if (error || !data) throw new Error('Student not found')

  if (data.password_hash !== password) throw new Error('Invalid password')

  return { role: 'student', student: data }
}

// Faculty sign in with a Faculty ID — see lib/faculty.js.

// Nothing imports this module today — hooks/useAuth.jsx is the live path — but
// it is kept in step deliberately: clearing sessionStorage by hand was correct
// only while that was the only store. A "remember me" session lives in
// localStorage, so hand-rolled removeItem calls would now leave someone signed
// in after logging out. Session storage belongs to lib/session.js alone.
export async function logout() {
  await supabase.auth.signOut()
  clearSession()
}
