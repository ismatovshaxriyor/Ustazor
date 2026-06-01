import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import React, { Suspense, lazy } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const MastersPage = lazy(() => import('./pages/MastersPage'));
const MasterProfilePage = lazy(() => import('./pages/MasterProfilePage'));
const VacanciesPage = lazy(() => import('./pages/VacanciesPage'));
const BecomeMasterPage = lazy(() => import('./pages/BecomeMasterPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SsoCallbackPage = lazy(() => import('./pages/SsoCallbackPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PhoneCompletionPage = lazy(() => import('./pages/PhoneCompletionPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const WorkerOnboardingPage = lazy(() => import('./pages/WorkerOnboardingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const WorkerDashboardPage = lazy(() => import('./pages/WorkerDashboardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
import { useAuth } from './context/AuthContext';

function LegacyVacancyRedirect() {
  const { id } = useParams();
  if (!id) {
    return <Navigate to="/elonlar" replace />;
  }
  return <Navigate to={`/elonlar?vacancy=${encodeURIComponent(id)}`} replace />;
}

function App() {
  const location = useLocation();
  const { isAuthenticated, phoneCompletionRequired, userTypeCompletionRequired } = useAuth();
  const profileCompletionRequired = phoneCompletionRequired || userTypeCompletionRequired;
  const isAllowedWithoutPhone =
    location.pathname === '/auth/complete-phone'
    || location.pathname === '/auth/login'
    || location.pathname === '/auth/register'
    || location.pathname === '/auth/sso-callback'
    || location.pathname === '/auth/login/sso-callback'
    || location.pathname === '/auth/register/sso-callback';

  if (isAuthenticated && profileCompletionRequired && !isAllowedWithoutPhone) {
    return (
      <AppShell>
        <Navigate to="/auth/complete-phone" replace />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'var(--font-heading)' }}>Yuklanmoqda...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/masters" element={<MastersPage />} />
          <Route path="/masters/:id" element={<MasterProfilePage />} />
          <Route path="/elonlar" element={<VacanciesPage />} />
          <Route path="/elonlar/:id" element={<LegacyVacancyRedirect />} />
          <Route path="/vacancies" element={<VacanciesPage />} />
          <Route path="/vacancies/:id" element={<LegacyVacancyRedirect />} />
          <Route path="/become-master" element={<BecomeMasterPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:threadId" element={<ChatPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/sso-callback" element={<SsoCallbackPage />} />
          <Route path="/auth/login/sso-callback" element={<SsoCallbackPage />} />
          <Route path="/auth/register/sso-callback" element={<SsoCallbackPage />} />
          <Route path="/auth/complete-phone" element={<PhoneCompletionPage />} />
          <Route path="/auth/verify" element={<VerifyEmailPage />} />
          <Route path="/auth/worker-onboarding" element={<WorkerOnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/worker/dashboard" element={<WorkerDashboardPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
