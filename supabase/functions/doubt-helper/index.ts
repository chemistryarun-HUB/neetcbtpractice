// Doubt Desk server function (Supabase Edge Function, Deno).
//
// The browser never sees the Claude API key: it lives in this function's
// secrets (ANTHROPIC_API_KEY). Every call carries the student's session token
// from student_session_start(); the function looks the student up with the
// service role, checks students.doubt_desk and a daily limit, then answers.
//
// Actions (POST JSON body):
//   ask       { token, message, doubt_id? , question_id?, chosen_key?, shown_order?,
//               attempt_id?, unit_id?, level?, chapter? }
//             → { doubt, messages }   (new doubt when doubt_id is absent)
//   list      { token, question_id? } → { doubts: [{...doubt, messages}] }
//   escalate  { token, doubt_id }     → { doubt }   ("Sir se poochho")
//   feedback  { token, doubt_id, helpful } → { doubt }
import Anthropic from 'npm:@anthropic-ai/sdk@1.2.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const MODEL = Deno.env.get('DOUBT_MODEL') || 'claude-haiku-5-5'
const DAILY_LIMIT = Number(Deno.env.get('DOUBT_DAILY_LIMIT') || 20)
const MAX_FOLLOW_UPS = 6

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

class Fail extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const student = await studentFor(body.token)
    switch (body.action) {
      case 'ask': return json(await ask(student, body))
      case 'list': return json(await list(student, body))
      case 'escalate': return json(await setDoubt(student, body.doubt_id, { status: 'waiting', escalated_at: new Date().toISOString() }))
      case 'feedback': return json(await setDoubt(student, body.doubt_id, { helpful: !!body.helpful }))
      default: throw new Fail(400, 'Unknown action')
    }
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Doubt Desk abhi kaam nahi kar raha. Thodi der baad try karo.' }, 500)
  }
})

async function studentFor(token: unknown) {
  if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) throw new Fail(401, 'Please log in again.')
  const { data: s } = await db.from('student_sessions').select('student_id, expires_at').eq('token', token).maybeSingle()
  if (!s || new Date(s.expires_at) < new Date()) throw new Fail(401, 'Please log in again.')
  const { data: student } = await db.from('students').select('id, name, doubt_desk').eq('id', s.student_id).maybeSingle()
  if (!student) throw new Fail(401, 'Please log in again.')
  if (!student.doubt_desk) throw new Fail(403, 'Doubt Desk is not switched on for your account yet.')
  return student
}

async function ownDoubt(studentId: string, doubtId: unknown) {
  if (typeof doubtId !== 'string') throw new Fail(400, 'Missing doubt')
  const { data } = await db.from('doubts').select('*').eq('id', doubtId).eq('student_id', studentId).maybeSingle()
  if (!data) throw new Fail(404, 'Doubt not found')
  return data
}

async function messagesOf(doubtId: string) {
  const { data } = await db.from('doubt_messages')
    .select('id, role, content, confident, author, created_at').eq('doubt_id', doubtId).order('created_at')
  return data || []
}

async function setDoubt(student: { id: string }, doubtId: unknown, patch: Record<string, unknown>) {
  await ownDoubt(student.id, doubtId)
  const { data, error } = await db.from('doubts').update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', doubtId as string).select('*').single()
  if (error) throw error
  return { doubt: data }
}

async function list(student: { id: string }, body: Record<string, unknown>) {
  let q = db.from('doubts').select('*').eq('student_id', student.id).order('created_at', { ascending: false }).limit(30)
  if (typeof body.question_id === 'string') q = q.eq('question_id', body.question_id)
  const { data } = await q
  const doubts = await Promise.all((data || []).map(async d => ({ ...d, messages: await messagesOf(d.id) })))
  return { doubts }
}

