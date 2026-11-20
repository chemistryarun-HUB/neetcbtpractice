// Doubt Desk: the browser side of the doubt-helper server function
// (supabase/functions/doubt-helper). The Claude API key lives only in that
// function; the browser holds a student session token from
// student_session_start() (migration_doubt_desk.sql), saved at login.
import { supabase } from './supabase'

const TOKEN_KEY = 'neetcbt_doubt_token'

export function getDoubtToken() {
  try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function saveDoubtToken(token, remember) {
  try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token) } catch { /* storage off */ }
}

export function clearDoubtToken() {
  for (const s of [localStorage, sessionStorage]) {
    try { s.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  }
}

// Asks the database for a token right after a successful student login. Only
// students with the Doubt Desk switched on need one; a failure here must never
// block the login itself.
export async function startDoubtSession(rollNumber, password, remember) {
  try {
    const { data, error } = await supabase.rpc('student_session_start', { p_roll: rollNumber, p_password: password })
    if (!error && data) saveDoubtToken(data, remember)
  } catch { /* Doubt Desk just stays unavailable */ }
}

/** Calls the server function. Throws an Error whose message is safe to show. */
export async function doubtDesk(action, payload = {}) {
  const token = getDoubtToken()
  if (!token) throw new Error('Doubt Desk ke liye ek baar logout karke dobara login karo.')
  const { data, error } = await supabase.functions.invoke('doubt-helper', { body: { action, token, ...payload } })
  if (error) {
    let msg = 'Doubt Desk abhi kaam nahi kar raha. Thodi der baad try karo.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) msg = body.error
    } catch { /* keep the generic message */ }
    throw new Error(msg)
  }
  return data
}
