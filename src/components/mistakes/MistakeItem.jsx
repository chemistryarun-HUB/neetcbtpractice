import { ChevronRight } from 'lucide-react'
import QuestionView from '../shared/QuestionView'
import MathText from '../shared/MathText'
import { orderOptionsForReview } from '../../lib/optionShuffle'
import { ERROR_TYPES, fmtDay } from '../../lib/mistakeCopy'
import { neetT } from '../../lib/neetI18n'

// Attempts from before the key-based fix stored the option's text, so match either.
function chosenTest(selected) {
  return opt => !!selected && (selected === opt.key || (opt.text !== '' && selected === opt.text))
}

// One question of the copy: a single row (a long stem runs off the end of it),
// opening to the full question and its Error Type. `editable` is the student's
// own copy, `teacher` the admin or faculty view, which reads it and marks it checked.
export default function MistakeItem({ item, medium, open, onToggle, editable, teacher, onSave, onCheck }) {
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
            <div className="mc-field-label">{t.mcErrorType}</div>
            {editable ? (
              <select className="form-control mc-type-select" aria-label={t.mcErrorType} value={errorType || ''}
                onChange={e => onSave({ error_type: e.target.value })}>
                <option value="" disabled>{t.mcSelectType}</option>
                {ERROR_TYPES.map(type => <option key={type} value={type}>{t.mcErrorTypes[type]}</option>)}
              </select>
            ) : (
              <div className="mc-note-text">{errorType ? t.mcErrorTypes[errorType] : '—'}</div>
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