async function ask(student: { id: string; name: string }, body: Record<string, unknown>) {
  const message = String(body.message || '').trim().slice(0, 1500)
  if (!message) throw new Fail(400, 'Doubt likho pehle.')

  // Daily limit counts the student's own messages over the last 24 hours.
  const since = new Date(Date.now() - 864e5).toISOString()
  const { data: recent } = await db.from('doubts').select('id').eq('student_id', student.id).gte('updated_at', since)
  const ids = (recent || []).map(d => d.id)
  if (ids.length) {
    const { count } = await db.from('doubt_messages').select('id', { count: 'exact', head: true })
      .in('doubt_id', ids).eq('role', 'student').gte('created_at', since)
    if ((count || 0) >= DAILY_LIMIT) throw new Fail(429, `Aaj ke ${DAILY_LIMIT} doubts ho gaye. Kal phir poochho, ya "Sir se poochho" dabao.`)
  }

  let doubt
  if (body.doubt_id) {
    doubt = await ownDoubt(student.id, body.doubt_id)
  } else {
    const keys = ['option1', 'option2', 'option3', 'option4']
    const shown = Array.isArray(body.shown_order) && body.shown_order.every(k => keys.includes(k as string)) ? body.shown_order : keys
    const { data, error } = await db.from('doubts').insert({
      student_id: student.id,
      question_id: typeof body.question_id === 'string' ? body.question_id : null,
      attempt_id: typeof body.attempt_id === 'string' ? body.attempt_id : null,
      unit_id: Number.isInteger(body.unit_id) ? body.unit_id : null,
      level: Number.isInteger(body.level) ? body.level : null,
      chapter: typeof body.chapter === 'string' ? body.chapter.slice(0, 300) : null,
      chosen_key: keys.includes(body.chosen_key as string) ? body.chosen_key : null,
      shown_order: shown,
    }).select('*').single()
    if (error) throw error
    doubt = data
  }

  const history = await messagesOf(doubt.id)
  if (history.filter(m => m.role === 'student').length >= MAX_FOLLOW_UPS) {
    throw new Fail(429, 'Is question pe kaafi baat ho gayi. "Sir se poochho" dabao, Sir dekh lenge.')
  }

  await db.from('doubt_messages').insert({ doubt_id: doubt.id, role: 'student', content: message })

  const question = doubt.question_id
    ? (await db.from('questions').select('*').eq('id', doubt.question_id).maybeSingle()).data
    : null
  if (question && !doubt.qid) {
    await db.from('doubts').update({ qid: question.qid }).eq('id', doubt.id)
    doubt.qid = question.qid
  }

  const result = await callClaude(doubt, question, history, message)
  await db.from('doubt_messages').insert({
    doubt_id: doubt.id, role: 'helper', content: result.reply, confident: result.confident,
    input_tokens: result.inputTokens, output_tokens: result.outputTokens,
  })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (!result.confident && doubt.status === 'ai') { patch.status = 'waiting'; patch.escalated_at = new Date().toISOString() }
  const { data: updated } = await db.from('doubts').update(patch).eq('id', doubt.id).select('*').single()
  return { doubt: updated, messages: await messagesOf(doubt.id) }
}

// ── The Claude call ──

const SYSTEM = `You are the Doubt Desk of Arun Sir's NEET Chemistry classes (English medium). Students reach you from the review screen after a test, or with a free doubt.

How to answer:
- The answer key you are given is the app's official key. Explain why the correct option is correct and, when the student chose another option, exactly where their thinking went wrong.
- Stay at NCERT Class 11-12 and NEET level. Use NCERT facts, values and exceptions. Do not invent tricks, mnemonics or numbers, and never claim Sir said or taught something.
- If you think the answer key itself is wrong, say so politely, explain why, and set confident to false so Sir checks it.
- Set confident to false whenever you are not sure, the doubt depends on something said in class or on a figure you cannot see, or the student asks for Sir. Give whatever part you can answer, and say the doubt has gone to Sir.
- If the student writes in Hinglish, reply in simple Hinglish (Roman script) keeping chemistry terms in English. Otherwise reply in simple English.
- Keep it short: about 60 to 160 words, short paragraphs, bullet lines starting with "• " when listing. No headings, no markdown symbols like ** or #.
- Write chemical formulas and reactions in LaTeX with mhchem inside dollar signs, e.g. $\\ce{BF3}$, $\\ce{2H2 + O2 -> 2H2O}$, and maths as $\\Delta G = -nFE$.
- Only help with chemistry and studies. For anything else, reply politely in one line that you only handle chemistry doubts.
- If asked whether you are a person, say honestly that you are Sir's automatic Doubt Desk helper and that the "Sir se poochho" button sends the doubt to Sir.`

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'The message shown to the student.' },
    confident: { type: 'boolean', description: 'false = send this doubt to Sir for checking.' },
  },
  required: ['reply', 'confident'],
  additionalProperties: false,
}

