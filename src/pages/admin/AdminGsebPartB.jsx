import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadQuestionImage } from '../../lib/storage'
import { chaptersOf, ruleLabel } from '../../lib/gseb'
import ImageButton from '../../components/shared/ImageButton'

// Part B (subjective) questions of one paper: the question as printed, its
// marks and chapter, and the teacher's model answer that students see after
// they have tried it themselves.
export default function AdminGsebPartB({ paper, questions, setQuestions }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const chapters = chaptersOf(paper.subject)

  async function update(q, fields) {
    const { error } = await supabase.from('gseb_subjective').update(fields).eq('id', q.id)
    if (error) { toast.error(error.message); return false }
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...fields } : x))
    return true
  }

  async function attachImage(q, field, file) {
    try {
      const url = await uploadQuestionImage(file)
      if (await update(q, { [field]: url })) toast.success('Image attached')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function save(q) {
    const marks = parseInt(form.marks, 10)
    if (!marks || marks < 1) { toast.error('Marks must be a number'); return }
    const ok = await update(q, {
      question: form.question,
      answer: form.answer || null,
      section: form.section.trim().toUpperCase(),
      marks,
    })
    if (ok) setEditingId(null)
  }

  if (questions.length === 0) {
    return (
      <div className="empty-state">
        No Part B questions yet. Fill the "Part B" sheet of the template (Section, Q No, Question, Marks,
        Chapter No, Model Answer, Choice rule) and upload it with the MCQs.
      </div>
    )
  }

  const rules = paper.part_b_rules || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {rules.length > 0 && (
        <div className="card card-body" style={{ fontSize: '0.875rem' }}>
          {rules.map(r => <div key={r.section}><strong>Section {r.section}:</strong> {ruleLabel(r)}</div>)}
        </div>
      )}
      {questions.map(q => {
        const editing = editingId === q.id
        return (
          <div key={q.id} className="card card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <strong>Q{q.q_no}</strong>
              {q.section && <span className="badge badge-locked">Section {q.section}</span>}
              <span className="badge badge-medium">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
              <select className="form-control" style={{ width: 'auto', maxWidth: '100%' }} value={q.chapter_no || ''}
                onChange={e => update(q, { chapter_no: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Chapter: not set</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.id}. {c.name}</option>)}
              </select>
              {!editing && (
                <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={() => { setEditingId(q.id); setForm({ question: q.question, answer: q.answer || '', section: q.section, marks: String(q.marks) }) }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Section</label>
                    <input className="form-control" style={{ width: 80 }} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Marks</label>
                    <input className="form-control" style={{ width: 80 }} inputMode="numeric" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Question</label>
                  <textarea className="form-control" rows={4} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Model answer (optional)</label>
                  <textarea className="form-control" rows={5} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => save(q)}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ whiteSpace: 'pre-wrap' }}>{q.question}</div>
                {q.question_image && <img src={q.question_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  <strong>Model answer:</strong> {q.answer || <span style={{ color: 'var(--gray-400)' }}>not written yet</span>}
                  {q.answer_image && <img src={q.answer_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <ImageButton label="Question image" onFile={f => attachImage(q, 'question_image', f)} />
              <ImageButton label="Answer image" onFile={f => attachImage(q, 'answer_image', f)} />
              {q.question_image && <button className="btn btn-ghost btn-sm" onClick={() => update(q, { question_image: null })}>Remove question image</button>}
              {q.answer_image && <button className="btn btn-ghost btn-sm" onClick={() => update(q, { answer_image: null })}>Remove answer image</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
