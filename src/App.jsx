import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import StudentLoginPage from './pages/StudentLoginPage'
import FacultyLoginPage from './pages/FacultyLoginPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminFaculty from './pages/admin/AdminFaculty'
import AdminQuestions from './pages/admin/AdminQuestions'

import FacultyDashboard from './pages/faculty/FacultyDashboard'
import FacultyStudents from './pages/faculty/FacultyStudents'
import FacultyUploadQuestions from './pages/faculty/FacultyUploadQuestions'
import FacultyProfile from './pages/faculty/FacultyProfile'
import FacultySetup from './pages/faculty/FacultySetup'
import StudentProgress from './pages/faculty/StudentProgress'

import StudentDashboard from './pages/student/StudentDashboard'
import TestPage from './pages/student/TestPage'
import ResultPage from './pages/student/ResultPage'
import ChangePassword from './pages/student/ChangePassword'

import './index.css'

function ProtectedRoute({ children, allowedRoles }) {
  const { role, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route path="/faculty/login" element={<FacultyLoginPage />} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['admin']}><AdminFaculty /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={['admin']}><AdminQuestions /></ProtectedRoute>} />

      <Route path="/faculty/setup" element={<FacultySetup />} />
      <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyStudents /></ProtectedRoute>} />
      <Route path="/faculty/questions" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyUploadQuestions /></ProtectedRoute>} />
      <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyProfile /></ProtectedRoute>} />
      <Route path="/faculty/student/:studentId" element={<ProtectedRoute allowedRoles={['faculty']}><StudentProgress /></ProtectedRoute>} />

      <Route path="/student/change-password" element={<ProtectedRoute allowedRoles={['student']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/test/:level" element={<ProtectedRoute allowedRoles={['student']}><TestPage /></ProtectedRoute>} />
      <Route path="/student/result/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><ResultPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  )
}
