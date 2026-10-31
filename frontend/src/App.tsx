import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'
import { ForgotPassword, Login, Register, ResetPassword } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Feedbacks from './pages/Feedbacks'
import FeedbackDetail from './pages/FeedbackDetail'
import QRCodes from './pages/QRCodes'
import { Branches, Departments, Staff } from './pages/Lists'
import { Reports, Statistics } from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import SocialNetworks from './pages/SocialNetworks'
import PublicFeedback, { Track } from './pages/PublicFeedback'
import About from './pages/About'
import { SuperAudit, SuperLayout, SuperOrgs, SuperStats, SuperUsers } from './pages/SuperAdmin'

function Guard({ superOnly }: { superOnly?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted">Yuklanmoqda...</div>
  if (!user) return <Navigate to="/login" replace />
  if (superOnly ? !user.is_superuser : user.is_superuser) return <Navigate to={user.is_superuser ? '/super' : '/login'} replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/track/:number" element={<Track />} />
      <Route path="/about" element={<div className="p-4 sm:p-6"><About /></div>} />
      <Route path="/:slug/qr/:token" element={<PublicFeedback />} />
      <Route element={<Guard />}>
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="feedbacks/:id" element={<FeedbackDetail />} />
          <Route path="suggestions" element={<Feedbacks type="suggestion" title="Takliflar" />} />
          <Route path="complaints" element={<Feedbacks type="complaint" title="Shikoyatlar" />} />
          <Route path="qr" element={<QRCodes />} />
          <Route path="social" element={<SocialNetworks />} />
          <Route path="branches" element={<Branches />} />
          <Route path="departments" element={<Departments />} />
          <Route path="staff" element={<Staff />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
        </Route>
      </Route>
      <Route element={<Guard superOnly />}>
        <Route path="/super" element={<SuperLayout />}>
          <Route index element={<SuperStats />} />
          <Route path="organizations" element={<SuperOrgs />} />
          <Route path="users" element={<SuperUsers />} />
          <Route path="audit" element={<SuperAudit />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
