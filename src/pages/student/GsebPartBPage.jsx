import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { paperTitle, ruleLabel } from '../../lib/gseb'
import GsebSubjectiveCard from '../../components/shared/GsebSubjectiveCard'

// Part B of one board paper, section by section, with the choice rule the
// board printed ("answer any 8 of Q1–12") and the model answer per question.
export default function GsebPartBPage() {
  const { paperId } = useParams()
  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: qs }] = await Promise.all([
        supabase.from('gseb_papers').select('*').eq('id', paperId).eq('is_published', true).single(),
        supabase.from('gseb_subjective').select('*').eq('paper_id', paperId).order('q_no'),
      ])
      setPaper(p || null)
      setQuestions(qs || [])
      setLoading(false)
    }
    load()
  }, [paperId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const rules = paper?.part_b_rules?.length ? paper.part_b_rules : [{ section: '', from: 0, to: Infinity }]
  return (
    <div className="dashboard">
      <header className="topbar"><div className="topbar-brand">NEETCBT</div></header>
      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link to="/student/gseb" className="back-btn"><ArrowLeft size={15} /> All GSEB papers</Link>
        {!paper ? <div className="empty-state">This paper is not available.</div> : (
          <>
            <h2 style={{ marginBottom: '0.25rem' }}>{paperTitle(paper)}</h2>
            <p className="text-muted" style={{ marginTop: 0, fontSize: '0.875rem' }}>
              Part B · 2 hours · 50 marks. Write your answers in a notebook, then check them against the model answers.
            </p>
            {questions.length === 0 && <div className="empty-state">Part B of this paper has not been added yet.</div>}
            {rules.map(r => {
              const qs = questions.filter(q => r.section ? q.section === r.section : true)
              if (!qs.length) return null
              return (
                <div key={r.section || 'all'} style={{ marginBottom: '1.5rem' }}>
                  {r.section && (
                    <div style={{ margin: '1rem 0 0.75rem' }}>
                      <h3 style={{ margin: 0 }}>Section {r.section}</h3>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{ruleLabel(r)}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {qs.map(q => <GsebSubjectiveCard key={q.id} q={q} label={`Q${q.q_no}`} />)}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
