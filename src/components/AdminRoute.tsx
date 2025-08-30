// Caminho: frontend/src/components/AdminRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export const AdminRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se o utilizador não for um admin, redireciona para o dashboard de cliente
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Se for admin, renderiza o conteúdo da rota (o DashboardLayout)
  return <Outlet />;
};
