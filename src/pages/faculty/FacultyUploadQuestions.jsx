import { useAuth } from '../../hooks/useAuth'
import Topbar from '../../components/shared/Topbar'
import QuestionUploader from '../../components/shared/QuestionUploader'

const NAV = [
  { to: '/faculty/dashboard', label: 'Dashboard', end: true },
  { to: '/faculty/students', label: 'Students' },
  { to: '/faculty/questions', label: 'Questions' },
  { to: '/faculty/profile', label: 'Profile' },
]

export default function FacultyUploadQuestions() {
  const { user } = useAuth()
  return (
    <div className="dashboard">
      <Topbar links={NAV} />
      <div className="page-content">
        <div className="page-header">
          <h2>Question Bank</h2>
        </div>
        <QuestionUploader uploadedBy={user?.id} />
      </div>
    </div>
  )
}
