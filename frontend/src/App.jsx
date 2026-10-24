import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './authSlice';
import { AppLayout, GuestOnly, RequireAdmin, RequireAuth } from './components/Layout';
import { PageSpinner } from './components/ui';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Homepage from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import ProblemPage from './pages/ProblemPage';
import Admin from './pages/Admin';
import AdminProblems from './pages/AdminProblems';
import ProblemForm from './pages/ProblemForm';
import AdminUpload from './pages/AdminUpload';
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
      <Route path="/problem/:problemId" element={<RequireAuth><ProblemPage /></RequireAuth>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Homepage />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<Admin />} />
          <Route path="problems" element={<AdminProblems />} />
          <Route path="create" element={<ProblemForm key="create" />} />
          <Route path="edit/:problemId" element={<ProblemForm key="edit" />} />
          <Route path="upload/:problemId" element={<AdminUpload />} />
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
