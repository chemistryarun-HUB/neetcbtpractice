import AdminMistakes from '../admin/AdminMistakes'
import { FACULTY_NAV } from '../../lib/faculty'

export default function FacultyMistakes() {
  return <AdminMistakes nav={FACULTY_NAV} crumb="Faculty" />
}
