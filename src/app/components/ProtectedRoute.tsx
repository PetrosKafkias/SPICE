import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import PageLoadingSkeleton from './PageLoadingSkeleton';

export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoadingSkeleton />;
  }

  if (status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/signin?reason=auth&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
