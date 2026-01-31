// Utilitário para gerenciar redirecionamentos baseados em roles

export const getDashboardRoute = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/painel';
    case 'COLLABORATOR':
      return '/colaborador/painel';
    case 'FREELANCER':
      return '/freelancer/painel';
    case 'CLIENT':
      return '/cliente/painel';
    default:
      return '/painel';
  }
};

export const getDefaultRouteForRole = (role: string): string => {
  return getDashboardRoute(role);
};

// Verificar se o usuário tem acesso a uma rota específica
export const hasAccessToRoute = (userRole: string, requiredRole?: string, adminOnly?: boolean): boolean => {
  if (adminOnly && userRole !== 'ADMIN') {
    return false;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return false;
  }
  
  return true;
};

// Mapear roles para nomes amigáveis
export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'COLLABORATOR':
      return 'Colaborador';
    case 'FREELANCER':
      return 'Freelancer';
    case 'CLIENT':
      return 'Cliente';
    default:
      return 'Usuário';
  }
};
