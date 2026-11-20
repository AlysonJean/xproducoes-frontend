// Utilitário para gerenciar redirecionamentos baseados em roles

export const getDashboardRoute = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/painel';
    case 'COLLABORATOR':
      return '/colaborador/painel';
    case 'CLIENT':
      return '/cliente/painel';
    default:
      return '/painel';
  }
};
