import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('../../services/api', () => ({ api }));

import { useCollaborators } from '../useCollaborators';

// Auditoria do painel (/admin/colaboradores): fetchCollaborators era recriada a cada render e a
// página usa useEffect(..., [fetchCollaborators]). Cada busca mudava o estado → novo render →
// nova função → nova busca: a tela ficava buscando sem parar (47 requisições e 429 no limite
// antigo de 50/15min, com o banner "Erro de Sincronização").
function Page() {
  const { collaborators, fetchCollaborators } = useCollaborators();
  useEffect(() => {
    void fetchCollaborators();
  }, [fetchCollaborators]);
  return <p>{`total: ${collaborators.length}`}</p>;
}

describe('useCollaborators — referências estáveis', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: [{ id: 'c1', user: { name: 'Ana' } }, { id: 'c2', user: { name: 'Bia' } }] });
  });

  it('a página busca a lista uma vez só (antes: em loop)', async () => {
    render(<Page />);
    expect(await screen.findByText('total: 2')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 150)); // tempo para um eventual loop aparecer
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
