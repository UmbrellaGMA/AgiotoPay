import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function ProtectedRoute() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
