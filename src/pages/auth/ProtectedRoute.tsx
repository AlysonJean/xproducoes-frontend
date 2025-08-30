// src/components/auth/ProtectedRoute.tsx

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'ADMIN' | 'CLIENT' | 'COLLABORATOR';
  adminOnly?: boolean;
  collaboratorOnly?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  requireRole,
  adminOnly = false,
  collaboratorOnly = false,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar permissões específicas
  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (collaboratorOnly && user.role !== 'COLLABORATOR' && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireRole && user.role !== requireRole && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
