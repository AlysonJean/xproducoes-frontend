// Decisão de Alyson (12/11/2026): "Desativar acesso" no lugar de "Remover colaborador". Fica sem acesso o perfil
// "Inativo" (a desativação grava o perfil e a conta juntos) e o de uma conta desativada por outro caminho (a exclusão da
// conta pela LGPD desativa a conta e não mexe no perfil). É a mesma regra do servidor (DEACTIVATED_COLLABORATOR_WHERE,
// em backend/src/repositories/collaboratorRepository.ts): quem está sem acesso continua na lista da equipe e no
// histórico dos eventos, e não aparece para ser escalado.
export const isCollaboratorDeactivated = (collaborator: { status?: string | null; user?: object | null }): boolean =>
  collaborator.status === 'INACTIVE' || (collaborator.user as { isActive?: unknown } | null | undefined)?.isActive === false;

/** Só sai da lista de quem pode ser escalado quem está sem acesso. */
export const schedulableCollaborators = <T extends { status?: string | null; user?: object | null }>(collaborators: T[]): T[] =>
  collaborators.filter((collaborator) => !isCollaboratorDeactivated(collaborator));
