import { Navigate, Outlet, useLocation } from 'react-router';
import { useSelector } from 'react-redux';

// Route guards based on the auth slice. Without children they render nested routes (<Outlet />).

export function RequireAuth({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children ?? <Outlet />;
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children ?? <Outlet />;
}

export function GuestOnly({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const location = useLocation();
  if (isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />;
  return children;
}
