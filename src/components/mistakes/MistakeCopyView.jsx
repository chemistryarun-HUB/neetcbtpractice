import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileDown, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import InfoTooltip from '../shared/InfoTooltip'
import MathText from '../shared/MathText'
import MistakePicker from './MistakePicker'
import MistakeRetest from './MistakeRetest'
import MistakeStudy, { itemKind } from './MistakeStudy'
import {
  buildMistakeCopy, errorSummary, groupByChapter, groupByTest, loadMistakeData,
  saveMistakeEntry, setMistakesChecked, testDate, testMarks,
} from '../../lib/mistakeCopy'
import { levelBadgeT, levelName, neetT, unitName } from '../../lib/neetI18n'
import { practiceUnitName, fromCourseUnitId } from '../../lib/subjects'

const FILTERS = [
  ['all', 'mcFilterAll', () => true],
  ['wrong', 'mcFilterWrong', it => it.wrongCount > 0],
  ['skipped', 'mcFilterSkipped', it => it.wrongCount === 0],
  ['repeat', 'mcFilterRepeat', it => it.repeat],
]

// Every page is an image: a whole heavy copy would hang a phone, so past this
// the PDF is made one chapter or test at a time.
const MAX_PDF_QUESTIONS = 60

// One line per question, however long its stem: opening it shows all of it.
function MistakeRow({ item, medium, teacher, t, onOpen }) {
  const stem = String(item.q.question || '').replace(/\s+/g, ' ').trim()
  const type = item.entry?.error_type
  return (
    <button className="mc-row" onClick={onOpen}>
      <span className={`mc-dot ${itemKind(item)}`} />
      {teacher && <code className="mc-qid">{item.q.qid}</code>}
      <span className="mc-stem" lang={medium}>{stem ? <MathText text={stem} style={{ whiteSpace: 'nowrap' }} /> : <em>{t.mcImageQuestion}</em>}</span>
      {type && <span className="mc-chip mc-chip-type">{t.mcErrorTypes[type]}</span>}
      {item.status === 'pending' && item.correctDays === 1 && <span className="mc-chip mc-chip-progress" title={t.mcOneCorrect}>1/2</span>}
      {item.repeat && item.status === 'pending' && <span className="mc-chip mc-chip-repeat" title={t.mcRepeat}>×{item.wrongCount}</span>}
      {item.entry?.checked_at && <span className="mc-chip mc-chip-cleared" title={t.mcChecked}>✔</span>}
      <ChevronRight size={15} className="mc-row-chev" />
    </button>
  )
}

