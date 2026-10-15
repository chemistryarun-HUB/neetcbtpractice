import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { uploadQuestionImage } from '../../lib/storage'
import { correctOptionKey, resolveCorrectOptionValue } from '../../lib/questionOptions'
import { chaptersOf } from '../../lib/gseb'
import { EditImageField } from './QuestionEditPanel'
import { MathPreview } from './MathText'

// Edit forms for GSEB board-paper questions, shown inside QuestionReviewer in
// place of the NEET QuestionEditPanel. Same look (yellow panel, option cards
// with the correct one in green, image upload under each field, Ctrl+S) but
// only the fields a board paper has: no unit/level/difficulty, and a chapter
// instead.

const LETTERS = ['A', 'B', 'C', 'D']
const label = { fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }

// Image uploads go to storage straight away; the URL is written with Save.
function useImages(initial) {
  const [urls, setUrls] = useState(initial)
  const [busy, setBusy] = useState(() => new Set())
  async function upload(field, file) {
    setBusy(prev => new Set(prev).add(field))
    try {
      const url = await uploadQuestionImage(file)
      setUrls(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(field); return s })
    }
  }
  const field = (name, text) => (
    <EditImageField label={text} url={urls[name]} uploading={busy.has(name)}
      onUpload={file => upload(name, file)} onRemove={() => setUrls(u => ({ ...u, [name]: null }))} />
  )
  return [urls, field]
}

