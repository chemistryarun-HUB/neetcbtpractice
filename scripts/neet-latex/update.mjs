// One-off: saves the Unit 7 LaTeX text. First re-reads each row and backs it
// up (encrypted to pub.pem, out/backup.enc + out/backup.key). A row is
// skipped if it is now content-locked or any field changed since the export.
// Only the fields in each patch are written; nothing else is touched.
import { createClient } from '@supabase/supabase-js'
import { gzipSync } from 'zlib'
import { randomBytes, createCipheriv, publicEncrypt, constants } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const items = JSON.parse(readFileSync('scripts/neet-latex/u7-update.json', 'utf8'))
const ids = items.map(x => x.id)
const cur = []
for (let i = 0; i < ids.length; i += 100) {
  const { data, error } = await sb.from('questions').select('*').in('id', ids.slice(i, i + 100))
  if (error) throw error
  cur.push(...data)
}
console.log('READ', cur.length, 'of', ids.length)
if (cur.length !== ids.length) throw new Error('missing rows')

const key = randomBytes(32), iv = randomBytes(12)
const c = createCipheriv('aes-256-gcm', key, iv)
const body = Buffer.concat([c.update(gzipSync(Buffer.from(JSON.stringify(cur)))), c.final()])
mkdirSync('out', { recursive: true })
writeFileSync('out/backup.enc', Buffer.concat([iv, c.getAuthTag(), body]))
writeFileSync('out/backup.key', publicEncrypt({ key: readFileSync('scripts/neet-latex/pub.pem'), padding: constants.RSA_PKCS1_OAEP_PADDING }, key))
console.log('BACKUP written')

const byId = Object.fromEntries(cur.map(r => [r.id, r]))
let ok = 0, fields = 0
const skipped = [], failed = []
for (const it of items) {
  const r = byId[it.id]
  if (r.content_locked) { skipped.push(`${it.qid}:locked`); continue }
  const changed = Object.keys(it.expect).filter(f => (r[f] ?? '') !== (it.expect[f] ?? ''))
  if (changed.length) { skipped.push(`${it.qid}:changed(${changed.join(',')})`); continue }
  const { data, error } = await sb.from('questions').update(it.patch).eq('id', it.id).select('id')
  if (error || !data || data.length !== 1) { failed.push(`${it.qid}:${error?.message || 'no row updated'}`); continue }
  ok++; fields += Object.keys(it.patch).length
}
console.log('UPDATED', ok, 'FIELDS', fields)
console.log('SKIPPED', skipped.length, skipped.join(' '))
console.log('FAILED', failed.length, failed.join(' '))
writeFileSync('out/result.txt', `UPDATED ${ok} FIELDS ${fields}\nSKIPPED ${skipped.length} ${skipped.join(' ')}\nFAILED ${failed.length} ${failed.join(' ')}\n`)
