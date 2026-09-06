import { supabase } from './supabase'

// Base62 keeps codes short and free of characters that read awkwardly in a
// WhatsApp message (no -, _, or lookalike-heavy symbols).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LEN = 7 // 62^7 ≈ 3.5 trillion — collisions are a rounding error at this app's scale

function randomCode() {
  const bytes = new Uint8Array(CODE_LEN)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * Mint a short link that redirects to `targetUrl` and return its full URL.
 *
 * Kept on this app's own domain deliberately — see migration_short_links.sql.
 * A collision on the primary key is astronomically unlikely at this table's
 * size, but retrying a couple of times is nearly free insurance against ever
 * failing a parent's report send over it.
 */
export async function createShortLink(targetUrl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode()
    const { error } = await supabase.from('short_links').insert({ code, target_url: targetUrl })
    if (!error) return shortUrlFor(code)
    if (error.code !== '23505') throw new Error(`Could not create a short link: ${error.message}`) // 23505 = unique_violation, retry
  }
  throw new Error('Could not create a short link after several attempts.')
}

// import.meta.env.BASE_URL already carries the '/neetcbtpractice/' the app is
// served under (see vite.config.js) — building off it here rather than
// hardcoding the path is what keeps this correct if the base path ever moves.
export function shortUrlFor(code) {
  return `${window.location.origin}${import.meta.env.BASE_URL}r/${code}`
}

export async function resolveShortLink(code) {
  const { data, error } = await supabase.from('short_links').select('target_url').eq('code', code).single()
  if (error || !data) return null
  return data.target_url
}
