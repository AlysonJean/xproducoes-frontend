import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/authUtils';
import { PageLoadingSpinner } from '../components/ui/PageLoadingSpinner';

// Extraído de App.tsx (achado: peso de bundle vazando pra home pública, ver
// AdminRoutes.tsx/CollaboratorRoutes.tsx/ClientRoutes.tsx) para ser compartilhado pelos
// grupos de rotas por área sem criar import circular de volta pra App.tsx.
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  role?: string; // Aceitar role específico
}> = ({ children, adminOnly = false, role }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Mesmo loader de página do Suspense das rotas (PageLoadingSpinner): inline, abaixo do header.
  // Antes era `fullScreen size="xl"` cobrindo o header — 3 loaders diferentes em sequência ao abrir
  // uma página da área do cliente (Suspense → guarda → página).
  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/painel" replace />;
  }

  // Redirecionamento específico por role
  if (role && user?.role !== role) {
    switch (user?.role) {
      case 'ADMIN':
        return <Navigate to="/admin/painel" replace />;
      case 'COLLABORATOR':
        return <Navigate to="/colaborador/painel" replace />;
      case 'FREELANCER':
        return <Navigate to="/freelancer/painel" replace />;
      case 'CLIENT':
        return <Navigate to="/cliente/painel" replace />;
      default:
        return <Navigate to="/painel" replace />;
    }
  }

  return <>{children}</>;
};

// Auth Redirect Component (redirects authenticated users away from login/register)
export const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  // Só redireciona se estiver na página de login ou de cadastro. Achado: comparava com '/register',
  // mas a rota do cadastro é '/cadastro' — usuário já logado via o formulário de cadastro.
  if (isAuthenticated && user && (location.pathname === '/login' || location.pathname === '/cadastro')) {
    const dashboardRoute = getDashboardRoute(user.role);
    return <Navigate to={dashboardRoute} replace />;
  }

  return <>{children}</>;
};

// Canonical dashboard entrypoint by role to avoid redirect chains.
export const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardRoute(user.role)} replace />;
};
