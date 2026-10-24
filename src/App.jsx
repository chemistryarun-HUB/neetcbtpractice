import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import StudentLoginPage from './pages/StudentLoginPage'
import ShortLinkRedirect from './pages/ShortLinkRedirect'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminFaculty from './pages/admin/AdminFaculty'
import AdminQuestions from './pages/admin/AdminQuestions'
import AdminPerformance from './pages/admin/AdminPerformance'
import AdminPracticePapers from './pages/admin/AdminPracticePapers'
import AdminGsebPapers from './pages/admin/AdminGsebPapers'
import AdminGsebPaper from './pages/admin/AdminGsebPaper'
import AdminGsebGenerator from './pages/admin/AdminGsebGenerator'
import AdminGsebPerformance from './pages/admin/AdminGsebPerformance'
import AdminVideos from './pages/admin/AdminVideos'
import AdminKeyChanges from './pages/admin/AdminKeyChanges'

import FacultyDashboard from './pages/faculty/FacultyDashboard'
import FacultyStudents from './pages/faculty/FacultyStudents'
import FacultyQuestions from './pages/faculty/FacultyQuestions'
import FacultyPerformance from './pages/faculty/FacultyPerformance'
import FacultyPracticePapers from './pages/faculty/FacultyPracticePapers'
import AdminFacultyReview from './pages/admin/AdminFacultyReview'
import FacultyProfile from './pages/faculty/FacultyProfile'

import StudentDashboard from './pages/student/StudentDashboard'
import TestPage from './pages/student/TestPage'
import ResultPage from './pages/student/ResultPage'
import ChangePassword from './pages/student/ChangePassword'
import StudentPerformance from './pages/student/StudentPerformance'
import StudentPracticePapers from './pages/student/StudentPracticePapers'
import StudentGsebPapers from './pages/student/StudentGsebPapers'
import GsebTestPage from './pages/student/GsebTestPage'
import GsebResultPage from './pages/student/GsebResultPage'
import GsebPartBPage from './pages/student/GsebPartBPage'
import GsebChapterPage from './pages/student/GsebChapterPage'

import './index.css'

// Old faculty links to a single student now open that student in Performance.
function OldStudentLink() {
  const { studentId } = useParams()
  return <Navigate to={`/faculty/performance?student=${studentId}`} replace />
}

function ProtectedRoute({ children, allowedRoles }) {
  const { role, user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />
  // A faculty member still on the admin-issued password goes nowhere else first.
  if (role === 'faculty' && user?.must_change_password && location.pathname !== '/faculty/change-password') {
    return <Navigate to="/faculty/change-password" replace />
  }
  return children
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      {/* Public, deliberately outside ProtectedRoute — a parent opening this
          from WhatsApp has no NEETCBT account at all. See lib/shortLinks.js. */}
      <Route path="/r/:code" element={<ShortLinkRedirect />} />
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route path="/faculty/login" element={<Navigate to="/" replace />} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['admin']}><AdminFaculty /></ProtectedRoute>} />
      <Route path="/admin/faculty-review" element={<ProtectedRoute allowedRoles={['admin']}><AdminFacultyReview /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={['admin']}><AdminQuestions /></ProtectedRoute>} />
      <Route path="/admin/performance" element={<ProtectedRoute allowedRoles={['admin']}><AdminPerformance /></ProtectedRoute>} />
      <Route path="/admin/practice-papers" element={<ProtectedRoute allowedRoles={['admin']}><AdminPracticePapers /></ProtectedRoute>} />
      <Route path="/admin/gseb" element={<ProtectedRoute allowedRoles={['admin']}><AdminGsebPapers /></ProtectedRoute>} />
      <Route path="/admin/gseb/generate" element={<ProtectedRoute allowedRoles={['admin']}><AdminGsebGenerator /></ProtectedRoute>} />
      <Route path="/admin/gseb/performance" element={<ProtectedRoute allowedRoles={['admin']}><AdminGsebPerformance /></ProtectedRoute>} />
      <Route path="/admin/gseb/:paperId" element={<ProtectedRoute allowedRoles={['admin']}><AdminGsebPaper /></ProtectedRoute>} />
      <Route path="/admin/videos" element={<ProtectedRoute allowedRoles={['admin']}><AdminVideos /></ProtectedRoute>} />
      <Route path="/admin/key-changes" element={<ProtectedRoute allowedRoles={['admin']}><AdminKeyChanges /></ProtectedRoute>} />

      <Route path="/faculty/change-password" element={<ProtectedRoute allowedRoles={['faculty']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyStudents /></ProtectedRoute>} />
      <Route path="/faculty/questions" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyQuestions /></ProtectedRoute>} />
      <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyProfile /></ProtectedRoute>} />
      <Route path="/faculty/performance" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyPerformance /></ProtectedRoute>} />
      <Route path="/faculty/practice-papers" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyPracticePapers /></ProtectedRoute>} />
      <Route path="/faculty/student/:studentId" element={<OldStudentLink />} />

      <Route path="/student/change-password" element={<ProtectedRoute allowedRoles={['student']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/test/:unitId/:level" element={<ProtectedRoute allowedRoles={['student']}><TestPage /></ProtectedRoute>} />
      <Route path="/student/result/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><ResultPage /></ProtectedRoute>} />
      <Route path="/student/performance" element={<ProtectedRoute allowedRoles={['student']}><StudentPerformance /></ProtectedRoute>} />
      <Route path="/student/practice-papers" element={<ProtectedRoute allowedRoles={['student']}><StudentPracticePapers /></ProtectedRoute>} />
      <Route path="/student/gseb" element={<ProtectedRoute allowedRoles={['student']}><StudentGsebPapers /></ProtectedRoute>} />
      <Route path="/student/gseb/test/:paperId" element={<ProtectedRoute allowedRoles={['student']}><GsebTestPage /></ProtectedRoute>} />
      <Route path="/student/gseb/result/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><GsebResultPage /></ProtectedRoute>} />
      <Route path="/student/gseb/practice/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><GsebTestPage /></ProtectedRoute>} />
      <Route path="/student/gseb/paper/:paperId/part-b" element={<ProtectedRoute allowedRoles={['student']}><GsebPartBPage /></ProtectedRoute>} />
      <Route path="/student/gseb/chapter/:subject/:chapterNo" element={<ProtectedRoute allowedRoles={['student']}><GsebChapterPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  )
}
