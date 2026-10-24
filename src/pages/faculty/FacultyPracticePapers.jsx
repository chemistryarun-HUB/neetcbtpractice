import AdminPracticePapers from '../admin/AdminPracticePapers'
import { FACULTY_NAV } from '../../lib/faculty'
import { useAuth } from '../../hooks/useAuth'

// The admin's practice-paper tool, scoped to the papers this faculty member made.
export default function FacultyPracticePapers() {
  const { user } = useAuth()
  return <AdminPracticePapers nav={FACULTY_NAV} facultyId={user?.id} />
}
