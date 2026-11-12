// D4 (aprovada em 02/11/2026) e decisão de Alyson (12/11/2026), "o padrão dos grandes aplicativos": escala cancelada
// (ou "não compareceu") não é equipe em lugar nenhum. É a mesma lista do servidor (ACTIVE_ASSIGNMENT_STATUSES, em
// backend/src/services/collaboratorView.ts): o site não importa código do servidor, então ela se repete aqui. Status
// novo de escala entra nas duas.
export const ACTIVE_ASSIGNMENT_STATUSES: readonly string[] = ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

export const isActiveAssignmentStatus = (status: string | null | undefined): boolean =>
  !!status && ACTIVE_ASSIGNMENT_STATUSES.includes(status);