// The whole Mistake Copy for one student. The student gets it to mark and
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
  const [openGroups, setOpenGroups] = useState({})
  const [picker, setPicker] = useState(null)
  const [retest, setRetest] = useState(null)
  const [study, setStudy] = useState(null)
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
    setOpenGroups({})
    load()
  }, [student.id])

  const items = useMemo(() => (data ? buildMistakeCopy(data) : []), [data])
  const byId = useMemo(() => new Map(items.map(it => [it.q.id, it])), [items])
  const subjects = useMemo(() => [...new Set(items.map(it => it.subject))], [items])
  const inSubject = subject === 'all' ? items : items.filter(it => it.subject === subject)
  const pending = inSubject.filter(it => it.status === 'pending')
  const cleared = inSubject.filter(it => it.status === 'cleared')
  const inTab = tab === 'pending' ? pending : cleared
  const filterFn = FILTERS.find(f => f[0] === filter)[2]
  const visible = inTab.filter(filterFn)
  const groups = view === 'chapter' ? groupByChapter(visible) : groupByTest(visible)
  const ready = pending.filter(it => it.canRetry)
  const total = inSubject.length
  const summary = errorSummary(inSubject)
  const typedCount = summary.reduce((sum, s) => sum + s.count, 0)

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
      const { saveMistakePdf } = await import('../../lib/mistakePdf')
      await saveMistakePdf({ student, items: list, medium, reveal: !!teacher, onProgress: (done, count) => setPdfProgress([done, count]) })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPdfProgress(null)
    }
  }

  function startRetest(list) {
    setPicker(null)
    setRetest(list)
  }

  function closeRetest() {
    setRetest(null)
    load()
  }

  function pickTab(next) {
    setTab(next)
    setFilter('all')
  }

  if (!data) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>

  if (retest) return <MistakeRetest studentId={student.id} items={retest} medium={medium} onClose={closeRetest} />

  // Ids, not items, so a question stays in the walk-through after marking it
  // takes it out of the filter the walk-through was opened from.
  const studyItems = study ? study.ids.map(id => byId.get(id)).filter(Boolean) : []
  const openStudy = (list, startId) => setStudy({ ids: list.map(it => it.q.id), startId })

  function renderRows(list, walk) {
    return list.map(it => (
      <MistakeRow key={it.q.id} item={it} medium={medium} teacher={teacher} t={t} onOpen={() => openStudy(walk, it.q.id)} />
    ))
  }

  let lastSubject = null

  return (
    <div className="mistake-copy" lang={medium}>
      <div className="mc-title">
        <div>
          <h2>{t.mistakeCopy}{teacher ? ` · ${student.name}` : ''}</h2>
          <p>{teacher ? 'Wrong and skipped questions from level tests. Students re-attempt from their own login.' : t.mistakeIntro}</p>
        </div>
        {visible.length > 0 && visible.length <= MAX_PDF_QUESTIONS && (
          <button className="btn btn-ghost btn-sm mc-icon-btn" onClick={() => downloadPdf(visible)} disabled={!!pdfProgress}>
            <FileDown size={15} /> {pdfProgress ? t.mcPdfBusy(pdfProgress[0], pdfProgress[1]) : 'PDF'}
          </button>
        )}
      </div>

      {data.setupMissing && (
        <div className="mc-key-note">Mistake Copy database is not set up yet: run migration_mistake_copy.sql in Supabase. Saving is off until then.</div>
      )}

      {items.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-mark">🎯</div>
          {t.mcEmptyAll}
        </div>
      ) : (
        <>
          {subjects.length > 1 && (
            <div className="mc-pills mc-subjects">
              <button className={`mc-pill${subject === 'all' ? ' active' : ''}`} onClick={() => setSubject('all')}>{t.mcFilterAll}</button>
              {subjects.map(s => (
                <button key={s} className={`mc-pill${subject === s ? ' active' : ''}`} onClick={() => setSubject(s)}>{t.subject[s] || s}</button>
              ))}
            </div>
          )}

          <section className="mc-hero">
            <div className="mc-hero-main">
              <div className="mc-hero-num"><strong>{pending.length}</strong> {t.mcToFix}</div>
              <div className="mc-hero-bar" role="img" aria-label={t.mcChapterDone(cleared.length, total)}>
                <i style={{ width: `${total ? (cleared.length / total) * 100 : 0}%` }} />
              </div>
              <div className="mc-hero-sub">
                {t.mcChapterDone(cleared.length, total)}
                <InfoTooltip text={t.mcRule} align="left" />
              </div>
              {typedCount >= 5 && (
                <div className="mc-hero-top">{t.mcMostCommon}: <strong>{t.mcErrorTypes[summary[0].type]}</strong> ({summary[0].pct}%)</div>
              )}
            </div>
            {editable && pending.length > 0 && (
              <div className="mc-hero-action">
                <button className="btn btn-primary mc-hero-btn" disabled={ready.length === 0} onClick={() => setPicker({ presetUnit: null })}>
                  <RotateCcw size={17} /> {t.mcReattemptBtn}
                </button>
                {ready.length === 0 && <small>{t.mcNoneReady}</small>}
              </div>
            )}
          </section>

          <div className="mc-bar">
            <div className="mc-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'active' : ''} onClick={() => pickTab('pending')}>
                {t.mcPending} <span>{pending.length}</span>
              </button>
              <button role="tab" aria-selected={tab === 'cleared'} className={tab === 'cleared' ? 'active' : ''} onClick={() => pickTab('cleared')}>
                {t.mcCleared} <span>{cleared.length}</span>
              </button>
            </div>
            <div className="mc-seg">
              <button className={view === 'chapter' ? 'active' : ''} onClick={() => setView('chapter')}>{t.mcByChapter}</button>
              <button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}>{t.mcByTest}</button>
            </div>
          </div>

          {inTab.length > 0 && (
            <div className="mc-pills mc-filters">
              {FILTERS.map(([key, label, fn]) => {
                const count = inTab.filter(fn).length
                if (key !== 'all' && count === 0 && filter !== key) return null
                return (
                  <button key={key} className={`mc-pill${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
                    {key === 'wrong' && <i className="mc-dot wrong" />}
                    {key === 'skipped' && <i className="mc-dot skipped" />}
                    {t[label]} <span>{count}</span>
                  </button>
                )
              })}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="mc-empty">
              {filter !== 'all' ? t.mcEmptyFilter : tab === 'pending' ? t.mcEmptyPending : t.mcEmptyCleared}
            </div>
          ) : groups.map(group => {
            const isOpen = !!openGroups[group.key]
            const unchecked = group.items.filter(it => !it.entry?.checked_at).map(it => it.q.id)
            const retryable = group.items.filter(it => it.canRetry)
            const wrong = group.items.filter(it => it.wrongCount > 0).length
            const showSubject = view === 'chapter' && subjects.length > 1 && subject === 'all' && group.subject !== lastSubject
            lastSubject = group.subject
            const { unit } = fromCourseUnitId(group.unitId)
            return (
              <div key={group.key}>
                {showSubject && <h3 className="mc-subject-head">{t.subject[group.subject] || group.subject}</h3>}
                <div className={`mc-unit${isOpen ? ' open' : ''}`}>
                  <button className="mc-unit-head" aria-expanded={isOpen} onClick={() => setOpenGroups(g => ({ ...g, [group.key]: !isOpen }))}>
                    <span className="unit-num">{unit}</span>
                    <span className="mc-unit-title">
                      <strong>{unitName({ name: practiceUnitName(group.unitId) }, group.unitId, medium)}</strong>
                      {view === 'chapter' ? (
                        tab === 'pending' && <small>{[wrong > 0 && t.mcWrongCount(wrong), group.items.length - wrong > 0 && t.mcSkippedCount(group.items.length - wrong)].filter(Boolean).join(' · ')}</small>
                      ) : (
                        <small>
                          {levelBadgeT(group.unitId, group.test.attempt.level, medium)} · {t.mcAttempt(group.test.position)} · {testDate(group.test.attempt)} · {t.mcMarks(testMarks(group.test.attempt).score, testMarks(group.test.attempt).max)}
                        </small>
                      )}
                    </span>
                    <span className="mc-unit-count">{group.items.length}</span>
                    <ChevronRight size={18} className="mc-unit-chev" />
                  </button>

                  {isOpen && (
                    <div className="mc-unit-body">
                      <div className="mc-unit-actions">
                        {editable && tab === 'pending' && retryable.length > 0 && (
                          <button className="btn btn-primary btn-sm mc-icon-btn"
                            onClick={() => (view === 'chapter' ? setPicker({ presetUnit: group.unitId }) : startRetest(retryable))}>
                            <RotateCcw size={14} /> {view === 'chapter' ? t.mcReattemptChapter : t.mcReattemptTest}
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm mc-icon-btn" disabled={!!pdfProgress} onClick={() => downloadPdf(group.items)}>
                          <FileDown size={14} /> PDF
                        </button>
                        {teacher && unchecked.length > 0 && (
                          <button className="btn btn-ghost btn-sm mc-icon-btn" onClick={() => {
                            if (window.confirm(`Mark ${unchecked.length} question${unchecked.length === 1 ? '' : 's'} as checked?`)) check(unchecked, true)
                          }}>✔ Check all ({unchecked.length})</button>
                        )}
                      </div>
                      {view === 'chapter' ? group.levels.map(level => (
                        <div key={level.level}>
                          <div className="mc-level-head">{levelBadgeT(group.unitId, level.level, medium)}{levelName(group.unitId, level.level, medium) ? ` · ${levelName(group.unitId, level.level, medium)}` : ''}</div>
                          {renderRows(level.items, group.levels.flatMap(l => l.items))}
                        </div>
                      )) : renderRows(group.items, group.items)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {picker && (
        <MistakePicker items={ready} medium={medium} presetUnit={picker.presetUnit} rightToday={pending.length - ready.length}
          onStart={startRetest} onClose={() => setPicker(null)} />
      )}

      {study && studyItems.length > 0 && (
        <MistakeStudy items={studyItems} startId={study.startId} medium={medium} editable={editable} teacher={teacher}
          onSave={saveEntry} onCheck={(id, on) => check([id], on)} onClose={() => setStudy(null)} />
      )}
    </div>
  )
}