type Q = Record<string, string | null>

function describeQuestion(doubt: Record<string, unknown>, q: Q | null) {
  if (!q) return { text: `Free doubt (no question attached). Chapter: ${doubt.chapter || 'not given'}.`, images: [] as string[] }
  const images: string[] = []
  const lines: string[] = [`Chapter: ${doubt.chapter || q.unit || ''}`, `Question ${q.qid || ''}: ${q.question || ''}`]
  if (q.question_image) images.push(q.question_image)

  const colA: string[] = [], colB: string[] = []
  for (let n = 1; n <= 10; n++) {
    if (q[`col_a${n}`]) colA.push(`A${n}. ${q[`col_a${n}`]}`)
    if (q[`col_b${n}`]) colB.push(`B${n}. ${q[`col_b${n}`]}`)
    if (q[`col_a${n}_image`]) images.push(q[`col_a${n}_image`] as string)
    if (q[`col_b${n}_image`]) images.push(q[`col_b${n}_image`] as string)
  }
  if (colA.length) lines.push('List-I:', ...colA, 'List-II:', ...colB)

  const order = (doubt.shown_order as string[] | null) || ['option1', 'option2', 'option3', 'option4']
  const correctKey = ['option1', 'option2', 'option3', 'option4'].find(k => q[k] && q[k] === q.correct_option)
    || (['option1', 'option2', 'option3', 'option4'].includes(q.correct_option || '') ? q.correct_option : null)
  lines.push('Options, in the order the student saw them:')
  order.forEach((k, i) => {
    const img = q[`${k}_image`]
    if (img) images.push(img)
    lines.push(`(${i + 1}) ${q[k] || (img ? '[option shown as an image]' : '')}`)
  })
  const label = (k: string | null) => (k && order.includes(k) ? `(${order.indexOf(k) + 1})` : 'not known')
  lines.push(`Correct answer (official key): ${label(correctKey as string | null)}`)
  lines.push(`Student's answer: ${doubt.chosen_key ? label(doubt.chosen_key as string) : 'not answered (skipped)'}`)
  return { text: lines.join('\n'), images }
}

async function callClaude(doubt: Record<string, unknown>, q: Q | null, history: { role: string; content: string }[], message: string) {
  const { text, images } = describeQuestion(doubt, q)
  const convo = history.map(m => `${m.role === 'student' ? 'Student' : m.role === 'faculty' ? 'Sir' : 'Doubt Desk'}: ${m.content}`).join('\n\n')
  const userText = `${text}\n\n${convo ? `Conversation so far:\n${convo}\n\n` : ''}Student's new message: ${message}`

  const run = (withImages: boolean) => anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{
      role: 'user',
      content: [
        ...(withImages ? images.slice(0, 8).map(url => ({ type: 'image' as const, source: { type: 'url' as const, url } })) : []),
        { type: 'text' as const, text: userText },
      ],
    }],
  })

  let res
  try {
    res = await run(images.length > 0)
  } catch (e) {
    // An image URL the API could not fetch fails the whole request; answer from the text alone.
    if (images.length && e instanceof Anthropic.BadRequestError) res = await run(false)
    else throw e
  }

  const usage = { inputTokens: res.usage?.input_tokens ?? null, outputTokens: res.usage?.output_tokens ?? null }
  if (res.stop_reason === 'refusal') {
    return { reply: 'Is doubt ka jawab main nahi de paaya. Ise Sir ko bhej diya hai.', confident: false, ...usage }
  }
  const textBlock = res.content.find(b => b.type === 'text')
  try {
    const parsed = JSON.parse(textBlock && textBlock.type === 'text' ? textBlock.text : '')
    return { reply: String(parsed.reply || '').trim(), confident: parsed.confident !== false, ...usage }
  } catch {
    return { reply: 'Jawab banane me dikkat aayi. Doubt Sir ko bhej diya hai.', confident: false, ...usage }
  }
}
