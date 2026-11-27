import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileDown, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import InfoTooltip from '../shared/InfoTooltip'
import MathText from '../shared/MathText'
import MistakePicker from './MistakePicker'
import MistakeRetest from './MistakeRetest'
import MistakeStudy, { itemKind } from './MistakeStudy'
import RetestResult, { sortByOutcome } from './RetestResult'
import SubjectTabs, { TAB_SUBJECTS } from '../shared/SubjectTabs'
import {
  BUCKETS, buildBookmarks, buildMistakeCopy, buildRetestHistory, errorSummary, groupByChapter, groupByTest, groupName, loadMistakeData,
  saveMistakeEntry, setMistakesChecked, testDate, testMarks, testName,
} from '../../lib/mistakeCopy'
import { levelBadgeT, levelName, neetT } from '../../lib/neetI18n'
import { orderOptionsForReview } from '../../lib/optionShuffle'

const FILTERS = [
  ['all', 'mcFilterAll', () => true],
  ['wrong', 'mcFilterWrong', it => it.wrongCount > 0],
  ['skipped', 'mcFilterSkipped', it => it.wrongCount === 0],
  ['repeat', 'mcFilterRepeat', it => it.repeat],
  ['paper', 'mcFilterPaper', it => it.fromPaper],
  ['gseb', 'mcFilterGseb', it => it.source === 'gseb'],
]

// Every page is an image: a whole heavy copy would hang a phone, so past this
// the PDF is made one chapter or test at a time.
const MAX_PDF_QUESTIONS = 60

