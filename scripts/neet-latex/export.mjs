// One-off: reads all Chemistry Unit 7 (English) questions and writes them,
// encrypted to scripts/neet-latex/pub.pem, as out/u7.enc + out/u7.key.
import { createClient } from '@supabase/supabase-js'
import { gzipSync } from 'zlib'
import { randomBytes, createCipheriv, publicEncrypt, constants } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const rows = []
for (let from = 0; ; from += 500) {
  const { data, error } = await sb.from('questions').select('*')
    .eq('subject', 'Chemistry').eq('medium', 'en').ilike('unit', '%Redox Reactions and Electrochemistry%')
    .order('qid').range(from, from + 499)
  if (error) throw error
  rows.push(...data)
  if (data.length < 500) break
}
console.log('ROWS', rows.length)
const key = randomBytes(32), iv = randomBytes(12)
const c = createCipheriv('aes-256-gcm', key, iv)
const body = Buffer.concat([c.update(gzipSync(Buffer.from(JSON.stringify(rows)))), c.final()])
mkdirSync('out', { recursive: true })
writeFileSync('out/u7.enc', Buffer.concat([iv, c.getAuthTag(), body]))
writeFileSync('out/u7.key', publicEncrypt({ key: readFileSync('scripts/neet-latex/pub.pem'), padding: constants.RSA_PKCS1_OAEP_PADDING }, key))
