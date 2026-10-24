import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';
import AppLayout from './components/layout/AppLayout';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/layout/RouteGuards';
import { PageSpinner } from './components/ui';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Problems from './pages/Problems';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProblems from './pages/admin/AdminProblems';
import ProblemForm from './pages/admin/ProblemForm';
import VideoUpload from './pages/admin/VideoUpload';
import NotFound from './pages/NotFound';

function App() {
  const dispatch = useDispatch();
  const { initialized } = useSelector((state) => state.auth);

  // Restore the session from the cookie once on load.
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (!initialized) {
    return (
      <div className="grid min-h-screen place-items-center">
        <PageSpinner label="Starting WiseCode…" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />

      {/* Full-screen coding workspace */}
      <Route path="/problem/:problemId" element={<RequireAuth><Workspace /></RequireAuth>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Problems />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="problems" element={<AdminProblems />} />
          <Route path="create" element={<ProblemForm key="create" />} />
          <Route path="edit/:problemId" element={<ProblemForm key="edit" />} />
          <Route path="upload/:problemId" element={<VideoUpload />} />
          {/* Legacy admin URLs */}
          <Route path="update" element={<Navigate to="/admin/problems" replace />} />
          <Route path="delete" element={<Navigate to="/admin/problems" replace />} />
          <Route path="video" element={<Navigate to="/admin/problems?view=video" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
