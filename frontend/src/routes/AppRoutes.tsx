import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ExperimentDetailPage } from '../features/experiments/ExperimentDetailPage';
import { AssignedReviewsPage } from '../features/reviews/AssignedReviewsPage';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingSpinner } from '../components/LoadingSpinner';

function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading CellScope..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'reviewer') {
    return <Navigate to="/reviews" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Root redirect based on authentication and role */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Researcher Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['researcher']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/experiments/:id"
          element={
            <ProtectedRoute allowedRoles={['researcher']}>
              <ExperimentDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Reviewer Routes */}
        <Route
          path="/reviews"
          element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <AssignedReviewsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
