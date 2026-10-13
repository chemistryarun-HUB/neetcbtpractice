import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PlayCircle, FileText } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { GSEB_SUBJECT_LABELS, chaptersOf } from '../../lib/gseb'
import { fetchGsebBank, byYearThenNumber, startGsebPractice } from '../../lib/gsebBank'

// Only ids and chapter tags: these views count and pick, the test loads the rest.
const LIGHT = { mcqSelect: 'id, paper_id, q_no, chapter_no', subjectiveSelect: 'id, paper_id, q_no, chapter_no, marks' }

function useLightBank(subject) {
  const [bank, setBank] = useState(null)
  useEffect(() => {
    let live = true
    setBank(null)
    fetchGsebBank(subject, LIGHT)
      .then(b => { if (live) setBank(b) })
      .catch(err => { toast.error(err.message); if (live) setBank({ papers: [], mcq: [], subjective: [] }) })
    return () => { live = false }
  }, [subject])
  return bank
}

function countByChapter(list) {
  const out = {}
  for (const q of list) if (q.chapter_no) out[q.chapter_no] = (out[q.chapter_no] || 0) + 1
  return out
}

// Every chapter of the subject with how many board questions it has across
// all published years; MCQs open as a test, Part B as a reading list.
export function GsebChapterList({ subject }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const bank = useLightBank(subject)
  const [starting, setStarting] = useState(null)

  if (!bank) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
  if (!bank.papers.length) return <div className="empty-state">No papers for this subject yet.</div>

  const mcqCount = countByChapter(bank.mcq)
  const subCount = countByChapter(bank.subjective)
  const years = [...new Set(bank.papers.map(p => p.year))].sort((a, b) => a - b)

  async function practise(chapter) {
    setStarting(chapter.id)
    try {
      const ids = bank.mcq.filter(q => q.chapter_no === chapter.id).sort(byYearThenNumber).map(q => q.id)
      const attemptId = await startGsebPractice({
        studentId: user.id, subject, mode: 'chapter', questionIds: ids,
        title: `${GSEB_SUBJECT_LABELS[subject]} · Ch ${chapter.id} ${chapter.name}`,
      })
      navigate(`/student/gseb/practice/${attemptId}`)
    } catch (err) {
      toast.error(err.message)
      setStarting(null)
    }
  }

  return (
    <>
      <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 0 }}>
        Board questions from {years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0]}, sorted by chapter.
      </p>
      <div className="card">
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table>
            <thead><tr><th>Chapter</th><th style={{ textAlign: 'right' }}>MCQs</th><th style={{ textAlign: 'right' }}>Part B</th><th /></tr></thead>
            <tbody>
              {chaptersOf(subject).map(c => (
                <tr key={c.id}>
                  <td>{c.id}. {c.name}</td>
                  <td style={{ textAlign: 'right' }}>{mcqCount[c.id] || 0}</td>
                  <td style={{ textAlign: 'right' }}>{subCount[c.id] || 0}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-primary btn-sm" disabled={!mcqCount[c.id] || starting !== null}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => practise(c)}>
                      <PlayCircle size={14} /> {starting === c.id ? 'Starting…' : 'Practice MCQs'}
                    </button>{' '}
                    {subCount[c.id] > 0 && (
                      <Link to={`/student/gseb/chapter/${subject}/${c.id}`} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FileText size={14} /> Part B
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
