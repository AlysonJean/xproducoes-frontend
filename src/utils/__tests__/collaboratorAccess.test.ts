import { describe, it, expect } from 'vitest';
import { isCollaboratorDeactivated, schedulableCollaborators } from '../collaboratorAccess';

// Decisão de Alyson (12/11/2026): fica sem acesso o cadastro "Inativo" (a desativação grava cadastro e conta juntos) e
// o de uma conta desativada por outro caminho (a exclusão da conta pela LGPD não mexe no cadastro). A mesma regra do
// servidor (DEACTIVATED_COLLABORATOR_WHERE).
describe('collaboratorAccess', () => {
  it.each([
    [{ status: 'INACTIVE', user: { isActive: false } }, true],
    [{ status: 'INACTIVE' }, true],
    [{ status: 'ACTIVE', user: { isActive: false } }, true],
    [{ status: 'ACTIVE', user: { isActive: true } }, false],
    [{ status: 'PENDING_APPROVAL', user: { isActive: true } }, false],
    [{ status: 'SUSPENDED' }, false],
    // Sem a conta na resposta, vale o cadastro.
    [{ status: 'ACTIVE' }, false],
    [{ status: 'ACTIVE', user: null }, false],
  ])('%j sem acesso: %s', (collaborator, expected) => {
    expect(isCollaboratorDeactivated(collaborator)).toBe(expected);
  });

  it('schedulableCollaborators tira só quem está sem acesso, na mesma ordem', () => {
    const lista = [
      { id: 'a', status: 'ACTIVE', user: { isActive: true } },
      { id: 'b', status: 'INACTIVE', user: { isActive: false } },
      { id: 'c', status: 'PENDING_APPROVAL', user: { isActive: true } },
      { id: 'd', status: 'ACTIVE', user: { isActive: false } },
    ];
    expect(schedulableCollaborators(lista).map((c) => c.id)).toEqual(['a', 'c']);
  });
});
