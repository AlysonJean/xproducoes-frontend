// src/components/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Mostra uma tela de carregamento enquanto valida a autenticação
    return (
      <div className="min-h-screen bg-muted flex justify-center items-center text-white text-2xl">
        Verificando autenticação...
      </div>
    );
  }

  // Se não estiver autenticado, redireciona para a página de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o conteúdo da rota (a página do dashboard)
  return <Outlet />;
};
