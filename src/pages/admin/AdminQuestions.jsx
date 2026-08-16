import Topbar from '../../components/shared/Topbar'
import QuestionUploader from '../../components/shared/QuestionUploader'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/key-changes', label: 'Answer Keys' },
  { to: '/admin/videos', label: 'Lectures' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
]

export default function AdminQuestions() {
  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        {/* Tighter than the shared .page-header default (1.5rem) — this page's
            table is the whole point of the screen, so it starts as high as
            the header realistically allows. Scoped to just this page: an
            inline override, not a change to .page-header itself, which
            every other admin page also uses. */}
        <div className="page-header" style={{ marginBottom: '0.75rem' }}>
          <h2>Question Bank</h2>
        </div>
        <QuestionUploader uploadedBy="admin" />
      </div>
    </div>
  )
}
