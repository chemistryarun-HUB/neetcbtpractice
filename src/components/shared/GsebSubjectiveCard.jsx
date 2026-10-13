import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// One Part B question for a student: write the answer in the notebook first,
// then open the model answer to check it.
export default function GsebSubjectiveCard({ q, label, tag }) {
  const [open, setOpen] = useState(false)
  const hasAnswer = q.answer || q.answer_image
  return (
    <div className="card card-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        <strong>{label}</strong>
        <span className="badge badge-medium">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
        {tag && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>{tag}</span>}
      </div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{q.question}</div>
      {q.question_image && <img src={q.question_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
      <div style={{ marginTop: '0.75rem' }}>
        {hasAnswer ? (
          <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setOpen(o => !o)}>
            {open ? <EyeOff size={14} /> : <Eye size={14} />} {open ? 'Hide model answer' : 'Show model answer'}
          </button>
        ) : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>Model answer not added yet</span>
        )}
      </div>
      {open && hasAnswer && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
          {q.answer}
          {q.answer_image && <img src={q.answer_image} alt="" style={{ display: 'block', maxWidth: '100%', marginTop: '0.5rem' }} />}
        </div>
      )}
    </div>
  )
}
