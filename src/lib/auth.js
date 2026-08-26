import { supabase } from './supabase'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './constants'
import { clearSession } from './session'

export async function loginAsAdmin(email, password) {
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    throw new Error('Invalid admin credentials')
  }
  return { role: 'admin', email }
}

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

export async function loginAsFaculty() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/faculty/dashboard`,
    },
  })
  if (error) throw error
  return data
}

export async function getCurrentFaculty() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('faculty')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

// Nothing imports this module today — hooks/useAuth.jsx is the live path — but
// it is kept in step deliberately: clearing sessionStorage by hand was correct
// only while that was the only store. A "remember me" session lives in
// localStorage, so hand-rolled removeItem calls would now leave someone signed
// in after logging out. Session storage belongs to lib/session.js alone.
export async function logout() {
  await supabase.auth.signOut()
  clearSession()
}