function useCtrlS(save) {
  const ref = useRef(save)
  ref.current = save
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ref.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Shell({ title, saving, onSave, onCancel, children }) {
  return (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem 1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.875rem', color: '#92400e' }}>
        Editing: <code>{title}</code>
        <span style={{ fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.75rem', color: '#b45309' }}>
          — changes save to Supabase straight away
        </span>
      </div>
      {children}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <span style={{ alignSelf: 'center', fontSize: '0.7rem', color: 'var(--gray-400)' }}>Ctrl+S to save · Esc to cancel</span>
      </div>
    </div>
  )
}

function ChapterSelect({ subject, value, onChange }) {
  return (
    <select className="form-control" style={{ fontSize: '0.8125rem' }} value={value || ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Not set</option>
      {chaptersOf(subject).map(c => <option key={c.id} value={c.id}>{c.id}. {c.name}</option>)}
    </select>
  )
}

async function save(table, q, patch, setSaving, onSaved) {
  setSaving(true)
  const { error } = await supabase.from(table).update(patch).eq('id', q.id)
  setSaving(false)
  if (error) { toast.error(error.message); return }
  toast.success('Question updated')
  onSaved({ ...q, ...patch })
}

/** Part A: one MCQ of a board paper (gseb_questions). */
export function GsebMcqEditPanel({ q, subject, title, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    question: q.question || '',
    option1: q.option1 || '', option2: q.option2 || '', option3: q.option3 || '', option4: q.option4 || '',
    correct: correctOptionKey(q) || '',
    chapter_no: q.chapter_no || null,
    explanation: q.explanation || '',
  }))
  const [imgs, imageField] = useImages({
    question_image: q.question_image || null,
    option1_image: q.option1_image || null, option2_image: q.option2_image || null,
    option3_image: q.option3_image || null, option4_image: q.option4_image || null,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    const texts = [form.option1, form.option2, form.option3, form.option4]
    save('gseb_questions', q, {
      question: form.question,
      option1: form.option1, option2: form.option2, option3: form.option3, option4: form.option4,
      correct_option: form.correct ? resolveCorrectOptionValue(form.correct, texts) : '',
      chapter_no: form.chapter_no,
      explanation: form.explanation || null,
      ...imgs,
    }, setSaving, onSaved)
  }
  useCtrlS(handleSave)

  return (
    <Shell title={title} saving={saving} onSave={handleSave} onCancel={onCancel}>
      <div className="form-group" style={{ margin: '0 0 0.75rem' }}>
        <label style={label}>Question Text</label>
        <textarea className="form-control" rows={3} style={{ fontSize: '0.875rem', resize: 'vertical' }}
          value={form.question} onChange={e => set('question', e.target.value)} />
        <MathPreview text={form.question} />
        {imageField('question_image', 'Question Image')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[1, 2, 3, 4].map(i => {
          const key = `option${i}`
          const isCorrect = form.correct === key
          return (
            <div key={i} style={{ padding: '0.45rem 0.625rem', borderRadius: 'var(--radius)', background: isCorrect ? '#f0fdf4' : 'var(--gray-50)', border: `1.5px solid ${isCorrect ? '#86efac' : 'var(--gray-200)'}` }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: isCorrect ? '#15803d' : 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                <input type="radio" name={`gseb-correct-${q.id}`} checked={isCorrect} onChange={() => set('correct', key)} />
                Option {LETTERS[i - 1]}{isCorrect ? ' ✓ correct' : ''}
              </label>
              <textarea className="form-control" rows={2} style={{ fontSize: '0.8125rem', border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, resize: 'vertical' }}
                value={form[key]} onChange={e => set(key, e.target.value)} />
              <MathPreview text={form[key]} />
              {imageField(`${key}_image`, `Option ${LETTERS[i - 1]} Image`)}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 260px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Chapter</label>
          <ChapterSelect subject={subject} value={form.chapter_no} onChange={v => set('chapter_no', v)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '2 1 320px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Explanation (optional, shown on the result screen)</label>
          <textarea className="form-control" rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }}
            value={form.explanation} onChange={e => set('explanation', e.target.value)} />
        <MathPreview text={form.explanation} />
        </div>
      </div>
    </Shell>
  )
}

/** Part B: one subjective question of a board paper (gseb_subjective). */
export function GsebSubjectiveEditPanel({ q, subject, title, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    section: q.section || '', marks: q.marks || '', chapter_no: q.chapter_no || null,
    question: q.question || '', answer: q.answer || '',
  }))
  const [imgs, imageField] = useImages({ question_image: q.question_image || null, answer_image: q.answer_image || null })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    const marks = parseInt(form.marks, 10)
    if (!marks || marks < 1) { toast.error('Marks must be a number'); return }
    save('gseb_subjective', q, {
      section: form.section.trim().toUpperCase(), marks, chapter_no: form.chapter_no,
      question: form.question, answer: form.answer || null, ...imgs,
    }, setSaving, onSaved)
  }
  useCtrlS(handleSave)

  return (
    <Shell title={title} saving={saving} onSave={handleSave} onCancel={onCancel}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ margin: 0, flex: '0 0 90px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Section</label>
          <input className="form-control" style={{ fontSize: '0.8125rem' }} value={form.section} onChange={e => set('section', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 90px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Marks</label>
          <input className="form-control" type="number" min="1" style={{ fontSize: '0.8125rem' }} value={form.marks} onChange={e => set('marks', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 260px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Chapter</label>
          <ChapterSelect subject={subject} value={form.chapter_no} onChange={v => set('chapter_no', v)} />
        </div>
      </div>
      <div className="form-group" style={{ margin: '0 0 0.75rem' }}>
        <label style={label}>Question Text</label>
        <textarea className="form-control" rows={4} style={{ fontSize: '0.875rem', resize: 'vertical' }}
          value={form.question} onChange={e => set('question', e.target.value)} />
        <MathPreview text={form.question} />
        {imageField('question_image', 'Question Image')}
      </div>
      <div className="form-group" style={{ margin: '0 0 0.75rem', padding: '0.5rem 0.625rem', borderRadius: 'var(--radius)', background: '#f0fdf4', border: '1.5px solid #86efac' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>Model Answer (students open it after trying)</label>
        <textarea className="form-control" rows={6} style={{ fontSize: '0.875rem', resize: 'vertical' }}
          value={form.answer} onChange={e => set('answer', e.target.value)} />
        <MathPreview text={form.answer} />
        {imageField('answer_image', 'Answer Image')}
      </div>
    </Shell>
  )
}
