import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  regional: '/regional/dashboard',
  operator: '/operator-pos/dashboard',
  mitra: '/mitra/dashboard',
  customer: '/customer',
};

export default function ProtectedRoute({ allowedRoles, children, fallbackPath }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Jika user sudah login tetapi role tidak diizinkan, arahkan ke dashboard role-nya
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const targetPath = fallbackPath || ROLE_HOME[role] || '/login';
    return <Navigate to={targetPath} replace />;
  }

  return children;
}