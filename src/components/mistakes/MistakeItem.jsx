import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import QuestionView from '../shared/QuestionView'
import MathText from '../shared/MathText'
import { orderOptionsForReview } from '../../lib/optionShuffle'
import { ERROR_TYPES, fmtDay } from '../../lib/mistakeCopy'
import { neetT } from '../../lib/neetI18n'

const MAX_NOTE = 1000

// Attempts from before the key-based fix stored the option's text, so match either.
function chosenTest(selected) {
  return opt => !!selected && (selected === opt.key || (opt.text !== '' && selected === opt.text))
}

function NoteField({ label, optional, value, editable, onSave }) {
  const [text, setText] = useState(value || '')
  if (!editable) {
    return value ? (
      <div className="mc-note-read">
        <div className="mc-field-label">{label}</div>
        <div className="mc-note-text"><MathText text={value} /></div>
      </div>
    ) : null
  }
  return (
    <label className="mc-field">
      <span className="mc-field-label">{label} <small>({optional})</small></span>
      <textarea className="form-control" rows={2} maxLength={MAX_NOTE} value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { if (text.trim() !== (value || '')) onSave(text.trim() || null) }} />
    </label>
  )
}

// One question of the copy: a single row (a long stem runs off the end of it),
// opening to the full question and its register entry. `editable` is the
// student's own copy, `teacher` the admin or faculty view, which reads the entry
// and marks it checked.
export default function MistakeItem({ item, medium, open, onToggle, editable, teacher, onSave, onCheck, onRetry }) {
  const t = neetT(medium)
  const { q, entry } = item
  const stem = String(q.question || '').replace(/\s+/g, ' ').trim()
  const options = orderOptionsForReview(q, item.lastMistake.optionOrder)
  const errorType = entry?.error_type

  return (
    <div className={`mc-item${open ? ' open' : ''}`}>
      <button className="mc-row" onClick={onToggle} aria-expanded={open}>
        <ChevronRight size={15} className="mc-chev" />
        <code className="mc-qid">{q.qid}</code>
        <span className="mc-stem">{stem ? <MathText text={stem} style={{ whiteSpace: 'nowrap' }} /> : <em>{t.mcImageQuestion}</em>}</span>
        {errorType && <span className="mc-chip mc-chip-type">{t.mcErrorTypes[errorType]}</span>}
        {entry?.needs_teacher && !entry?.checked_at && <span className="mc-chip mc-chip-ask" title={t.mcFilterAsk}>?</span>}
        {entry?.checked_at && <span className="mc-chip mc-chip-checked" title={t.mcChecked}>✔</span>}
        {item.status === 'pending' && item.correctDays === 1 && <span className="mc-chip mc-chip-progress" title={t.mcOneCorrect}>1/2</span>}
        {item.repeat && <span className="mc-chip mc-chip-repeat" title={t.mcRepeat}>⚠</span>}
        {item.status === 'cleared'
          ? <span className="mc-chip mc-chip-cleared">✅</span>
          : item.wrongCount > 0
            ? <span className="mc-chip mc-chip-wrong">{t.mcWrongTimes(item.wrongCount)}</span>
            : <span className="mc-chip mc-chip-skipped">{t.mcSkipped}</span>}
      </button>

      {open && (
        <div className="mc-detail">
          <div className="mc-detail-meta">
            <span>{fmtDay(item.lastMistake.at)}</span>
            {item.status === 'pending' && item.correctDays === 1 && <span className="mc-chip mc-chip-progress">{t.mcOneCorrect}</span>}
            {item.repeat && <span className="mc-chip mc-chip-repeat">{t.mcRepeat}</span>}
            {item.clearedOn && <span className="mc-chip mc-chip-cleared">{t.mcClearedOn(fmtDay(item.clearedOn))}</span>}
          </div>
          {item.keyChanged && <div className="mc-key-note">{t.mcKeyUpdated}</div>}

          {/* The student gets the question alone, so a re-attempt isn't answered
              from memory of the green option. The teacher still sees both answers. */}
          <QuestionView q={q} mode={editable ? 'student' : 'review'} size="compact" options={options} isChosen={chosenTest(item.lastMistake.selected)} />

          <div className="mc-register">
            <div className="mc-field-label">
              {t.mcErrorType}
              {editable && !errorType && <small className="mc-required"> ({t.mcRequired})</small>}
            </div>
            {editable ? (
              <select className="form-control mc-type-select" aria-label={t.mcErrorType} value={errorType || ''}
                onChange={e => onSave({ error_type: e.target.value })}>
                <option value="" disabled>{t.mcSelectType}</option>
                {ERROR_TYPES.map(type => <option key={type} value={type}>{t.mcErrorTypes[type]}</option>)}
              </select>
            ) : (
              <div className="mc-note-text">{errorType ? t.mcErrorTypes[errorType] : '—'}</div>
            )}

            {errorType === 'other' && (
              <NoteField key={`${q.id}-other`} label={t.mcOtherMention} optional={t.mcOptional} value={entry?.error_other} editable={editable}
                onSave={v => onSave({ error_other: v })} />
            )}
            <NoteField key={`${q.id}-reason`} label={t.mcReason} optional={t.mcOptional} value={entry?.reason} editable={editable} onSave={v => onSave({ reason: v })} />
            <NoteField key={`${q.id}-solution`} label={t.mcSolution} optional={t.mcOptional} value={entry?.solution} editable={editable} onSave={v => onSave({ solution: v })} />
            <NoteField key={`${q.id}-learning`} label={t.mcLearning} optional={t.mcOptional} value={entry?.learning} editable={editable} onSave={v => onSave({ learning: v })} />
            <NoteField key={`${q.id}-prevention`} label={t.mcPrevention} optional={t.mcOptional} value={entry?.prevention} editable={editable} onSave={v => onSave({ prevention: v })} />

            {editable && (
              <label className="mc-ask">
                <input type="checkbox" checked={!!entry?.needs_teacher} onChange={e => onSave({ needs_teacher: e.target.checked })} />
                {t.mcAskTeacher}
              </label>
            )}
            {!editable && entry?.needs_teacher && <div className="mc-chip mc-chip-ask" style={{ display: 'inline-flex' }}>{t.mcAskTeacher}</div>}

            {editable && item.status === 'pending' && (
              <div className="mc-card-retry">
                <button className="btn btn-primary btn-sm" disabled={!item.canRetry} onClick={onRetry}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RotateCcw size={13} /> {t.mcReattemptOne}
                </button>
                {!errorType && <span className="mc-retest-note">{t.mcPickTypeFirst}</span>}
                {errorType && item.doneToday && <span className="mc-retest-note">{t.mcTryAnotherDay}</span>}
              </div>
            )}

            {entry?.checked_at && <div className="mc-checked-line">{t.mcCheckedBy(entry.checked_by || '—', fmtDay(entry.checked_at))}</div>}
            {teacher && (
              <button className={`btn btn-sm ${entry?.checked_at ? 'btn-ghost' : 'btn-primary'}`} onClick={() => onCheck(!entry?.checked_at)}>
                {entry?.checked_at ? 'Remove check' : '✔ Mark checked'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
