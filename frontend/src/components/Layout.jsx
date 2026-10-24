import { Navigate, Outlet, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';

// Standard page chrome: sticky navbar + centred content.
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-base-300 py-6 text-center text-xs text-base-content/50">
        WiseCode · Practice DSA with real code execution
      </footer>
    </div>
  );
}

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
