import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Central RBAC map: path prefix -> allowed roles
export const ROUTE_ROLES = {
  '/pos': ['cashier', 'admin'],
  '/admin': ['admin'],
};

function rolesForPath(pathname) {
  const match = Object.entries(ROUTE_ROLES).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match ? match[1] : null;
}

/**
 * Usage:
 *   <Route element={<ProtectedRoute />}> ...nested routes... </Route>   // login required, roles from ROUTE_ROLES
 *   <ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>    // explicit roles
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = roles ?? rolesForPath(location.pathname);
  if (allowed && !allowed.includes(role)) {
    return <Navigate to="/" replace state={{ denied: true }} />;
  }

  return children ?? <Outlet />;
}
