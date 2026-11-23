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

// Onda 2 da auditoria de 19/11 (F1-06): depois de entrar, a pessoa volta para a página que pediu (os e-mails e a
// Google Agenda apontam para /admin/reservas/:id, as notificações do cliente para /cliente/reservas/:id). Só vale
// caminho interno: começa com "/" e não com "//" nem "/\" (que o navegador lê como outro site), e não é o próprio login.
export const safeNextPath = (search: string): string | null => {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login#')) return null;
  return next;
};

/** F1-06: o endereço do login que, depois de entrar, volta para `path` (caminho + busca + âncora). */
export const loginPathFor = (path: string): string => `/login?next=${encodeURIComponent(path)}`;
