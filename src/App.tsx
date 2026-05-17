import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <UploadProvider>
            <AuthGatedRoutes />
          </UploadProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
