import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import MastersPage from './pages/MastersPage';
import MasterProfilePage from './pages/MasterProfilePage';
import VacanciesPage from './pages/VacanciesPage';
import BecomeMasterPage from './pages/BecomeMasterPage';
import BlogPage from './pages/BlogPage';
import PrivacyPage from './pages/PrivacyPage';
import ChatPage from './pages/ChatPage';
import OrdersPage from './pages/OrdersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SsoCallbackPage from './pages/SsoCallbackPage';
import TermsPage from './pages/TermsPage';
import PhoneCompletionPage from './pages/PhoneCompletionPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import WorkerOnboardingPage from './pages/WorkerOnboardingPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
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
    </AppShell>
  );
}

export default App;
