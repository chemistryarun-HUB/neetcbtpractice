import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileDown, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import MistakeItem from './MistakeItem'
import MistakeRetest from './MistakeRetest'
import {
  buildMistakeCopy, errorSummary, groupByChapter, groupByTest, loadMistakeData,
  saveMistakeEntry, setMistakesChecked, testDate, testMarks,
} from '../../lib/mistakeCopy'
import { levelBadgeT, levelName, neetT, unitName } from '../../lib/neetI18n'
import { practiceUnitName, fromCourseUnitId } from '../../lib/subjects'
import { QUESTIONS_PER_ATTEMPT } from '../../lib/constants'

const FILTERS = [
  ['all', 'mcFilterAll', () => true],
  ['wrong', 'mcFilterWrong', it => it.wrongCount > 0],
  ['skipped', 'mcFilterSkipped', it => it.wrongCount === 0],
  ['repeat', 'mcFilterRepeat', it => it.repeat],
  ['notype', 'mcFilterNoType', it => !it.entry?.error_type],
]

// About two pages a question, and every page is an image: a whole heavy copy
// would hang a phone, so past this the PDF is made one chapter or test at a time.
const MAX_PDF_QUESTIONS = 60

function unitLabel(unitId, medium, t) {
  const { unit } = fromCourseUnitId(unitId)
  return `${t.unit(unit)}: ${unitName({ name: practiceUnitName(unitId) }, unitId, medium)}`
}

