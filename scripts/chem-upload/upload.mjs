import fs from 'fs'
const rows = JSON.parse(fs.readFileSync('scripts/chem-upload/dump/unit3.json', 'utf8'))
fs.mkdirSync('scripts/chem-upload/dump/img', { recursive: true })
const keys = ['question_image', 'option1_image', 'option2_image', 'option3_image', 'option4_image']
const log = []
for (const q of rows) for (const k of keys) {
  const u = q[k]; if (!u) continue
  try {
    const r = await fetch(u)
    const buf = Buffer.from(await r.arrayBuffer())
    const ext = (u.split('.').pop() || 'png').split('?')[0].slice(0, 5)
    const f = `${q.qid}_${k.replace('_image', '')}.${ext}`
    if (r.ok) fs.writeFileSync(`scripts/chem-upload/dump/img/${f}`, buf)
    log.push(`${q.qid} ${k} ${r.status} ${buf.length} ${r.headers.get('content-type')} ${u}`)
  } catch (e) { log.push(`${q.qid} ${k} ERR ${e.message} ${u}`) }
}
fs.writeFileSync('scripts/chem-upload/dump/img/_log.txt', log.join('\n'))
console.log(log.join('\n'))
