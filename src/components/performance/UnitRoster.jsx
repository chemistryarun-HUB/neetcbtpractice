import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import {
  attemptsInOrder, attemptClearedOwnBar, waLink, buildActivityMessage,
  computeStreak, aggregateAccuracy, mostRecent,
} from '../../lib/performanceMetrics'
import { UNIT_LEVELS } from '../../lib/constants'
import { LANGS } from '../../lib/reportI18n'
// Statically imported: storage.js is already in the main bundle via the question
// uploader, so dynamically importing it here would split nothing.
import { uploadStudentReport } from '../../lib/storage'

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// Sorting nulls: a student who has cleared nothing must not float into the
// middle of the ranking. -1 puts them last on "highest first" and first on
// "lowest first" — which is correct either way, since "nothing cleared" IS
// the bottom of the scale and is exactly who you're looking for when you sort
// ascending.
const NONE = -1

const PILL = {
  width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, textDecoration: 'none',
}

// One-tap WhatsApp to the student and each parent.
//
// Two send modes share these same three pills rather than becoming six
// buttons: 'nudge' fires the existing short chase message instantly, 'report'
// generates a PDF, uploads it and sends a link to it. Keeping the recipient
// choice in the pill you press is what keeps either mode a single click.
function WaPills({ student, allAttempts, classAttempts, unitId, activeIdsByLevel, mode, lang, cachedUrl, onCacheUrl }) {
  const [busy, setBusy] = useState(false)

  const nudge = () => buildActivityMessage({
    name: student.name,
    totalAttempts: allAttempts.length,
    streak: computeStreak(allAttempts),
    lastActiveIso: mostRecent(allAttempts)?.submitted_at,
    overallAccuracy: aggregateAccuracy(allAttempts),
  })

  // The recipients depend on what's being sent. A nudge ("get back to
  // practice") is aimed at the student as much as the parents, but the report
  // is written FOR a parent — it explains the marking scheme and asks them to
  // sit down with their child — so sending it to the student would be handing
  // them a letter about themselves.
  const targets = mode === 'report'
    ? [
        ['M', student.phone_mother, 'mother'],
        ['F', student.phone_father, 'father'],
      ]
    : [
        ['S', student.phone_student, 'student'],
        ['M', student.phone_mother, 'mother'],
        ['F', student.phone_father, 'father'],
      ]

  async function sendReport(phone) {
    if (busy) return
    // The tab MUST be opened synchronously inside the click handler — opening
    // it after the upload awaits puts it outside the user-gesture stack and
    // every browser's popup blocker kills it. So: open a blank tab now, point
    // it at WhatsApp once the URL exists.
    const win = window.open('', '_blank')
    setBusy(true)
    const toastId = toast.loading(`Preparing ${student.name}'s report…`)
    try {
      let url = cachedUrl
      let model
      // jsPDF is ~350KB — dynamically imported so it only loads for the admin
      // who actually sends a report, not in everyone's initial bundle.
      const [{ buildUnitReport }, { reportPdfBlob, reportFileName, reportMessage }] =
        await Promise.all([
          import('../../lib/studentReport'),
          import('../../lib/reportPdf'),
        ])
      model = buildUnitReport({ student, unitId, attempts: allAttempts, classAttempts, activeIdsByLevel })
      if (!url) {
        url = await uploadStudentReport(await reportPdfBlob(model, lang), student.id, reportFileName(model, lang))
        onCacheUrl(student.id, url)
      }
      const wa = waLink(phone, reportMessage(model, url, lang))
      toast.success('Report ready — opening WhatsApp', { id: toastId })
      if (win && !win.closed) win.location.href = wa
      else window.location.href = wa
    } catch (err) {
      if (win && !win.closed) win.close()
      toast.error(err.message || 'Could not prepare the report', { id: toastId })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
      {targets.map(([letter, phone, who]) => {
        if (!phone || !waLink(phone, 'x')) {
          return (
            <span key={letter} title={`No ${who} number saved`}
              style={{ ...PILL, background: 'var(--gray-100)', color: 'var(--gray-300)', border: '1px solid var(--gray-200)' }}>
              {letter}
            </span>
          )
        }
        const reportMode = mode === 'report'
        const title = reportMode
          ? `Send ${student.name}'s progress report PDF to ${who} — ${phone}`
          : `WhatsApp ${who} a quick nudge — ${phone}`

        if (reportMode) {
          return (
            <button key={letter} type="button" title={title} disabled={busy}
              onClick={e => { e.stopPropagation(); sendReport(phone) }}
              style={{
                ...PILL, cursor: busy ? 'wait' : 'pointer',
                background: busy ? 'var(--gray-100)' : '#dbeafe',
                color: busy ? 'var(--gray-400)' : '#1d4ed8',
                border: `1px solid ${busy ? 'var(--gray-200)' : '#93c5fd'}`,
              }}>
              {letter}
            </button>
          )
        }
        return (
          <a key={letter} href={waLink(phone, nudge())} target="_blank" rel="noreferrer"
            title={title} onClick={e => e.stopPropagation()}
            style={{ ...PILL, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
            {letter}
          </a>
        )
      })}
    </div>
  )
}

export default function UnitRoster({ students, attemptsByStudent, unitId, showClass, onSelectStudent }) {
  const [activeIdsByLevel, setActiveIdsByLevel] = useState(null) // { [level]: Set<questionId> }
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  // What the S/M/F pills send. Set once, then every send stays one click.
  const [waMode, setWaMode] = useState('nudge')
  // Report language. Parents read this, not the student — many are far more
  // comfortable in Hindi or Gujarati than in English.
  const [reportLang, setReportLang] = useState('en')
  // studentId -> uploaded report URL, so sending to a second parent reuses the
  // PDF already generated rather than uploading a duplicate.
  const [reportUrls, setReportUrls] = useState({})

  const classAttempts = useMemo(
    () => students.flatMap(s => attemptsByStudent[s.id] || []),
    [students, attemptsByStudent],
  )

  const levels = useMemo(() => UNIT_LEVELS[unitId] || [], [unitId])
  const lastLevelId = levels.length > 0 ? levels[levels.length - 1].id : null

  // Only the per-level question totals need fetching, and only for the
  // selected unit — a few hundred rows, cheap enough to refetch on every unit
  // change rather than preloading the whole bank.
  //
  // "Questions seen" deliberately does NOT come from used_questions. That
  // table is written by an upsert keyed on (student, question) after a
  // submit, and on real data it undercounts: one student with a single
  // 25-question attempt has only 17 rows there. Each attempt's own
  // question_ids array is the list actually served, is written when the
  // attempt is created, and is already loaded here — so it's both more
  // accurate and free.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const qRows = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('questions')
          .select('id, level').ilike('unit', `Unit ${unitId} -%`).eq('is_active', true)
          .range(from, from + 999)
        if (error) break
        qRows.push(...(data || []))
        if (!data || data.length < 1000) break
      }
      if (cancelled) return
      const byLvl = {}
      for (const r of qRows) (byLvl[r.level] ||= new Set()).add(r.id)
      setActiveIdsByLevel(byLvl)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unitId])

  // The CCT draws from every level of the unit combined rather than owning a
  // pool of its own, so its pool is the union of the others — matching how
  // StudentDashboard sizes it for students.
  const poolForLevel = useMemo(() => (lvl) => {
    if (!activeIdsByLevel) return null
    if (lvl === lastLevelId) {
      const all = new Set()
      for (const [l, ids] of Object.entries(activeIdsByLevel)) {
        if (Number(l) !== lastLevelId) for (const id of ids) all.add(id)
      }
      return all
    }
    return activeIdsByLevel[lvl] ?? new Set()
  }, [activeIdsByLevel, lastLevelId])

  const rows = useMemo(() => students.map(s => {
    const unitAttempts = (attemptsByStudent[s.id] || []).filter(a => a.unit_id === unitId)

    // Per level: did they clear it, and on which attempt (by submission order,
    // matching the "#N" StudentProfile shows rather than the stored column).
    const clearedAt = {}
    const byLevel = {}
    for (const a of unitAttempts) (byLevel[a.level] ||= []).push(a)
    for (const [lvl, arr] of Object.entries(byLevel)) {
      const ordered = attemptsInOrder(arr)
      const hit = ordered.find(({ attempt }) => attemptClearedOwnBar(attempt))
      if (hit) clearedAt[Number(lvl)] = hit.position
    }

    const clearedLevels = Object.keys(clearedAt).map(Number)
    // CCT is excluded from "highest cleared" on purpose: it's open from day
    // one, so a student can clear it without having cleared anything between.
    // Reporting it as their high-water mark would overstate real progression.
    const ladder = clearedLevels.filter(l => l !== lastLevelId)
    const highest = ladder.length > 0 ? Math.max(...ladder) : null
    const cctCleared = lastLevelId != null && clearedAt[lastLevelId] != null

    // Coverage of the level's CURRENT pool: distinct questions served to this
    // student there (union across their attempts, so a retry serving the same
    // question isn't double-counted), intersected with the questions still
    // active at that level.
    //
    // The intersection is what keeps this readable. Students get served
    // questions that are later deactivated, so a raw served-count runs past
    // the live total — real data here produced "50 / 45", which reads as a
    // bug. Counting only questions still in the pool makes the fraction mean
    // one thing: how much of what's on offer today have they actually seen.
    const focusLevel = highest
    const pool = focusLevel != null ? poolForLevel(focusLevel) : null
    const served = focusLevel != null
      ? new Set((byLevel[focusLevel] || []).flatMap(a => a.question_ids || []))
      : null
    const seen = pool && served ? [...served].filter(id => pool.has(id)).length : null
    const totalInLevel = pool ? pool.size : null

    // The CCT reports coverage rather than a cleared flag: it's open from day
    // one and draws from the whole unit, so "how much of the chapter have they
    // actually been tested on" is the useful signal, not a pass/fail badge.
    const cctPool = lastLevelId != null ? poolForLevel(lastLevelId) : null
    const cctServed = new Set((byLevel[lastLevelId] || []).flatMap(a => a.question_ids || []))
    const cctSeen = cctPool ? [...cctServed].filter(id => cctPool.has(id)).length : null
    const cctTotal = cctPool ? cctPool.size : null

    return {
      student: s,
      allAttempts: attemptsByStudent[s.id] || [],
      attempts: unitAttempts.length,
      clearedCount: ladder.length,
      ladderTotal: Math.max(0, levels.length - (lastLevelId != null ? 1 : 0)),
      highest,
      clearedOn: highest != null ? clearedAt[highest] : null,
      seen,
      totalInLevel,
      cctCleared,
      cctSeen,
      cctTotal,
    }
  }), [students, attemptsByStudent, unitId, levels, lastLevelId, poolForLevel])

  const sorted = useMemo(() => {
    const val = r => {
      switch (sort.key) {
        case 'name': return (r.student.name || '').toLowerCase()
        // Never-started students sort below everyone who has at least engaged,
        // rather than tying with those who started and cleared nothing.
        case 'cleared': return r.attempts === 0 ? NONE : r.clearedCount
        case 'attempt': return r.clearedOn ?? NONE
        case 'seen': return r.seen ?? NONE
        case 'attempts': return r.attempts
        case 'cct': return r.cctSeen ?? NONE
        default: return 0
      }
    }
    const out = [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      if (typeof x === 'string') return x.localeCompare(y)
      return x - y
    })
    return sort.dir === 'desc' ? out.reverse() : out
  }, [rows, sort])

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      // Names read naturally A→Z; every numeric column is far more useful
      // opening on "highest first", which is what you actually want to see.
      : { key, dir: key === 'name' ? 'asc' : 'desc' })
  }

  // "Highest cleared" is gone on purpose: levels unlock strictly in sequence,
  // so the count and the high-water mark are the same fact stated twice — the
  // space goes to the WhatsApp column instead.
  const COLS = [
    { key: 'name', label: 'Student', align: 'left' },
    ...(showClass ? [{ key: null, label: 'Class', align: 'left' }] : []),
    { key: 'cleared', label: 'Levels cleared', align: 'center' },
    { key: 'attempt', label: 'Cleared on', align: 'center' },
    { key: 'seen', label: 'Qs seen at that level', align: 'center' },
    { key: 'attempts', label: 'Attempts', align: 'center' },
    { key: 'cct', label: 'CCT Qs seen', align: 'center' },
    { key: null, label: 'WhatsApp', align: 'center' },
  ]

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading question counts…</div>
  }

  return (
    <div>
      {/* Send mode. Keeping this out of the row means the S/M/F pills stay a
          single click each — you set what you're sending once, then work down
          the class picking recipients. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>WhatsApp buttons send:</span>
        <div className="chips" style={{ marginBottom: 0 }}>
          {[['nudge', 'Quick nudge'], ['report', 'Progress report PDF']].map(([k, label]) => (
            <button key={k} className={`chip ${waMode === k ? 'active' : ''}`} onClick={() => setWaMode(k)}>{label}</button>
          ))}
        </div>
        {waMode === 'report' && (
          <>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>in</span>
            <div className="chips" style={{ marginBottom: 0 }}>
              {LANGS.map(l => (
                <button key={l.code} className={`chip ${reportLang === l.code ? 'active' : ''}`}
                  onClick={() => setReportLang(l.code)} title={`Send the report in ${l.label}`}>
                  {l.native}
                </button>
              ))}
            </div>
          </>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
          {waMode === 'report'
            ? 'Builds a PDF for this chapter, uploads it, and opens WhatsApp with a link — parents only.'
            : 'Opens WhatsApp with a short "get back to practice" message.'}
        </span>
      </div>

      <div className="table-wrap" style={{ maxHeight: 'max(320px, calc(100vh - 320px))' }}>
        <table>
          <thead>
            <tr>
              {COLS.map(c => {
                const active = sort.key === c.key
                return (
                  <th key={c.label} style={{ textAlign: c.align, whiteSpace: 'nowrap', cursor: c.key ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={c.key ? () => toggleSort(c.key) : undefined}
                    title={c.key ? 'Click to sort' : undefined}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: active ? 'var(--primary)' : undefined }}>
                      {c.label}
                      {c.key && (active
                        ? (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                        : <ChevronDown size={13} style={{ opacity: 0.22 }} />)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.student.id}>
                <td>
                  <button className="perf-lb-student" title={`${r.student.name} · Roll ${r.student.roll_number || '—'}`} onClick={() => onSelectStudent(r.student.id)}>
                    <span className="perf-s-avatar">{initials(r.student.name)}</span>
                    <span>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.student.name}</span>

                    </span>
                  </button>
                </td>
                {showClass && (
                  <td><span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>{r.student.class || '—'}</span></td>
                )}
                {/* A student who never opened the unit shows "—", not "0 / 5".
                    Rendering them as a zero made them indistinguishable from
                    someone who tried and failed, so counting the non-zero rows
                    disagreed with the "started this unit" tile above. Now the
                    rows carrying a number are exactly the students who started. */}
                <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8125rem', color: r.clearedCount > 0 ? '#15803d' : r.attempts > 0 ? '#b45309' : 'var(--gray-300)' }}>
                  {r.attempts === 0
                    ? '—'
                    : <>{r.clearedCount} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>/ {r.ladderTotal}</span></>}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: r.clearedOn != null ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                  {r.clearedOn != null ? `#${r.clearedOn}` : '—'}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {r.seen != null
                    ? <><strong>{r.seen}</strong> <span style={{ color: 'var(--gray-400)' }}>/ {r.totalInLevel}</span></>
                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: r.attempts > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                  {r.attempts || '—'}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {r.cctSeen > 0
                    ? <><strong style={{ color: r.cctCleared ? '#15803d' : 'var(--gray-700)' }}>{r.cctSeen}</strong> <span style={{ color: 'var(--gray-400)' }}>/ {r.cctTotal}</span></>
                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <WaPills
                    student={r.student}
                    allAttempts={r.allAttempts}
                    classAttempts={classAttempts}
                    unitId={unitId}
                    activeIdsByLevel={activeIdsByLevel}
                    mode={waMode}
                    lang={reportLang}
                    cachedUrl={reportUrls[`${r.student.id}|${unitId}|${reportLang}`]}
                    onCacheUrl={(id, url) => setReportUrls(prev => ({ ...prev, [`${id}|${unitId}|${reportLang}`]: url }))}
                  />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLS.length} className="empty-state">No students in this class</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted" style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem 0', lineHeight: 1.7 }}>
        Click any column heading to sort (click again to reverse).
        {' '}<strong>Levels cleared</strong> counts the sequential levels passed, excluding the CCT; a dash means the
        student hasn't opened this unit at all, so the rows showing a number match the "started this unit" count above.
        {' '}<strong>Cleared on</strong> is which attempt finally passed the threshold at their most recent cleared level,
        and <strong>Qs seen at that level</strong> is their coverage of that same level.
        {' '}<strong>CCT Qs seen</strong> is how much of the whole chapter they've been tested on in the Complete Chapter
        Test, which draws from every level combined. Coverage counts distinct questions actually served, against the
        questions still active — so it always reads against today's pool.
      </div>
    </div>
  )
}