const fmtDateTime = ts => new Date(ts).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})

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
      {item.repeat && item.status === 'pending' && <span className="mc-chip mc-chip-repeat" title={t.mcRepeat}>×{item.wrongCount}</span>}
      {item.entry?.checked_at && <span className="mc-chip mc-chip-cleared" title={t.mcChecked}>✔</span>}
      {item.entry?.bookmarked && <span className="mc-chip mc-chip-star" title={t.mcBookmarked}>★</span>}
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
  // 'questions' (one bucket or Cleared, picked in `tab`), 'results' or 'bookmarked'.
  const [pane, setPane] = useState('questions')
  // Which bucket (1-5) or 'cleared' the questions pane shows.
  const [tab, setTab] = useState(1)
  const [openRetest, setOpenRetest] = useState(null)
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
  // Starred questions, right ones included, so they are not part of `items`.
  const retests = useMemo(() => (data ? buildRetestHistory(data) : []), [data])
  const bookmarkItems = useMemo(() => (data ? buildBookmarks(data) : []), [data])
  const bookmarkById = useMemo(() => new Map(bookmarkItems.map(it => [it.q.id, it])), [bookmarkItems])
  const bookmarkedIds = useMemo(() => new Set((data?.entries || []).filter(e => e.bookmarked).map(e => e.question_id)), [data])
  const subjectCounts = { all: items.length, ...Object.fromEntries(TAB_SUBJECTS.map(s => [s, items.filter(it => it.subject === s).length])) }
  const inSubject = subject === 'all' ? items : items.filter(it => it.subject === subject)
  const bookmarks = subject === 'all' ? bookmarkItems : bookmarkItems.filter(it => it.subject === subject)
  const pending = inSubject.filter(it => it.status === 'pending')
  const cleared = inSubject.filter(it => it.status === 'cleared')
  const inBucket = Object.fromEntries(BUCKETS.map(b => [b, pending.filter(it => it.bucket === b)]))
  const isBucket = typeof tab === 'number'
  const inTab = pane === 'bookmarked' ? bookmarks : pane === 'results' ? [] : isBucket ? inBucket[tab] : cleared
  const retryTab = pane === 'questions' && isBucket
  const subjectRetests = subject === 'all' ? retests
    : retests.filter(r => r.rows.some(row => byId.get(row.q.id)?.subject === subject))
  const filterFn = FILTERS.find(f => f[0] === filter)[2]
  const visible = inTab.filter(filterFn)
  const groups = view === 'chapter' ? groupByChapter(visible) : groupByTest(visible)
  const ready = isBucket ? inBucket[tab].filter(it => it.canRetry) : []
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

  function startRetest(list, pool) {
    setPicker(null)
    setRetest(prev => ({ items: list, pool, run: (prev?.run || 0) + 1 }))
  }

  function closeRetest() {
    setRetest(null)
    load()
  }

  function pickTab(next) {
    setTab(next)
    setPane('questions')
    setFilter('all')
  }

  function pickPane(next) {
    setPane(next)
    setFilter('all')
  }

  // A row of the Results tab, shaped for RetestResult.
  const retestRows = session => sortByOutcome(session.rows.map(r => ({
    q: r.q, options: orderOptionsForReview(r.q, r.optionOrder), selected: r.selected, outcome: r.status,
    bucket: r.bucket, hasType: true,
  })))

  if (!data) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>

  if (retest) {
    return <MistakeRetest key={retest.run} studentId={student.id} items={retest.items} pool={retest.pool} medium={medium}
      onClose={closeRetest} onNext={startRetest} />
  }

  // Ids, not items, so a question stays in the walk-through after marking it
  // takes it out of the filter the walk-through was opened from.
  // A bookmark opened from the Bookmarked tab stays in the walk-through even after
  // its star is removed there, from the snapshot taken when it was opened.
  const studyItems = study
    ? study.ids.map(id => (study.fromBookmarks ? bookmarkById : byId).get(id) ?? study.snap.get(id)).filter(Boolean)
    : []
  const openStudy = (list, startId) => setStudy({
    ids: list.map(it => it.q.id), startId, fromBookmarks: pane === 'bookmarked', snap: new Map(list.map(it => [it.q.id, it])),
  })

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
          <p>{teacher ? 'Wrong and skipped questions from level tests and GSEB papers. Students re-attempt from their own login.' : t.mistakeIntro}</p>
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

      {items.length === 0 && bookmarkItems.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-mark">🎯</div>
          {t.mcEmptyAll}
        </div>
      ) : (
        <>
          <SubjectTabs value={subject} onChange={s => { setSubject(s); setFilter('all') }} counts={subjectCounts}
            labels={t.subject} allLabel={t.mcFilterAll} />

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
          </section>

          <div className="mc-bar">
            <div className="mc-tabs" role="tablist">
              <button role="tab" aria-selected={pane === 'questions'} className={pane === 'questions' ? 'active' : ''} onClick={() => pickPane('questions')}>
                {t.mcBuckets}
              </button>
              <button role="tab" aria-selected={pane === 'results'} className={pane === 'results' ? 'active' : ''} onClick={() => pickPane('results')}>
                {t.mcResults} <span>{subjectRetests.length}</span>
              </button>
              <button role="tab" aria-selected={pane === 'bookmarked'} className={pane === 'bookmarked' ? 'active' : ''} onClick={() => pickPane('bookmarked')}>
                ★ {t.mcBookmarked} <span>{bookmarks.length}</span>
              </button>
            </div>
            {pane !== 'results' && (
              <div className="mc-seg">
                <button className={view === 'chapter' ? 'active' : ''} onClick={() => setView('chapter')}>{t.mcByChapter}</button>
                <button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}>{t.mcByTest}</button>
              </div>
            )}
          </div>

          {pane === 'questions' && (
            <>
              <div className="mc-buckets" role="tablist" aria-label={t.mcBuckets}>
                {[...BUCKETS, 'cleared'].map(b => {
                  const n = b === 'cleared' ? cleared.length : inBucket[b].length
                  return (
                    <button key={b} role="tab" aria-selected={tab === b} onClick={() => pickTab(b)}
                      className={`mc-bucket mc-bucket-${b}${tab === b ? ' active' : ''}${n === 0 ? ' empty' : ''}`}>
                      <span className="mc-bucket-name">{b === 'cleared' ? `✅ ${t.mcCleared}` : t.mcBucketName(b)}</span>
                      <strong>{n}</strong>
                      <small>{b === 'cleared' ? t.mcClearedHint : t.mcBucketHint(b)}</small>
                    </button>
                  )
                })}
              </div>
              {editable && isBucket && (
                <div className="mc-bucket-action">
                  <button className="btn btn-primary mc-hero-btn" disabled={ready.length === 0} onClick={() => setPicker({ presetGroup: null })}>
                    <RotateCcw size={17} /> {t.mcReattemptBucket(t.mcBucketName(tab), ready.length)}
                  </button>
                </div>
              )}
            </>
          )}

          {pane === 'results' && (
            subjectRetests.length === 0 ? <div className="mc-empty">{t.mcNoResults}</div> : (
              <div className="mc-history">
                {subjectRetests.map(r => (
                  <button key={r.key} className="mc-history-row" onClick={() => setOpenRetest(r)}>
                    <span className="mc-history-num">#{r.number}</span>
                    <span className="mc-history-main">
                      <strong>{t.mcRetestNumber(r.number)}{r.bucket ? ` · ${t.mcBucketName(r.bucket)}` : ''}</strong>
                      <small>{fmtDateTime(r.at)} · {t.mcQuestionsCount(r.rows.length)}</small>
                    </span>
                    <span className="mc-history-score">
                      <b className="ok">✓ {r.correct}</b><b className="bad">✗ {r.wrong}</b><b className="skip">– {r.skipped}</b>
                    </span>
                    <ChevronRight size={16} className="mc-row-chev" />
                  </button>
                ))}
              </div>
            )
          )}

          {inTab.length > 0 && pane === 'questions' && (
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

          {pane === 'results' ? null : visible.length === 0 ? (
            <div className="mc-empty">
              {filter !== 'all' ? t.mcEmptyFilter : pane === 'bookmarked' ? t.mcEmptyBookmarks : tab === 'cleared' ? t.mcEmptyCleared : t.mcEmptyBucket(tab)}
            </div>
          ) : groups.map(group => {
            const isOpen = !!openGroups[group.key]
            const unchecked = group.items.filter(it => !it.entry?.checked_at).map(it => it.q.id)
            const retryable = group.items.filter(it => it.canRetry)
            const wrong = group.items.filter(it => it.wrongCount > 0).length
            const showSubject = view === 'chapter' && subject === 'all' && group.subject !== lastSubject
            lastSubject = group.subject
            const { attempt } = group.test || {}
            return (
              <div key={group.key}>
                {showSubject && <h3 className="mc-subject-head">{t.subject[group.subject] || group.subject}</h3>}
                <div className={`mc-unit${isOpen ? ' open' : ''}`}>
                  <button className="mc-unit-head" aria-expanded={isOpen} onClick={() => setOpenGroups(g => ({ ...g, [group.key]: !isOpen }))}>
                    <span className="unit-num">{group.groupNumber ?? '–'}</span>
                    <span className="mc-unit-title">
                      {view === 'test' && group.source === 'gseb'
                        ? <strong>GSEB · {testName(group, medium, t)}</strong>
                        : view === 'test' && attempt?.kind === 'paper'
                        ? <strong>{attempt.title}</strong>
                        : <strong>{groupName(group, medium)}</strong>}
                      {view === 'chapter' ? (
                        retryTab && <small>{[wrong > 0 && t.mcWrongCount(wrong), group.items.length - wrong > 0 && t.mcSkippedCount(group.items.length - wrong)].filter(Boolean).join(' · ')}</small>
                      ) : (
                        <small>
                          {attempt.kind === 'paper' ? `${t.mcPracticePaper} · ` : group.source !== 'gseb' && `${levelBadgeT(group.unitId, attempt.level, medium)} · `}{attempt.kind !== 'paper' && `${t.mcAttempt(group.test.position)} · `}{testDate(attempt)} · {t.mcMarks(testMarks(attempt).score, testMarks(attempt).max)}
                        </small>
                      )}
                    </span>
                    <span className="mc-unit-count">{group.items.length}</span>
                    <ChevronRight size={18} className="mc-unit-chev" />
                  </button>

                  {isOpen && (
                    <div className="mc-unit-body">
                      <div className="mc-unit-actions">
                        {editable && retryTab && retryable.length > 0 && (
                          <button className="btn btn-primary btn-sm mc-icon-btn"
                            onClick={() => setPicker(view === 'chapter' ? { presetGroup: group.key } : { presetGroup: null, items: retryable })}>
                            <RotateCcw size={14} /> {view === 'chapter' ? t.mcReattemptChapter : t.mcReattemptTest}
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm mc-icon-btn" disabled={!!pdfProgress} onClick={() => downloadPdf(group.items)}>
                          <FileDown size={14} /> PDF
                        </button>
                        {teacher && pane !== 'bookmarked' && unchecked.length > 0 && (
                          <button className="btn btn-ghost btn-sm mc-icon-btn" onClick={() => {
                            if (window.confirm(`Mark ${unchecked.length} question${unchecked.length === 1 ? '' : 's'} as checked?`)) check(unchecked, true)
                          }}>✔ Check all ({unchecked.length})</button>
                        )}
                      </div>
                      {view === 'chapter' ? group.levels.map(level => (
                        <div key={level.level}>
                          {level.level != null && (
                            <div className="mc-level-head">{levelBadgeT(group.unitId, level.level, medium)}{levelName(group.unitId, level.level, medium) ? ` · ${levelName(group.unitId, level.level, medium)}` : ''}</div>
                          )}
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
        <MistakePicker items={picker.items || ready} medium={medium} presetGroup={picker.presetGroup}
          rightToday={0}
          onStart={startRetest} onClose={() => setPicker(null)} />
      )}

      {openRetest && (
        <RetestResult rows={retestRows(openRetest)} medium={medium} studentId={student.id} editable={false}
          title={`${t.mcRetestNumber(openRetest.number)}${openRetest.bucket ? ` · ${t.mcBucketName(openRetest.bucket)}` : ''}`}
          subtitle={fmtDateTime(openRetest.at)} onClose={() => setOpenRetest(null)} />
      )}

      {study && studyItems.length > 0 && (
        <MistakeStudy items={studyItems} startId={study.startId} medium={medium} editable={editable} teacher={teacher}
          isBookmarked={id => bookmarkedIds.has(id)} onBookmark={id => saveEntry(id, { bookmarked: !bookmarkedIds.has(id) })}
          onSave={saveEntry} onCheck={(id, on) => check([id], on)} onClose={() => setStudy(null)} />
      )}
    </div>
  )
}