// The whole Mistake Copy for one student. The student gets it to fill in and
// re-attempt; with `teacher` (the name to record) admin and faculty read it and
// mark entries checked instead.
export default function MistakeCopyView({ student, medium = 'en', teacher = null }) {
  const t = neetT(medium)
  const editable = !teacher
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('pending')
  const [view, setView] = useState('chapter')
  const [filter, setFilter] = useState('all')
  const [subject, setSubject] = useState('all')
  const [openItem, setOpenItem] = useState(null)
  const [openGroups, setOpenGroups] = useState({})
  const [retest, setRetest] = useState(null)
  const [pdfProgress, setPdfProgress] = useState(null)

  async function load() {
    try {
      setData(await loadMistakeData(student.id))
    } catch (err) {
      toast.error(err.message)
      setData({ attempts: [], questions: [], entries: [], retries: [], setupMissing: false })
    }
  }

  useEffect(() => {
    setData(null)
    setOpenItem(null)
    setOpenGroups({})
    load()
  }, [student.id])

  const items = useMemo(() => (data ? buildMistakeCopy(data) : []), [data])
  const subjects = useMemo(() => [...new Set(items.map(it => it.subject))], [items])
  const inSubject = subject === 'all' ? items : items.filter(it => it.subject === subject)
  const counts = {
    pending: inSubject.filter(it => it.status === 'pending').length,
    cleared: inSubject.filter(it => it.status === 'cleared').length,
  }
  const filterFn = FILTERS.find(f => f[0] === filter)[2]
  const visible = inSubject.filter(it => it.status === tab && filterFn(it))
  const summary = errorSummary(inSubject)
  const groups = view === 'chapter' ? groupByChapter(visible) : groupByTest(visible)

  function mergeEntries(rows) {
    setData(d => {
      const byQuestion = new Map(d.entries.map(e => [e.question_id, e]))
      for (const row of rows) byQuestion.set(row.question_id, row)
      return { ...d, entries: [...byQuestion.values()] }
    })
  }

  async function saveEntry(questionId, patch) {
    try {
      mergeEntries([await saveMistakeEntry(student.id, questionId, patch)])
    } catch {
      toast.error(t.mcSaveFailed)
    }
  }

  async function check(questionIds, on) {
    try {
      mergeEntries(await setMistakesChecked(student.id, questionIds, on ? teacher : null))
    } catch {
      toast.error(t.mcSaveFailed)
    }
  }

  async function downloadPdf(list) {
    if (list.length === 0) { toast.error(t.mcPdfNone); return }
    if (list.length > MAX_PDF_QUESTIONS) { toast.error(t.mcPdfTooMany(MAX_PDF_QUESTIONS)); return }
    setPdfProgress([0, 0])
    try {
      const { saveMistakeRegisterPdf } = await import('../../lib/mistakeRegisterPdf')
      await saveMistakeRegisterPdf({ student, items: list, medium, reveal: !!teacher, onProgress: (done, total) => setPdfProgress([done, total]) })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPdfProgress(null)
    }
  }

  function closeRetest() {
    setRetest(null)
    load()
  }

  if (!data) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>

  if (retest) return <MistakeRetest studentId={student.id} items={retest} medium={medium} onClose={closeRetest} />

  const pendingShown = inSubject.filter(it => it.status === 'pending')
  const ready = pendingShown.filter(it => it.canRetry)
  const needType = pendingShown.filter(it => !it.entry?.error_type).length
  const doneToday = pendingShown.filter(it => it.doneToday && it.entry?.error_type).length

  function renderItems(list) {
    return list.map(it => (
      <MistakeItem key={it.q.id} item={it} medium={medium} editable={editable} teacher={teacher}
        open={openItem === it.q.id}
        onToggle={() => setOpenItem(cur => (cur === it.q.id ? null : it.q.id))}
        onSave={patch => saveEntry(it.q.id, patch)}
        onCheck={on => check([it.q.id], on)}
        onRetry={() => setRetest([it])} />
    ))
  }

  return (
    <div className="mistake-copy" lang={medium}>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>📕 {t.mistakeCopy}{teacher ? ` · ${student.name}` : ''}</h2>
          <div className="text-muted">{teacher ? 'Wrong and skipped questions from level tests, with what the student wrote.' : t.mistakeIntro}</div>
        </div>
        {items.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => downloadPdf(visible)} disabled={!!pdfProgress}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileDown size={15} /> {pdfProgress ? t.mcPdfBusy(pdfProgress[0], pdfProgress[1]) : t.mcPdf}
          </button>
        )}
      </div>

      {data.setupMissing && (
        <div className="mc-key-note">Mistake Copy database is not set up yet: run migration_mistake_copy.sql in Supabase. Saving is off until then.</div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">{t.mcEmptyAll}</div>
      ) : (
        <>
          {subjects.length > 1 && (
            <div className="mc-pills" style={{ marginBottom: '0.75rem' }}>
              <button className={`mc-pill${subject === 'all' ? ' active' : ''}`} onClick={() => setSubject('all')}>{t.mcFilterAll}</button>
              {subjects.map(s => (
                <button key={s} className={`mc-pill${subject === s ? ' active' : ''}`} onClick={() => setSubject(s)}>{t.subject[s] || s}</button>
              ))}
            </div>
          )}

          <div className="mc-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'pending'} className={`mc-tab pending${tab === 'pending' ? ' active' : ''}`} onClick={() => { setTab('pending'); setOpenItem(null) }}>
              <strong>{counts.pending}</strong> {t.mcPending}
            </button>
            <button role="tab" aria-selected={tab === 'cleared'} className={`mc-tab cleared${tab === 'cleared' ? ' active' : ''}`} onClick={() => { setTab('cleared'); setOpenItem(null) }}>
              <strong>{counts.cleared}</strong> {t.mcCleared}
            </button>
          </div>

          {summary.length > 0 && (
            <div className="mc-summary">
              <strong>{teacher ? 'Error types' : t.mcSummary}:</strong> {summary.map(s => `${t.mcErrorTypes[s.type]} ${s.pct}%`).join(' · ')}
            </div>
          )}

          {editable && tab === 'pending' && (
            <div className="mc-retest-bar">
              <button className="btn btn-primary btn-sm" disabled={ready.length === 0} onClick={() => setRetest(ready)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <RotateCcw size={14} /> {t.mcReattempt(Math.min(ready.length, QUESTIONS_PER_ATTEMPT))}
              </button>
              {needType > 0 && <span className="mc-retest-note">{t.mcNeedType(needType)}</span>}
              {doneToday > 0 && <span className="mc-retest-note">{t.mcDoneToday(doneToday)}</span>}
              <div className="mc-rule">{t.mcRule}</div>
            </div>
          )}

          <div className="mc-toolbar">
            <div className="mc-pills">
              {FILTERS.map(([key, label]) => (
                <button key={key} className={`mc-pill${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>{t[label]}</button>
              ))}
            </div>
            <div className="mc-seg">
              <button className={view === 'chapter' ? 'active' : ''} onClick={() => setView('chapter')}>{t.mcByChapter}</button>
              <button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}>{t.mcByTest}</button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              {filter !== 'all' ? t.mcEmptyFilter : tab === 'pending' ? t.mcEmptyPending : t.mcEmptyCleared}
            </div>
          ) : groups.map((group, i) => {
            const isOpen = openGroups[group.key] ?? i === 0
            const unchecked = group.items.filter(it => !it.entry?.checked_at).map(it => it.q.id)
            const unitAll = items.filter(it => it.unitId === group.unitId)
            const retryable = group.items.filter(it => it.canRetry)
            return (
              <div key={group.key} className="mc-group card">
                <div className="mc-group-head">
                  <button className="mc-group-toggle" aria-expanded={isOpen} onClick={() => setOpenGroups(g => ({ ...g, [group.key]: !isOpen }))}>
                    <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
                    <span className="mc-group-title">
                      <strong>{unitLabel(group.unitId, medium, t)}</strong>
                      {view === 'chapter' ? (
                        <small>{t.subject[group.subject] || group.subject} · {t.mcChapterDone(unitAll.filter(it => it.status === 'cleared').length, unitAll.length)}</small>
                      ) : (
                        <small>
                          {levelBadgeT(group.unitId, group.test.attempt.level, medium)} · {t.mcAttempt(group.test.position)} · {testDate(group.test.attempt)} · {t.mcMarks(testMarks(group.test.attempt).score, testMarks(group.test.attempt).max)}
                        </small>
                      )}
                    </span>
                    <span className="mc-group-count">{group.items.length}</span>
                  </button>
                  <button className="btn btn-ghost btn-sm mc-group-action" title={t.mcPdf} aria-label={t.mcPdf} disabled={!!pdfProgress} onClick={() => downloadPdf(group.items)}>
                    <FileDown size={14} />
                  </button>
                  {teacher && unchecked.length > 0 && (
                    <button className="btn btn-ghost btn-sm mc-group-action" onClick={() => {
                      if (window.confirm(`Mark ${unchecked.length} question${unchecked.length === 1 ? '' : 's'} as checked?`)) check(unchecked, true)
                    }}>✔ All ({unchecked.length})</button>
                  )}
                </div>
                {isOpen && editable && tab === 'pending' && (
                  <div className="mc-group-retry">
                    <button className="btn btn-primary btn-sm" disabled={retryable.length === 0} onClick={() => setRetest(retryable)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RotateCcw size={13} /> {(view === 'chapter' ? t.mcReattemptChapter : t.mcReattemptTest)(Math.min(retryable.length, QUESTIONS_PER_ATTEMPT))}
                    </button>
                    {retryable.length === 0 && (
                      <span className="mc-retest-note">{group.items.some(it => !it.entry?.error_type) ? t.mcPickTypeFirst : t.mcTryAnotherDay}</span>
                    )}
                  </div>
                )}
                {isOpen && (view === 'chapter' ? group.levels.map(level => (
                  <div key={level.level}>
                    <div className="mc-level-head">{levelBadgeT(group.unitId, level.level, medium)}{levelName(group.unitId, level.level, medium) ? ` · ${levelName(group.unitId, level.level, medium)}` : ''}</div>
                    {renderItems(level.items)}
                  </div>
                )) : renderItems(group.items))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
