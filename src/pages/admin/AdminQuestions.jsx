import Topbar from '../../components/shared/Topbar'
import QuestionUploader from '../../components/shared/QuestionUploader'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/practice-papers', label: 'Practice Papers' },
]

export default function AdminQuestions() {
  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Question Bank</h2>
        </div>
        <QuestionUploader uploadedBy="admin" />
      </div>
    </div>
  )
}
