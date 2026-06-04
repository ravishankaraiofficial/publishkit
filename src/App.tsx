import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './hooks/useTheme';
import { UploadProvider } from './hooks/useUpload';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLoader } from './components/layout/AppLoader';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { AccessPending } from './pages/AccessPending';
import { SetupProfile } from './pages/SetupProfile';
import { Settings } from './pages/Settings';
import { PastResults } from './pages/PastResults';
import { Feedback } from './pages/Feedback';
import Pricing from './pages/Pricing';
import ScriptWriter from './pages/ScriptWriter';
import MultiPost from './pages/MultiPost';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UiLanguageSync } from './i18n/UiLanguageSync';

const queryClient = new QueryClient();

/**
 * Gate the entire route tree on auth resolution. While Firebase is
 * resolving the redirect / current user, show the branded loader
 * with rotating tips instead of flashing the Login page.
 */
function AuthGatedRoutes() {
  const { loading } = useAuth();
  if (loading) return <AppLoader />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pending" element={<AccessPending />} />
        {/* Public legal pages — required for Google OAuth verification.
            Must be reachable without authentication so Google's reviewers
            (and search crawlers) can fetch them. */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about" element={<About />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<SetupProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/results" element={<PastResults />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/script-writer" element={<ScriptWriter />} />
          <Route path="/multipost" element={<MultiPost />} />
          <Route path="/repurposing" element={<MultiPost />} />
        </Route>

        {/* Catch-all 404 — public so unknown URLs don't bounce through auth. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <UiLanguageSync />
            <UploadProvider>
              <AuthGatedRoutes />
            </UploadProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
