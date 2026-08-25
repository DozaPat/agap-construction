import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/ProjectsPage'));
const Workers = lazy(() => import('./pages/Workers'));
const Materials = lazy(() => import('./pages/Materials'));
const Tools = lazy(() => import('./pages/Tools'));
const Expenses = lazy(() => import('./pages/ExpensesPage'));
const Reports = lazy(() => import('./pages/Reports'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

const PageLoading = () => (
  <div className="flex min-h-[45vh] items-center justify-center" role="status" aria-live="polite">
    <div className="flex items-center gap-3 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
      <span>Loading page...</span>
    </div>
  </div>
);

const loadPage = (page: React.ReactNode) => (
  <Suspense fallback={<PageLoading />}>
    {page}
  </Suspense>
);

const ProtectedRoute = ({ children, allowPasswordChange = false }: { children: React.ReactNode; allowPasswordChange?: boolean }) => {
  const { user, isCheckingSession } = useAuth();
  if (isCheckingSession) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Checking your session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={loadPage(<Login />)} />
          <Route path="/change-password" element={<ProtectedRoute allowPasswordChange>{loadPage(<ChangePassword />)}</ProtectedRoute>} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={loadPage(<Dashboard />)} />
            <Route path="dashboard" element={loadPage(<Dashboard />)} />
            <Route path="projects" element={loadPage(<Projects />)} />
            <Route path="workers" element={loadPage(<Workers />)} />
            <Route path="materials" element={loadPage(<Materials />)} />
            <Route path="tools" element={loadPage(<Tools />)} />
            <Route path="expenses" element={loadPage(<Expenses />)} />
            <Route path="reports" element={loadPage(<Reports />)} />
            <Route path="users" element={<AdminRoute>{loadPage(<UsersManagement />)}</AdminRoute>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
