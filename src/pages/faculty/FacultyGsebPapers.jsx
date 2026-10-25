import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Topbar from '../../components/shared/Topbar'
import GsebPdfButton from '../../components/shared/GsebPdfButton'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { FACULTY_NAV } from '../../lib/faculty'
import { GSEB_SUBJECTS, GSEB_EXAM_LABELS, GSEB_MEDIUM_LABELS } from '../../lib/gseb'

// Published GSEB board papers, each downloadable as a two-column PDF with or
// without the answer key, for printing or sharing in class.
export default function FacultyGsebPapers() {
  const { user } = useAuth()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  // Open on the faculty member's own subject when they have one.
  const mine = GSEB_SUBJECTS.find(s => (user?.subjects || []).some(x => x.toLowerCase() === s.label.toLowerCase()))
  const [subject, setSubject] = useState(mine?.id || GSEB_SUBJECTS[0].id)

  useEffect(() => {
    supabase.from('gseb_papers').select('*, gseb_subjective(count)').eq('is_published', true)
      .order('year', { ascending: false }).order('session').order('set_no')
      .then(({ data, error }) => {
        if (error) toast.error(error.message)
        setPapers(data || [])
        setLoading(false)
      })
  }, [])

  const shown = papers.filter(p => p.subject === subject)
  return (
    <div className="dashboard">
      <Topbar links={FACULTY_NAV} />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>GSEB Board Papers</h2>
            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
              Download any paper as an A4, two-column PDF, with or without the answer key.
            </div>
          </div>
        </div>

        <div className="tabs">
          {GSEB_SUBJECTS.map(s => (
            <button key={s.id} className={`tab-btn${subject === s.id ? ' active' : ''}`} onClick={() => setSubject(s.id)}>
              {s.label} · {papers.filter(p => p.subject === s.id).length}
            </button>
          ))}
        </div>

        {loading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div> : shown.length === 0 ? (
          <div className="empty-state">No published papers for this subject yet.</div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Year</th><th>Paper</th><th>Medium</th><th>Code</th><th>Part A</th><th>Part B</th><th style={{ textAlign: 'right' }}>PDF</th></tr>
              </thead>
              <tbody>
                {shown.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.year}</td>
                    <td>{GSEB_EXAM_LABELS[p.session] || p.session}{p.set_no ? ` · Set ${p.set_no}` : ''}</td>
                    <td>{GSEB_MEDIUM_LABELS[p.medium] || p.medium}</td>
                    <td>{p.paper_code || '–'}</td>
                    <td>{p.mcq_count} MCQs</td>
                    <td>{p.gseb_subjective?.[0]?.count || 0} questions</td>
                    <td style={{ textAlign: 'right' }}><GsebPdfButton paper={p} label="Download PDF" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
