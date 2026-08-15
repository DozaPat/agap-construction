import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/ProjectsPage';
import Workers from './pages/Workers';
import Materials from './pages/Materials';
import Tools from './pages/Tools';
import Expenses from './pages/ExpensesPage';
import Reports from './pages/Reports';
import Layout from './components/Layout/Layout';
import UsersManagement from './pages/UsersManagement';
import ChangePassword from './pages/ChangePassword';

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
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ProtectedRoute allowPasswordChange><ChangePassword /></ProtectedRoute>} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="workers" element={<Workers />} />
            <Route path="materials" element={<Materials />} />
            <Route path="tools" element={<Tools />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
