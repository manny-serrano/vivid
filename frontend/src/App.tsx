import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { AuthProvider } from './components/auth/AuthProvider';
import { useAuthStore } from './store/authStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TwinProfilePage } from './pages/TwinProfilePage';
import { SharePage } from './pages/SharePage';
import { ShareViewPage } from './pages/ShareViewPage';
import { InstitutionLoginPage } from './pages/InstitutionLoginPage';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage';
import { ChatBot } from './components/chat/ChatBot';
import { ZkpPage } from './pages/ZkpPage';
import { ZkpVerifyPage } from './pages/ZkpVerifyPage';
import { BadgePage } from './pages/BadgePage';
import { BadgeVerifyPage } from './pages/BadgeVerifyPage';
import { StressTestPage } from './pages/StressTestPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { OptimizePage } from './pages/OptimizePage';
import { LoanShieldPage } from './pages/LoanShieldPage';
import { TimeMachinePage } from './pages/TimeMachinePage';
import { RedFlagsPage } from './pages/RedFlagsPage';
import { ReputationPage } from './pages/ReputationPage';
import { WidgetPage } from './pages/WidgetPage';
import { WidgetEmbedPage } from './pages/WidgetEmbedPage';

function SmartLanding() {
  const user = useAuthStore((s) => s.user);
  if (user?.hasTwin) return <Navigate to="/dashboard" replace />;
  if (user) return <Navigate to="/onboarding" replace />;
  return <LandingPage />;
}

function SmartLogin() {
  const user = useAuthStore((s) => s.user);
  if (user?.hasTwin) return <Navigate to="/dashboard" replace />;
  if (user) return <Navigate to="/onboarding" replace />;
  return <LoginPage />;
}

function SmartOnboarding() {
  const user = useAuthStore((s) => s.user);
  if (user?.hasTwin) return <Navigate to="/dashboard" replace />;
  return <OnboardingPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-8">
              <Routes>
                <Route path="/" element={<SmartLanding />} />
                <Route path="/login" element={<SmartLogin />} />
                <Route path="/onboarding" element={<SmartOnboarding />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/twin" element={<TwinProfilePage />} />
                <Route path="/share" element={<SharePage />} />
                <Route path="/share/:token" element={<ShareViewPage />} />
                <Route path="/institution/login" element={<InstitutionLoginPage />} />
                <Route path="/institution" element={<InstitutionDashboardPage />} />
                <Route path="/zkp" element={<ZkpPage />} />
                <Route path="/zkp/verify/:proofHash" element={<ZkpVerifyPage />} />
                <Route path="/badges" element={<BadgePage />} />
                <Route path="/verify/:consentToken" element={<BadgeVerifyPage />} />
                <Route path="/stress-test" element={<StressTestPage />} />
                <Route path="/anomalies" element={<AnomaliesPage />} />
                <Route path="/optimize" element={<OptimizePage />} />
                <Route path="/loan-shield" element={<LoanShieldPage />} />
                <Route path="/time-machine" element={<TimeMachinePage />} />
                <Route path="/red-flags" element={<RedFlagsPage />} />
                <Route path="/reputation" element={<ReputationPage />} />
                <Route path="/widgets" element={<WidgetPage />} />
                <Route path="/widget/embed" element={<WidgetEmbedPage />} />
              </Routes>
            </main>
          </div>
          <ChatBot />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
