import AdminPerformance from '../admin/AdminPerformance'
import { FACULTY_NAV } from '../../lib/faculty'

// The admin's Performance view, minus every phone number and WhatsApp control.
export default function FacultyPerformance() {
  return <AdminPerformance nav={FACULTY_NAV} crumb="Faculty" hideContacts />
}
