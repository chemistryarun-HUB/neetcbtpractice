import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GSEB_SUBJECT_LABELS, chapterName, paperTag } from '../../lib/gseb'
import GsebSubjectiveCard from '../../components/shared/GsebSubjectiveCard'

// Every Part B question of one chapter from all published papers, grouped by
// marks (2, 3, 4…) and newest year first, each tagged with its paper.
export default function GsebChapterPage() {
  const { subject, chapterNo } = useParams()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('gseb_subjective')
        .select('*, paper:gseb_papers!inner(year, session, subject, is_published)')
        .eq('chapter_no', Number(chapterNo))
        .eq('paper.subject', subject).eq('paper.is_published', true)
      setQuestions((data || []).sort((a, b) => a.marks - b.marks || b.paper.year - a.paper.year || a.q_no - b.q_no))
      setLoading(false)
    }
    load()
  }, [subject, chapterNo])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const marksGroups = [...new Set(questions.map(q => q.marks))]
  return (
    <div className="dashboard">
      <header className="topbar"><div className="topbar-brand">NEETCBT</div></header>
      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link to={`/student/gseb?view=chapters&subject=${subject}`} className="back-btn"><ArrowLeft size={15} /> All chapters</Link>
        <h2 style={{ marginBottom: '0.25rem' }}>Ch {chapterNo}. {chapterName(subject, chapterNo)}</h2>
        <p className="text-muted" style={{ marginTop: 0, fontSize: '0.875rem' }}>
          {GSEB_SUBJECT_LABELS[subject]} · Part B board questions from every year · {questions.length} questions
        </p>
        {questions.length === 0 && <div className="empty-state">No Part B questions for this chapter yet.</div>}
        {marksGroups.map(m => (
          <div key={m} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '1rem 0 0.75rem' }}>{m}-mark questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.filter(q => q.marks === m).map((q, i) => (
                <GsebSubjectiveCard key={q.id} q={q} label={`${i + 1}.`} tag={`${paperTag(q.paper)} · Q${q.q_no}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
