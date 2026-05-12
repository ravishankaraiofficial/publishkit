import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppLoader } from './AppLoader';

export function ProtectedRoute() {
  const { user, loading, profile, isWhitelisted } = useAuth();
  const location = useLocation();

  // For anonymous users we don't fetch whitelist, so skip that null-check.
  if (loading || (user && !user.isAnonymous && isWhitelisted === null)) {
    return <AppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Anonymous (guest) users get exactly one free session.
  // Their quota is handled gracefully on the Home page via quotaExceeded state.
  // We allow them to navigate to /feedback, /results, etc.
  if (user.isAnonymous) {
    // If they try to access settings or setup, bounce them to login
    if (location.pathname === '/settings' || location.pathname === '/setup') {
      return <Navigate to="/login" replace />;
    }
    return <Outlet />;
  }

  if (!isWhitelisted) {
    return <Navigate to="/pending" replace />;
  }

  if (!profile && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  // If they have a profile, don't let them go back to setup
  if (profile && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
