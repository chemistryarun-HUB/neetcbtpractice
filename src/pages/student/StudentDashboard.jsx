import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { NEET_SUBJECTS, UNIT_LEVELS, isChapterTestLevel } from '../../lib/constants'
import { neetT, sectionName, unitName, unitTitle, levelName as levelNameT, levelBadgeT } from '../../lib/neetI18n'
import { Lock, ChevronRight, LogOut, ArrowLeft, BarChart3, FileText, PlayCircle, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import InfoTooltip from '../../components/shared/InfoTooltip'
import LevelVideosModal from '../../components/shared/LevelVideosModal'
import LevelRulesTour, { hasTourBeenSeen } from '../../components/student/LevelRulesTour'
import { groupVideosByUnitLevel } from '../../lib/youtube'

export default function StudentDashboard() {
  const { user, logout, updateStudentUser } = useAuth()
  const navigate = useNavigate()
  // The medium the student studies in decides which question bank they see
  // and the language of these screens. Read fresh on every load (below): a
  // session saved before the admin changed it still carries the old one.
  const [medium, setMedium] = useState(user.medium || 'en')
  const t = neetT(medium)
  // Which subject's syllabus is showing; kept for the tab so coming back
  // from a test lands on the same subject.
  const [subject, setSubject] = useState(() => {
    try { return sessionStorage.getItem('neet_subject') || null } catch { return null }
  })
  function pickSubject(id) {
    setSubject(id)
    try { sessionStorage.setItem('neet_subject', id) } catch { /* private mode */ }
  }

  const [progress, setProgress] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  // Auto-opens once per student (see LevelRulesTour's own localStorage
  // check); the "How levels work" link reopens it any time after that.
  const [tourOpen, setTourOpen] = useState(false)

  // unitId → array of { level, topic, count } sorted by level
  const [unitLevels, setUnitLevels] = useState({})
  // Set of unit ids that have at least one question
  const [activeUnitIds, setActiveUnitIds] = useState(new Set())

  // Currently selected unit (for drill-down view)
  const [selectedUnit, setSelectedUnit] = useState(null)

  // unitId → level → videos[]  (lecture videos, see AdminVideos)
  const [videosByUnit, setVideosByUnit] = useState({})
  // { levelId, levelName, videos, canStartTest } while the lecture player is open
  const [videoModal, setVideoModal] = useState(null)

  useEffect(() => {
    async function load() {
      // 1. Student progress + attempts + lecture videos (+ current medium)
      const [{ data: p }, { data: a }, { data: vids }, { data: me }] = await Promise.all([
        supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
        supabase.from('test_attempts').select('*').eq('student_id', user.id).eq('submitted', true),
        supabase.from('level_videos').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('students').select('medium').eq('id', user.id).maybeSingle(),
      ])
      const med = me?.medium || 'en'
      setMedium(med)
      if (med !== (user.medium || 'en')) updateStudentUser({ medium: med })
      setVideosByUnit(groupVideosByUnitLevel(vids))
      if (!p) {
        await supabase.from('student_progress').insert({ student_id: user.id })
        setProgress({ unlocked_levels_by_unit: {}, total_questions_attempted: 0 })
      } else {
        setProgress(p)
      }
      setAttempts(a || [])

      // 2. All live questions: unit, level, topic — to know which units/levels exist.
      // Gated on is_published as well as is_active so a level whose questions are
      // uploaded but not yet reviewed doesn't appear on the syllabus at all —
      // otherwise the student opens it and sits a test on unchecked questions.
      // Paginated — Supabase caps a single request at 1000 rows, and the question
      // bank has already grown past that, which was silently truncating counts.
      const qRows = []
      let qErr = null
      for (let from = 0; ; from += 1000) {
        const { data: page, error } = await supabase
          .from('questions')
          .select('unit, level, topic')
          .eq('medium', med)
          .eq('is_active', true)
          .eq('is_published', true)
          .range(from, from + 999)
        if (error) { qErr = error; break }
        qRows.push(...(page || []))
        if (!page || page.length < 1000) break
      }

      if (!qErr) {
        // Build map: unitId → Map<level, count>
        // The `unit` column is stored as "Unit 11 - d- and f-Block Elements"
        // Extract the unit number from the prefix "Unit N -"
        const byUnitId = {}
        for (const row of qRows) {
          const match = (row.unit || '').match(/^Unit\s+(\d+)\s*-/i)
          if (!match) continue
          const uid = Number(match[1])
          if (!byUnitId[uid]) byUnitId[uid] = {}
          const lv = row.level ?? 1
          if (!byUnitId[uid][lv]) byUnitId[uid][lv] = { topic: row.topic || `Level ${lv}`, count: 0 }
          byUnitId[uid][lv].count++
        }

        const idToLevels = {}
        const activeIds = new Set()

        for (const [uid, levels] of Object.entries(byUnitId)) {
          const unitId = Number(uid)
          if (Object.keys(levels).length > 0) {
            activeIds.add(unitId)
            idToLevels[unitId] = Object.entries(levels)
              .map(([lv, { topic, count }]) => ({ level: Number(lv), topic, count }))
              .sort((a, b) => a.level - b.level)
          }
        }

        setActiveUnitIds(activeIds)
        setUnitLevels(idToLevels)
      }

      setLoading(false)
    }
    load()
  }, [user.id])

  // First-visit auto-open, once the dashboard actually has something to show
  // behind it — separate from the load effect above so it re-checks after
  // `loading` flips, rather than firing against stale state on mount.
  useEffect(() => {
    if (!loading && !hasTourBeenSeen(user.id)) setTourOpen(true)
  }, [loading, user.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function startTest(unitId, levelId) {
    const levelDefs = UNIT_LEVELS[unitId] || []
    const lastLevelId = levelDefs.length > 0 ? levelDefs[levelDefs.length - 1].id : null
    const alwaysUnlocked = levelId === 1 || levelId === lastLevelId
    const unlockedLevels = progress?.unlocked_levels_by_unit?.[unitId] || [1]
    if (!alwaysUnlocked && !unlockedLevels.includes(levelId)) {
      toast.error(t.lockedToast)
      return
    }
    navigate(`/student/test/${unitId}/${levelId}`)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  // ── Level drill-down view ──
  if (selectedUnit) {
    // Scoped to this unit — attempts and unlocks don't carry over between units.
    const unlockedLevels = progress?.unlocked_levels_by_unit?.[selectedUnit.id] || [1]
    const attemptsByLevel = {}
    for (const a of attempts) {
      if (a.unit_id !== selectedUnit.id) continue
      if (!attemptsByLevel[a.level]) attemptsByLevel[a.level] = []
      attemptsByLevel[a.level].push(a)
    }
    const levelDefs = UNIT_LEVELS[selectedUnit.id] || []
    const dbLevels = unitLevels[selectedUnit.id] || []   // question counts from DB
    const countByLevel = Object.fromEntries(dbLevels.map(l => [l.level, l.count]))
    const lastLevelId = levelDefs.length > 0 ? levelDefs[levelDefs.length - 1].id : null
    // A single-level unit (the mechanism modules, units 24-33) has no chapter
    // test — its one level IS the module. Going through isChapterTestLevel
    // rather than comparing to lastLevelId matters here: level 1 is also the
    // last level, so the old check treated it as a CCT and this sum, which
    // deliberately excludes the CCT level, came out as 0 — the student saw
    // "Total questions: —" on a module that had questions in it.
    const cctTotal = dbLevels
      .filter(l => !isChapterTestLevel(selectedUnit.id, l.level))
      .reduce((s, l) => s + l.count, 0)

    return (
      <div className="dashboard" lang={medium}>
        <header className="topbar">
          <div className="topbar-brand" style={{ cursor: 'pointer' }} onClick={() => setSelectedUnit(null)}>NEETCBT</div>
          <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
              {user.name} ({user.roll_number})
            </span>
            <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <LogOut size={16} /> {t.logout}
            </button>
          </div>
        </header>
        <div className="page-content">
          <button className="back-btn" onClick={() => setSelectedUnit(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
            <ArrowLeft size={15} /> {t.backToSyllabus}
          </button>
          <h3 style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--gray-700)' }}>
            {unitTitle(selectedUnit, medium)}
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* With one level there is nothing to unlock in sequence, and the
                multi-level wording renders as "Level 1 and Level 1". */}
            <span>
              {levelDefs.length === 1
                ? t.oneLevel
                : t.levelsSummary(levelDefs.length, levelBadgeT(selectedUnit.id, lastLevelId, medium))}
            </span>
            <button onClick={() => setTourOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', padding: 0 }}>
              <HelpCircle size={14} /> {t.howLevelsWork}
            </button>
          </p>
          <div className="levels-grid">
            {levelDefs.map(({ id: levelId, topic: levelTopic }) => {
              const levelName = levelNameT(selectedUnit.id, levelId, medium)
              // Level 1 and last level are always unlocked
              const alwaysUnlocked = levelId === 1 || levelId === lastLevelId
              const isUnlocked = alwaysUnlocked || unlockedLevels.includes(levelId)
              const lvlAttempts = attemptsByLevel[levelId] || []
              const totalQAttempted = lvlAttempts.reduce((s, a) => s + (a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0), 0)
              const qCount = isChapterTestLevel(selectedUnit.id, levelId) ? cctTotal : (countByLevel[levelId] ?? 0)
              const levelVideos = videosByUnit[selectedUnit.id]?.[levelId] || []
              return (
                <div
                  key={levelId}
                  className={`level-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => isUnlocked && startTest(selectedUnit.id, levelId)}
                >
                  <div className="level-num">
                    {levelBadgeT(selectedUnit.id, levelId, medium)}
                    <InfoTooltip text={levelTopic || levelName} />
                  </div>
                  <h4>{levelName}</h4>
                  <div className="level-stats">
                    <div>{t.totalQuestions}: {qCount > 0 ? qCount : '—'}</div>
                    {lvlAttempts.length > 0 && (
                      <>
                        <div style={{ marginTop: '0.25rem' }}>{t.attempts}: <strong>{lvlAttempts.length}</strong></div>
                        <div>{t.questionsDone}: <strong>{totalQAttempted}</strong></div>
                      </>
                    )}
                  </div>
                  {!isUnlocked && <div className="lock-icon"><Lock size={18} /></div>}
                  {(levelVideos.length > 0 || isUnlocked) && (
                    <div className="level-card-actions">
                      {/* Lectures stay watchable even on a locked level — they're the
                          learning material, and gating them behind a score students
                          can't yet earn is backwards. The test itself stays locked. */}
                      {levelVideos.length > 0 && (
                        <button
                          className="level-video-btn"
                          onClick={e => {
                            e.stopPropagation()
                            setVideoModal({ levelId, levelName, videos: levelVideos, canStartTest: isUnlocked })
                          }}
                        >
                          <PlayCircle size={13} />
                          {t.lectures(levelVideos.length)}
                        </button>
                      )}
                      {isUnlocked && (
                        lvlAttempts.length === 0
                          ? <span className="badge badge-green">{t.start}</span>
                          : <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{t.continue}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {videoModal && (
          <LevelVideosModal
            unitId={selectedUnit.id}
            levelId={videoModal.levelId}
            levelName={videoModal.levelName}
            videos={videoModal.videos}
            onClose={() => setVideoModal(null)}
            onStartTest={videoModal.canStartTest
              ? () => { setVideoModal(null); startTest(selectedUnit.id, videoModal.levelId) }
              : null}
          />
        )}

        {tourOpen && <LevelRulesTour studentId={user.id} studentName={user.name} onClose={() => setTourOpen(false)} />}
      </div>
    )
  }

  // ── Syllabus view ──
  // Only subjects with at least one open unit in this medium get a tab: an
  // English student sees Chemistry as before until Physics questions go live.
  const openSubjects = NEET_SUBJECTS.filter(sub => sub.syllabus.some(sec => sec.units.some(u => activeUnitIds.has(u.id))))
  const shown = openSubjects.find(sub => sub.id === subject) || openSubjects[0] || NEET_SUBJECTS[0]
  const shownActive = shown.syllabus.reduce((n, sec) => n + sec.units.filter(u => activeUnitIds.has(u.id)).length, 0)
  return (
    <div className="dashboard" lang={medium}>
      <header className="topbar">
        <div className="topbar-brand">NEETCBT</div>
        <div className="topbar-nav" style={{ alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            {user.name} ({user.roll_number})
          </span>
          <button onClick={handleLogout} title="Logout" style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="page-header">
          <h2>{t.syllabus(t.subject[shown.id] || shown.id)}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="text-muted">
              {t.unitsActive(shownActive)}
            </div>
            <Link to="/student/performance" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 size={15} /> {t.myPerformance}
            </Link>
            <Link to="/student/practice-papers" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={15} /> {t.practicePapers}
            </Link>
            <Link to="/student/gseb" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={15} /> {t.gsebPapers}
            </Link>
            <button className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setTourOpen(true)}>
              <HelpCircle size={15} /> {t.howLevelsWork}
            </button>
          </div>
        </div>

        {openSubjects.length > 1 && (
          <div className="subject-tabs" role="group">
            {openSubjects.map(sub => (
              <button key={sub.id} className="subject-tab" aria-pressed={sub.id === shown.id} onClick={() => pickSubject(sub.id)}>
                {t.subject[sub.id] || sub.id}
              </button>
            ))}
          </div>
        )}
        {openSubjects.length === 0 && <p className="text-muted" style={{ marginBottom: '1rem' }}>{t.noUnits}</p>}

        {shown.syllabus.map(section => (
          <div className="syllabus-section" key={section.section}>
            <h3>{sectionName(section.section, medium)}</h3>
            <div className="unit-grid">
              {section.units.map(unit => {
                const isActive = activeUnitIds.has(unit.id)
                return (
                  <div
                    key={unit.id}
                    className={`unit-card ${isActive ? 'active' : 'locked'}`}
                    onClick={() => isActive && setSelectedUnit(unit)}
                  >
                    <div className="unit-num">{unit.no ?? unit.id}</div>
                    <span>{unitName(unit, medium)}</span>
                    {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                    {!isActive && <Lock size={14} style={{ marginLeft: 'auto', color: 'var(--gray-300)' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {tourOpen && <LevelRulesTour studentId={user.id} studentName={user.name} onClose={() => setTourOpen(false)} />}
    </div>
  )
}
