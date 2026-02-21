import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TwinProfilePage } from './pages/TwinProfilePage';
import { SharePage } from './pages/SharePage';
import { ShareViewPage } from './pages/ShareViewPage';
import { InstitutionLoginPage } from './pages/InstitutionLoginPage';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/twin" element={<TwinProfilePage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/share/:token" element={<ShareViewPage />} />
              <Route path="/institution/login" element={<InstitutionLoginPage />} />
              <Route path="/institution" element={<InstitutionDashboardPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
