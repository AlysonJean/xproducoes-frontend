import { describe, it, expect } from 'vitest';
import { ACTIVE_ASSIGNMENT_STATUSES, isActiveAssignmentStatus } from '../assignmentStatus';

// D4 e decisão de Alyson (12/11/2026): escala cancelada (ou "não compareceu") não é equipe. A mesma lista do servidor
// (ACTIVE_ASSIGNMENT_STATUSES, em backend/src/services/collaboratorView.ts), conferida lá pelo teste gêmeo
// backend/src/utils/__tests__/escalas.listaAtiva.test.ts. Se a lista mudar de propósito, mude as duas e os dois testes.
describe('assignmentStatus', () => {
  it('a lista é a do servidor: Escalado, Confirmado, Em andamento e Concluído', () => {
    expect([...ACTIVE_ASSIGNMENT_STATUSES]).toEqual(['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);
  });

  it.each([
    ['ASSIGNED', true],
    ['CONFIRMED', true],
    ['IN_PROGRESS', true],
    ['COMPLETED', true],
    ['CANCELLED', false],
    ['NO_SHOW', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('%s é escala ativa: %s', (status, expected) => {
    expect(isActiveAssignmentStatus(status)).toBe(expected);
  });
});
